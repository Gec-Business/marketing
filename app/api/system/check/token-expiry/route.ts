import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';

/**
 * Watchdog: social_connections expiring within 7 days.
 * Auto-marks already-expired connections as 'expired' status.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Already expired → mark as expired
  const justExpired = await query<{ id: string; tenant_id: string; platform: string }>(
    `UPDATE social_connections SET status = 'expired'
     WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < now()
     RETURNING id, tenant_id, platform`
  );

  for (const c of justExpired) {
    await recordHealth({
      check_name: 'token_expired',
      severity: 'error',
      status: 'fail',
      message: `${c.platform} token expired for tenant — reconnect required`,
      affected_resource: `connection:${c.id}`,
      details: { tenant_id: c.tenant_id, platform: c.platform },
    });
  }

  // Expiring within 7 days → warning
  const expiringSoon = await query<{ id: string; tenant_id: string; platform: string; expires_at: string }>(
    `SELECT id, tenant_id, platform, expires_at FROM social_connections
     WHERE status = 'active' AND expires_at BETWEEN now() AND now() + interval '7 days'`
  );

  for (const c of expiringSoon) {
    await recordHealth({
      check_name: 'token_expiring_soon',
      severity: 'warning',
      status: 'warn',
      message: `${c.platform} token expires on ${c.expires_at.split('T')[0]}`,
      affected_resource: `connection:${c.id}`,
      details: { tenant_id: c.tenant_id, platform: c.platform, expires_at: c.expires_at },
    });
  }

  return NextResponse.json({ expired: justExpired.length, expiring_soon: expiringSoon.length });
}
