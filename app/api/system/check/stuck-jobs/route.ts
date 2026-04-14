import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';

/**
 * Watchdog: stuck assessments and stuck publishing posts.
 * Self-healing: marks them as failed automatically.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Stuck assessments (>45 min in active status)
  const stuckAssessments = await query<{ id: string; tenant_id: string; status: string }>(
    `SELECT id, tenant_id, status FROM assessments
     WHERE status IN ('pending','researching','analyzing','generating')
       AND started_at < now() - interval '45 minutes'`
  );

  for (const a of stuckAssessments) {
    // Record health FIRST so the alert exists even if the state update fails
    await recordHealth({
      check_name: 'stuck_assessment',
      severity: 'error',
      status: 'fail',
      message: `Assessment ${a.id} was stuck in '${a.status}' for >45 min — auto-marked as failed`,
      affected_resource: `assessment:${a.id}`,
      details: { tenant_id: a.tenant_id, original_status: a.status },
    });
    await query(
      `UPDATE assessments SET status = 'failed', error_message = 'Pipeline timeout — auto-recovered after 45 min stuck'
       WHERE id = $1`,
      [a.id]
    );
  }

  // 2. Stuck publishing posts (>15 min)
  const stuckPosts = await query<{ id: string; tenant_id: string }>(
    `SELECT id, tenant_id FROM posts
     WHERE status = 'publishing'
       AND created_at < now() - interval '15 minutes'`
  );

  for (const p of stuckPosts) {
    await recordHealth({
      check_name: 'stuck_publish',
      severity: 'error',
      status: 'fail',
      message: `Post ${p.id} was stuck in 'publishing' for >15 min — auto-marked as failed`,
      affected_resource: `post:${p.id}`,
      details: { tenant_id: p.tenant_id },
    });
    await query(
      `UPDATE posts SET status = 'failed', publish_results = jsonb_set(COALESCE(publish_results,'{}'::jsonb), '{auto_recovery}', '"Stuck in publishing >15 min — auto-marked as failed"'::jsonb)
       WHERE id = $1`,
      [p.id]
    );
  }

  return NextResponse.json({
    stuck_assessments: stuckAssessments.length,
    stuck_posts: stuckPosts.length,
  });
}
