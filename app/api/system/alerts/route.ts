import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * Returns active (unresolved) system_health alerts.
 * Used by operator dashboard widget and TopBar badge.
 */
export async function GET() {
  await requireOperator();

  const alerts = await query(
    `SELECT id, check_name, severity, status, message, details, affected_resource, created_at
     FROM system_health
     WHERE resolved = false
     ORDER BY
       CASE severity
         WHEN 'critical' THEN 1
         WHEN 'error' THEN 2
         WHEN 'warning' THEN 3
         WHEN 'info' THEN 4
       END,
       created_at DESC
     LIMIT 100`
  );

  const counts = await query<{ severity: string; count: string }>(
    `SELECT severity, COUNT(*) as count FROM system_health WHERE resolved = false GROUP BY severity`
  );
  const countMap: Record<string, number> = { critical: 0, error: 0, warning: 0, info: 0 };
  for (const c of counts) countMap[c.severity] = parseInt(c.count, 10);

  return NextResponse.json({ alerts, counts: countMap });
}

/**
 * Manually resolve an alert.
 */
export async function PATCH(req: NextRequest) {
  await requireOperator();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await query(`UPDATE system_health SET resolved = true, resolved_at = now() WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
