import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/system-health';
import { fetchAllEngagement } from '@/lib/publishers/engagement';

/**
 * Cron endpoint: fetch engagement metrics (likes, comments, shares) for
 * recently published posts from social media APIs.
 * Runs every 4 hours.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await fetchAllEngagement();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Engagement sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
