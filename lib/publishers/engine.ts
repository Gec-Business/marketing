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

async function publishToPlatform(post: any, platform: Platform, baseUrl: string): Promise<PublishResult> {
  const caption = buildCaption(post, platform);
  const mediaUrl = getMediaUrl(post, baseUrl);
  const isVideo = ['reel', 'video'].includes(post.content_type);

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
    return { platform, success: false, error: error.message };
  }
}

export async function publishPost(postId: string): Promise<PublishResult[]> {
  const post = await queryOne('SELECT * FROM posts WHERE id = $1', [postId]);
  if (!post) throw new Error('Post not found');

  const p = post as any;
  const baseUrl = process.env.APP_URL || 'https://mk.gecbusiness.com';
  const results: PublishResult[] = [];

  await queryOne(`UPDATE posts SET status = 'publishing' WHERE id = $1 RETURNING *`, [postId]);

  for (const platform of (p.platforms as Platform[])) {
    const result = await publishToPlatform(p, platform, baseUrl);
    results.push(result);
  }

  const allSuccess = results.every(r => r.success);
  const publishResults = Object.fromEntries(results.map(r => [r.platform, { success: r.success, postId: r.postId, error: r.error }]));

  await queryOne(
    `UPDATE posts SET status = $1, publish_results = $2 WHERE id = $3 RETURNING *`,
    [allSuccess ? 'posted' : 'failed', JSON.stringify(publishResults), postId]
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
