import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

/**
 * Operator-triggered report generation for a single tenant.
 * Mirrors the cron auto-generate logic but scoped to one tenant and authenticated by operator.
 */
export async function POST(req: NextRequest) {
  await requireOperator();
  const body = await req.json();
  const { tenant_id, report_type } = body;

  if (!tenant_id || !['weekly', 'monthly'].includes(report_type)) {
    return NextResponse.json({ error: 'tenant_id and report_type (weekly|monthly) required' }, { status: 400 });
  }

  const tenant = await queryOne<{ id: string; name: string }>('SELECT id, name FROM tenants WHERE id = $1', [tenant_id]);
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const today = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (report_type === 'weekly') {
    const day = today.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    periodEnd = new Date(today);
    periodEnd.setDate(periodEnd.getDate() - daysFromMonday - 1);
    periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 6);
  } else {
    periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    periodEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  }

  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];

  const existing = await queryOne(
    `SELECT id FROM tenant_reports WHERE tenant_id = $1 AND report_type = $2 AND period_start = $3`,
    [tenant_id, report_type, periodStartStr]
  );
  if (existing) {
    return NextResponse.json({ error: `A ${report_type} report for this period already exists.`, existing_id: (existing as { id: string }).id }, { status: 409 });
  }

  const stats = await queryOne<{
    posts_published: string;
    posts_scheduled: string;
    posts_pending_approval: string;
    posts_drafts: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('posted','partially_posted') AND tenant_approved_at BETWEEN $2 AND $3) as posts_published,
       COUNT(*) FILTER (WHERE status = 'scheduled') as posts_scheduled,
       COUNT(*) FILTER (WHERE status = 'pending_tenant') as posts_pending_approval,
       COUNT(*) FILTER (WHERE status = 'draft') as posts_drafts
     FROM posts WHERE tenant_id = $1`,
    [tenant_id, `${periodStartStr} 00:00:00`, `${periodEndStr} 23:59:59`]
  );

  const platformsRow = await query<{ platform: string }>(
    `SELECT DISTINCT unnest(platforms) AS platform FROM posts
     WHERE tenant_id = $1 AND status IN ('posted','partially_posted')
       AND tenant_approved_at BETWEEN $2 AND $3`,
    [tenant_id, `${periodStartStr} 00:00:00`, `${periodEndStr} 23:59:59`]
  );

  const upcoming = await query<{ scheduled_at: string; copy_primary: string; platforms: string[] }>(
    `SELECT scheduled_at, copy_primary, platforms FROM posts
     WHERE tenant_id = $1 AND status = 'scheduled' AND scheduled_at > now() AND scheduled_at < now() + interval '7 days'
     ORDER BY scheduled_at ASC LIMIT 10`,
    [tenant_id]
  );

  const data = {
    posts_published: parseInt(stats?.posts_published || '0', 10),
    posts_scheduled: parseInt(stats?.posts_scheduled || '0', 10),
    posts_pending_approval: parseInt(stats?.posts_pending_approval || '0', 10),
    posts_drafts: parseInt(stats?.posts_drafts || '0', 10),
    platforms_active: platformsRow.map((r) => r.platform),
    upcoming_posts: upcoming,
    summary: `Manually generated ${report_type} report for ${tenant.name}.`,
  };

  const created = await queryOne<{ id: string }>(
    `INSERT INTO tenant_reports (tenant_id, report_type, period_start, period_end, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tenant_id, report_type, periodStartStr, periodEndStr, JSON.stringify(data)]
  );

  return NextResponse.json({ ok: true, report_id: created?.id, message: `Report generated for ${periodStartStr} – ${periodEndStr}` });
}
