import { query, queryOne } from '../db';
import { postToFacebook, postVideoToFacebook } from './facebook';
import { postToInstagram, postReelToInstagram } from './instagram';
import { postToLinkedIn } from './linkedin';
import { postVideoToTikTok, postPhotoToTikTok } from './tiktok';
import type { Post, Platform } from '../types';

interface PublishResult {
  platform: Platform;
  success: boolean;
  postId?: string;
  error?: string;
}

function buildCaption(post: any, platform: Platform): string {
  const platformCopy = post.platform_copies?.[platform];
  const primary = platformCopy?.primary || post.copy_primary || '';
  const secondary = platformCopy?.secondary || post.copy_secondary || '';
  const hashtags = (post.hashtags || []).join(' ');

  let caption = primary;
  if (secondary) caption += `\n\n---\n\n${secondary}`;
  if (hashtags) caption += `\n\n${hashtags}`;

  return caption;
}

function getMediaUrl(post: any, baseUrl: string): string | null {
  if (post.generated_image_url) return `${baseUrl}${post.generated_image_url}`;
  if (post.media_urls?.length > 0) {
    const url = post.media_urls[0];
    return url.startsWith('http') ? url : `${baseUrl}${url}`;
  }
  return null;
}

function isTransientError(error: any): boolean {
  const msg = error?.message?.toLowerCase() || '';
  // Check for explicit HTTP status codes in the error message (publishers throw with status)
  if (/\b(408|429|500|502|503|504)\b/.test(msg)) return true;
  // Network-level errors
  if (msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('enetunreach')) return true;
  if (msg.includes('fetch failed') || msg.includes('socket hang up')) return true;
  return false;
}

async function publishToPlatform(post: any, platform: Platform, baseUrl: string): Promise<PublishResult> {
  const caption = buildCaption(post, platform);
  const mediaUrl = getMediaUrl(post, baseUrl);
  const isVideo = ['reel', 'video'].includes(post.content_type);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
    let result: { postId: string };

    switch (platform) {
      case 'facebook':
        if (isVideo && mediaUrl) {
          result = await postVideoToFacebook(post.tenant_id, caption, mediaUrl);
        } else {
          result = await postToFacebook(post.tenant_id, caption, mediaUrl || undefined);
        }
        break;

      case 'instagram':
        if (isVideo && mediaUrl) {
          result = await postReelToInstagram(post.tenant_id, caption, mediaUrl);
        } else if (mediaUrl) {
          result = await postToInstagram(post.tenant_id, caption, mediaUrl);
        } else {
          throw new Error('Instagram requires an image or video');
        }
        break;

      case 'linkedin':
        result = await postToLinkedIn(post.tenant_id, caption, mediaUrl || undefined);
        break;

      case 'tiktok':
        if (isVideo && mediaUrl) {
          result = await postVideoToTikTok(post.tenant_id, caption, mediaUrl);
        } else if (mediaUrl) {
          result = await postPhotoToTikTok(post.tenant_id, caption, [mediaUrl]);
        } else {
          throw new Error('TikTok requires a video or image');
        }
        break;

      default:
        throw new Error(`Unknown platform: ${platform}`);
    }

      return { platform, success: true, postId: result.postId };
    } catch (error: any) {
      if (attempt === 0 && isTransientError(error)) {
        console.warn(`Retrying ${platform} publish after transient error:`, error.message);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      return { platform, success: false, error: error.message };
    }
  }
  // Unreachable, but TypeScript needs a return statement
  return { platform, success: false, error: 'Unreachable' };
}

