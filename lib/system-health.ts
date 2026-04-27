import { query, queryOne } from './db';
import { sendAlertEmail } from './email';
import crypto from 'crypto';

export type Severity = 'info' | 'warning' | 'error' | 'critical';
export type CheckStatus = 'ok' | 'warn' | 'fail';

export interface HealthRecord {
  check_name: string;
  severity: Severity;
  status: CheckStatus;
  message: string;
  details?: Record<string, unknown>;
  affected_resource?: string;
}

/**
 * Verify the cron secret on system check endpoints.
 * Returns true if authorized.
 */
export function verifyCronSecret(headerSecret: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!headerSecret || !expected || headerSecret.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(headerSecret), Buffer.from(expected));
}

/**
 * Record a health check result.
 *
 * Behavior:
 * - status='ok': resolves any matching unresolved alert. Does NOT insert OK rows
 *   (prevents table bloat from periodic checks).
 * - status='warn'/'fail': uses atomic UPSERT via the unique partial index
 *   `idx_system_health_unique_active` (migration 008) to prevent dedup races.
 *   Email alerts are sent only on FIRST insert per (check_name, affected_resource).
 */
export async function recordHealth(record: HealthRecord): Promise<void> {
  const resourceKey = record.affected_resource || '';

  // status='ok' → just resolve any open alert with the same key
  if (record.status === 'ok') {
    await query(
      `UPDATE system_health
       SET resolved = true, resolved_at = now()
       WHERE check_name = $1
         AND affected_resource = $2
         AND resolved = false`,
      [record.check_name, resourceKey]
    );
    return;
  }

  // status='warn'/'fail' → atomic UPSERT
  // The unique partial index `idx_system_health_unique_active` enforces one
  // active row per (check_name, affected_resource). ON CONFLICT updates the
  // existing row instead of creating a duplicate.
  const result = await queryOne<{ id: string; was_inserted: boolean }>(
    `INSERT INTO system_health (check_name, severity, status, message, details, affected_resource)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (check_name, affected_resource) WHERE resolved = false
     DO UPDATE SET
       severity = EXCLUDED.severity,
       status = EXCLUDED.status,
       message = EXCLUDED.message,
       details = EXCLUDED.details,
       created_at = now()
     RETURNING id, (xmax = 0) AS was_inserted`,
    [
      record.check_name,
      record.severity,
      record.status,
      record.message,
      JSON.stringify(record.details || {}),
      resourceKey,
    ]
  );

  // Email only on first insert (was_inserted=true) for high severity
  if (result?.was_inserted && (record.severity === 'error' || record.severity === 'critical')) {
    const html = `
      <h2 style="color: ${record.severity === 'critical' ? '#dc2626' : '#ea580c'}">${record.severity.toUpperCase()}: ${escapeHtml(record.check_name)}</h2>
      <p><strong>Message:</strong> ${escapeHtml(record.message)}</p>
      ${record.affected_resource ? `<p><strong>Resource:</strong> ${escapeHtml(record.affected_resource)}</p>` : ''}
      <pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:12px;overflow:auto">${escapeHtml(JSON.stringify(record.details || {}, null, 2))}</pre>
      <p><a href="${process.env.APP_URL ?? 'https://mk.gecbusiness.com'}/operator">Open dashboard</a></p>
    `;
    await sendAlertEmail(`${record.severity.toUpperCase()}: ${record.check_name}`, html);
    await query(`UPDATE system_health SET notified_at = now() WHERE id = $1`, [result.id]);
  }
}

/**
 * Mark all alerts for a specific check as resolved.
 * Uses the same COALESCE matching as recordHealth for consistency.
 */
export async function resolveCheck(checkName: string, affectedResource?: string): Promise<void> {
  const resourceKey = affectedResource || '';
  await query(
    `UPDATE system_health
     SET resolved = true, resolved_at = now()
     WHERE check_name = $1
       AND affected_resource = $2
       AND resolved = false`,
    [checkName, resourceKey]
  );
}

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
