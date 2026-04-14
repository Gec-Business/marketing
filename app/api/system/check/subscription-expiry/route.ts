import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';

/**
 * Watchdog: tenant subscriptions expiring within 30 days.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expiring = await query<{
    id: string;
    name: string;
    billing_start_date: string;
    billing_duration_months: number;
    days_until_expiry: number;
  }>(
    `SELECT id, name, billing_start_date, billing_duration_months,
       EXTRACT(DAY FROM (billing_start_date::timestamp + (billing_duration_months || ' months')::interval - now()))::int AS days_until_expiry
     FROM tenants
     WHERE status = 'active'
       AND billing_start_date IS NOT NULL
       AND billing_duration_months IS NOT NULL
       AND (billing_start_date::timestamp + (billing_duration_months || ' months')::interval) BETWEEN now() AND now() + interval '30 days'`
  );

  for (const t of expiring) {
    await recordHealth({
      check_name: 'subscription_expiring',
      severity: t.days_until_expiry < 7 ? 'error' : 'warning',
      status: 'warn',
      message: `${t.name} subscription expires in ${t.days_until_expiry} days`,
      affected_resource: `tenant:${t.id}`,
      details: { tenant_name: t.name, days_until_expiry: t.days_until_expiry },
    });
  }

  return NextResponse.json({ expiring: expiring.length });
}