async function checkTokenExpiry(tenantId: string, platform: Platform): Promise<void> {
  const conn = await queryOne(
    `SELECT expires_at, credentials FROM social_connections WHERE tenant_id = $1 AND platform = $2 AND status = 'active'`,
    [tenantId, platform]
  );
  if (!conn) return;
  const c = conn as any;
  if (!c.expires_at) return;

  const expiresAt = new Date(c.expires_at);
  const now = new Date();
  const hourBeforeExpiry = new Date(expiresAt.getTime() - 60 * 60 * 1000);

  if (now > hourBeforeExpiry) {
    const creds = c.credentials;
    if (platform === 'linkedin' && creds.refresh_token) {
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: creds.refresh_token,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      });
      if (!tokenRes.ok) {
        const errBody = await tokenRes.text().catch(() => '');
        await query(
          `UPDATE social_connections SET status = 'expired' WHERE tenant_id = $1 AND platform = 'linkedin'`,
          [tenantId]
        );
        throw new Error(`LinkedIn token refresh failed (${tokenRes.status}): ${errBody.slice(0, 200)}. Please reconnect.`);
      }
      const data = await tokenRes.json();
      creds.access_token = data.access_token;
      if (data.refresh_token) creds.refresh_token = data.refresh_token;
      const newExpiry = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null;
      await query(
        `UPDATE social_connections SET credentials = $1, expires_at = $2 WHERE tenant_id = $3 AND platform = 'linkedin'`,
        [JSON.stringify(creds), newExpiry, tenantId]
      );
    } else if (platform === 'tiktok' && creds.refresh_token) {
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY!,
          client_secret: process.env.TIKTOK_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: creds.refresh_token,
        }),
      });
      if (!tokenRes.ok) {
        const errBody = await tokenRes.text().catch(() => '');
        await query(
          `UPDATE social_connections SET status = 'expired' WHERE tenant_id = $1 AND platform = 'tiktok'`,
          [tenantId]
        );
        throw new Error(`TikTok token refresh failed (${tokenRes.status}): ${errBody.slice(0, 200)}. Please reconnect.`);
      }
      const data = await tokenRes.json();
      creds.access_token = data.access_token;
      if (data.refresh_token) {
        creds.refresh_token = data.refresh_token;
        creds.refresh_token_expires_at = data.refresh_expires_in
          ? new Date(Date.now() + data.refresh_expires_in * 1000).toISOString()
          : creds.refresh_token_expires_at;
      }
      if (data.open_id) creds.open_id = data.open_id;
      const newExpiry = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null;
      await query(
        `UPDATE social_connections SET credentials = $1, expires_at = $2 WHERE tenant_id = $3 AND platform = 'tiktok'`,
        [JSON.stringify(creds), newExpiry, tenantId]
      );
    }
  }
}

export async function publishPost(postId: string): Promise<PublishResult[]> {
  const post = await queryOne('SELECT * FROM posts WHERE id = $1', [postId]);
  if (!post) throw new Error('Post not found');

  const p = post as any;
  const baseUrl = process.env.APP_URL;
  if (!baseUrl) throw new Error('APP_URL environment variable is not set');
  const results: PublishResult[] = [];

  await queryOne(`UPDATE posts SET status = 'publishing' WHERE id = $1 RETURNING *`, [postId]);

  for (const platform of (p.platforms as Platform[])) {
    try {
      await checkTokenExpiry(p.tenant_id, platform);
    } catch (refreshError: any) {
      results.push({ platform, success: false, error: refreshError.message });
      continue;
    }
    const result = await publishToPlatform(p, platform, baseUrl);
    results.push(result);
  }

  const allSuccess = results.every(r => r.success);
  const someSuccess = results.some(r => r.success);
  const publishResults = Object.fromEntries(results.map(r => [r.platform, { success: r.success, postId: r.postId, error: r.error }]));

  const finalStatus = allSuccess ? 'posted' : someSuccess ? 'partially_posted' : 'failed';
  await queryOne(
    `UPDATE posts SET status = $1, publish_results = $2 WHERE id = $3 RETURNING *`,
    [finalStatus, JSON.stringify(publishResults), postId]
  );

  return results;
}

export async function runAutoPublish(): Promise<{ published: number; failed: number; skipped: number }> {
  const posts = await query(
    `SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at <= now() ORDER BY scheduled_at ASC`
  );

  let published = 0, failed = 0, skipped = 0;

  for (const post of posts) {
    const p = post as any;

    // Check that tenant has active social connections for the platforms
    const connections = await query(
      `SELECT platform FROM social_connections WHERE tenant_id = $1 AND status = 'active'`,
      [p.tenant_id]
    );
    const connectedPlatforms = connections.map((c: any) => c.platform);
    const canPublish = (p.platforms as string[]).some(pl => connectedPlatforms.includes(pl));

    if (!canPublish) {
      skipped++;
      continue;
    }

    try {
      const results = await publishPost(p.id);
      if (results.every(r => r.success)) {
        published++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
      console.error(`Failed to publish post ${p.id}:`, e);
    }
  }

  return { published, failed, skipped };
}
