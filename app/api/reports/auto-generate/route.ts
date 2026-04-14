import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import crypto from 'crypto';

/**
 * Auto-generate weekly reports for all tenants with auto_reports enabled.
 *
 * Triggered by cron weekly (Mondays at 9am). For each active tenant:
 *   - Skip if report for this period already exists
 *   - Compute period: previous Monday → previous Sunday
 *   - Aggregate posts published, scheduled, pending, drafts
 *   - List upcoming posts for next week
 *   - Insert tenant_reports row (UNIQUE constraint prevents duplicates)
 *
 * Tenants see reports in their portal at /portal/reports.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;
  if (!secret || !expected || secret.length !== expected.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const reportType: 'weekly' | 'monthly' = body.report_type === 'monthly' ? 'monthly' : 'weekly';

  const today = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (reportType === 'weekly') {
    // Previous Monday → previous Sunday
    const day = today.getDay(); // 0 = Sunday
    const daysFromMonday = day === 0 ? 6 : day - 1;
    periodEnd = new Date(today);
    periodEnd.setDate(periodEnd.getDate() - daysFromMonday - 1); // last Sunday
    periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 6); // previous Monday
  } else {
    // Previous calendar month
    periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    periodEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  }

  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];

  const tenants = await query<{ id: string; name: string }>(
    `SELECT id, name FROM tenants WHERE auto_reports = true AND status IN ('active','strategy_review')`
  );

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const tenant of tenants) {
    try {
      // Check if report already exists (UNIQUE constraint will block duplicates anyway)
      const existing = await queryOne(
        `SELECT id FROM tenant_reports WHERE tenant_id = $1 AND report_type = $2 AND period_start = $3`,
        [tenant.id, reportType, periodStartStr]
      );
      if (existing) {
        skipped++;
        continue;
      }

      // Aggregate post stats for this tenant in the period
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
        [tenant.id, `${periodStartStr} 00:00:00`, `${periodEndStr} 23:59:59`]
      );

      // Active platforms = distinct platforms across published posts in the period
      const platformsRow = await query<{ platform: string }>(
        `SELECT DISTINCT unnest(platforms) AS platform FROM posts
         WHERE tenant_id = $1 AND status IN ('posted','partially_posted')
           AND tenant_approved_at BETWEEN $2 AND $3`,
        [tenant.id, `${periodStartStr} 00:00:00`, `${periodEndStr} 23:59:59`]
      );

      // Upcoming posts in next 7 days
      const upcoming = await query<{ scheduled_at: string; copy_primary: string; platforms: string[] }>(
        `SELECT scheduled_at, copy_primary, platforms FROM posts
         WHERE tenant_id = $1 AND status = 'scheduled' AND scheduled_at > now() AND scheduled_at < now() + interval '7 days'
         ORDER BY scheduled_at ASC LIMIT 10`,
        [tenant.id]
      );

      const data = {
        posts_published: parseInt(stats?.posts_published || '0', 10),
        posts_scheduled: parseInt(stats?.posts_scheduled || '0', 10),
        posts_pending_approval: parseInt(stats?.posts_pending_approval || '0', 10),
        posts_drafts: parseInt(stats?.posts_drafts || '0', 10),
        platforms_active: platformsRow.map((r) => r.platform),
        upcoming_posts: upcoming,
        summary: `${stats?.posts_published || 0} posts published this ${reportType === 'weekly' ? 'week' : 'month'}.`,
      };

      await queryOne(
        `INSERT INTO tenant_reports (tenant_id, report_type, period_start, period_end, data)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tenant.id, reportType, periodStartStr, periodEndStr, JSON.stringify(data)]
      );
      generated++;
    } catch (e) {
      console.error(`Auto-report error for tenant ${tenant.id}:`, e);
      errors++;
    }
  }

  return NextResponse.json({
    report_type: reportType,
    period: { start: periodStartStr, end: periodEndStr },
    checked: tenants.length,
    generated,
    skipped,
    errors,
  });
}
