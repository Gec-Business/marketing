import { queryOne, query } from '../db';
import type { Platform } from '../types';

const GRAPH_API = 'https://graph.facebook.com/v25.0';

/**
 * Fetch engagement metrics for a published post from the platform's API.
 * Returns likes, comments, shares, reach where available.
 */
export interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  reach?: number;
  impressions?: number;
  saves?: number;
  fetched_at: string;
}

async function getCredentials(tenantId: string, platform: string): Promise<Record<string, any> | null> {
  const conn = await queryOne<{ credentials: any }>(
    `SELECT credentials FROM social_connections WHERE tenant_id = $1 AND platform = $2 AND status = 'active'`,
    [tenantId, platform]
  );
  return conn?.credentials || null;
}

/**
 * Fetch Facebook post engagement.
 */
async function fetchFacebookEngagement(tenantId: string, postId: string): Promise<EngagementMetrics | null> {
  const creds = await getCredentials(tenantId, 'facebook');
  if (!creds?.page_token) return null;

  try {
    const res = await fetch(
      `${GRAPH_API}/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${creds.page_token}`
    );
    if (!res.ok) return null;
    const data = await res.json();

    return {
      likes: data.likes?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0,
      fetched_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error('Facebook engagement fetch error:', e);
    return null;
  }
}

/**
 * Fetch Instagram post engagement.
 */
async function fetchInstagramEngagement(tenantId: string, postId: string): Promise<EngagementMetrics | null> {
  const creds = await getCredentials(tenantId, 'instagram');
  if (!creds?.access_token) return null;

  try {
    const res = await fetch(
      `${GRAPH_API}/${postId}?fields=like_count,comments_count,impressions,reach,saved&access_token=${creds.access_token}`
    );
    if (!res.ok) return null;
    const data = await res.json();

    return {
      likes: data.like_count || 0,
      comments: data.comments_count || 0,
      shares: 0,
      reach: data.reach || undefined,
      impressions: data.impressions || undefined,
      saves: data.saved || undefined,
      fetched_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error('Instagram engagement fetch error:', e);
    return null;
  }
}

/**
 * Fetch engagement for a post across all platforms it was published to.
 * Updates the post's publish_results JSONB with engagement data.
 */
export async function fetchPostEngagement(postId: string): Promise<Record<string, EngagementMetrics | null>> {
  const post = await queryOne<{
    id: string;
    tenant_id: string;
    platforms: string[];
    publish_results: Record<string, any>;
    status: string;
  }>('SELECT id, tenant_id, platforms, publish_results, status FROM posts WHERE id = $1', [postId]);

  if (!post || !['posted', 'partially_posted'].includes(post.status)) {
    return {};
  }

  const results: Record<string, EngagementMetrics | null> = {};
  const publishResults = post.publish_results || {};

  for (const platform of post.platforms) {
    const platformResult = publishResults[platform];
    if (!platformResult?.success || !platformResult?.postId) continue;

    let metrics: EngagementMetrics | null = null;

    switch (platform) {
      case 'facebook':
        metrics = await fetchFacebookEngagement(post.tenant_id, platformResult.postId);
        break;
      case 'instagram':
        metrics = await fetchInstagramEngagement(post.tenant_id, platformResult.postId);
        break;
      // LinkedIn and TikTok engagement APIs require different auth flows
      // Placeholder for future implementation
      case 'linkedin':
      case 'tiktok':
        metrics = null;
        break;
    }

    if (metrics) {
      results[platform] = metrics;
      // Merge engagement into publish_results
      publishResults[platform] = { ...platformResult, engagement: metrics };
    }
  }

  // Save updated publish_results with engagement data
  if (Object.keys(results).length > 0) {
    await query(
      'UPDATE posts SET publish_results = $1 WHERE id = $2',
      [JSON.stringify(publishResults), postId]
    );
  }

  return results;
}

/**
 * Batch fetch engagement for all recently published posts.
 * Called by cron every 4 hours.
 */
export async function fetchAllEngagement(): Promise<{ checked: number; updated: number; errors: number }> {
  // Fetch posts published in the last 7 days
  const posts = await query<{ id: string }>(
    `SELECT id FROM posts
     WHERE status IN ('posted', 'partially_posted')
       AND created_at > now() - interval '7 days'
     ORDER BY created_at DESC
     LIMIT 100`
  );

  let updated = 0;
  let errors = 0;

  for (const post of posts) {
    try {
      const results = await fetchPostEngagement(post.id);
      if (Object.keys(results).length > 0) updated++;
    } catch (e) {
      errors++;
      console.error(`Engagement fetch error for post ${post.id}:`, e);
    }
  }

  return { checked: posts.length, updated, errors };
}
