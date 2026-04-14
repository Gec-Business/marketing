import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendAlertEmail } from '@/lib/email';
import { verifyCronSecret } from '@/lib/system-health';

/**
 * Daily digest email: summarizes all alerts from the last 24 hours.
 * Sent to ALERT_EMAIL recipient.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alerts = await query<{
    id: string;
    check_name: string;
    severity: string;
    message: string;
    affected_resource: string | null;
    created_at: string;
    resolved: boolean;
  }>(
    `SELECT id, check_name, severity, message, affected_resource, created_at, resolved
     FROM system_health
     WHERE created_at > now() - interval '24 hours'
     ORDER BY
       CASE severity
         WHEN 'critical' THEN 1
         WHEN 'error' THEN 2
         WHEN 'warning' THEN 3
         WHEN 'info' THEN 4
       END,
       created_at DESC`
  );

  const counts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    error: alerts.filter((a) => a.severity === 'error').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info' && !a.resolved).length,
  };

  const totalIssues = counts.critical + counts.error + counts.warning;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 640px; margin: 0 auto;">
      <h1 style="color: #1f2937;">MK Platform Daily Digest</h1>
      <p style="color: #6b7280;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      ${totalIssues === 0 ? `
        <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#065f46;font-weight:600;">All systems healthy — no issues in the last 24h.</p>
        </div>
      ` : `
        <div style="display:flex;gap:8px;margin:20px 0;">
          ${counts.critical > 0 ? `<span style="background:#fee2e2;color:#991b1b;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:600;">${counts.critical} CRITICAL</span>` : ''}
          ${counts.error > 0 ? `<span style="background:#ffedd5;color:#9a3412;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:600;">${counts.error} ERROR</span>` : ''}
          ${counts.warning > 0 ? `<span style="background:#fef3c7;color:#92400e;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:600;">${counts.warning} WARNING</span>` : ''}
        </div>

        <h2 style="color:#1f2937;font-size:18px;margin-top:24px;">Issues</h2>
        <table style="width:100%;border-collapse:collapse;">
          ${alerts.filter((a) => a.severity !== 'info').slice(0, 30).map((a) => `
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:10px 8px;vertical-align:top;width:80px;">
                <span style="background:${a.severity === 'critical' ? '#fee2e2' : a.severity === 'error' ? '#ffedd5' : '#fef3c7'};color:${a.severity === 'critical' ? '#991b1b' : a.severity === 'error' ? '#9a3412' : '#92400e'};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">${a.severity.toUpperCase()}</span>
              </td>
              <td style="padding:10px 8px;vertical-align:top;">
                <p style="margin:0;font-weight:500;color:#1f2937;font-size:14px;">${escapeHtml(a.check_name)}</p>
                <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">${escapeHtml(a.message)}</p>
                ${a.affected_resource ? `<p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">${escapeHtml(a.affected_resource)}</p>` : ''}
              </td>
              <td style="padding:10px 8px;vertical-align:top;text-align:right;color:#9ca3af;font-size:12px;">
                ${a.resolved ? '✓ resolved' : 'open'}
              </td>
            </tr>
          `).join('')}
        </table>
      `}

      <p style="margin-top:32px;color:#6b7280;font-size:13px;">
        <a href="https://mk.gecbusiness.com/operator" style="color:#2563eb;">Open dashboard</a> to manage alerts.
      </p>
    </div>
  `;

  const result = await sendAlertEmail(`Daily Digest — ${totalIssues} issue${totalIssues === 1 ? '' : 's'}`, html);

  return NextResponse.json({
    sent: result.ok,
    error: result.error,
    counts,
    total_alerts: alerts.length,
  });
}

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
