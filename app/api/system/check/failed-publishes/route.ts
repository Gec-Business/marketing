import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';

/**
 * Watchdog: posts that failed or partially failed publishing in the last 24h.
 * Surfaces them for Tea's attention.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const failed = await query<{ id: string; tenant_id: string; status: string; publish_results: any }>(
    `SELECT id, tenant_id, status, publish_results FROM posts
     WHERE status IN ('failed','partially_posted')
       AND created_at > now() - interval '24 hours'`
  );

  for (const post of failed) {
    const errors = Object.entries(post.publish_results || {})
      .filter(([, r]: [string, any]) => !r.success)
      .map(([platform, r]: [string, any]) => `${platform}: ${r.error || 'unknown'}`)
      .join('; ');

    await recordHealth({
      check_name: 'failed_publish',
      severity: post.status === 'failed' ? 'error' : 'warning',
      status: post.status === 'failed' ? 'fail' : 'warn',
      message: post.status === 'failed'
        ? `Post failed to publish on all platforms`
        : `Post partially published — some platforms failed`,
      affected_resource: `post:${post.id}`,
      details: { tenant_id: post.tenant_id, errors },
    });
  }

  return NextResponse.json({ checked: failed.length });
}
