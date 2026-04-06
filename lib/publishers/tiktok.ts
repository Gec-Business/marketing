import { queryOne } from '../db';

async function getCredentials(tenantId: string) {
  const conn = await queryOne(
    `SELECT credentials FROM social_connections WHERE tenant_id = $1 AND platform = 'tiktok' AND status = 'active'`,
    [tenantId]
  );
  if (!conn) throw new Error('TikTok not connected');
  const creds = (conn as any).credentials;
  return { accessToken: creds.access_token, openId: creds.open_id };
}

export async function postVideoToTikTok(
  tenantId: string,
  caption: string,
  videoUrl: string
): Promise<{ postId: string }> {
  const { accessToken, openId } = await getCredentials(tenantId);

  // Initialize video upload
  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    }),
  });

  const initData = await initRes.json();
  if (initData.error?.code) {
    throw new Error(`TikTok: ${initData.error.message || initData.error.code}`);
  }

  const publishId = initData.data?.publish_id;
  if (!publishId) throw new Error('TikTok: No publish_id returned');

  // Poll for status
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    if (status === 'PUBLISH_COMPLETE') {
      return { postId: publishId };
    }
    if (status === 'FAILED') {
      throw new Error(`TikTok publish failed: ${statusData.data?.fail_reason || 'unknown'}`);
    }
  }

  return { postId: publishId };
}

export async function postPhotoToTikTok(
  tenantId: string,
  caption: string,
  imageUrls: string[]
): Promise<{ postId: string }> {
  const { accessToken } = await getCredentials(tenantId);

  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_cover_index: 0,
        photo_images: imageUrls,
      },
      media_type: 'PHOTO',
    }),
  });

  const initData = await initRes.json();
  if (initData.error?.code) {
    throw new Error(`TikTok photo: ${initData.error.message || initData.error.code}`);
  }

  return { postId: initData.data?.publish_id || 'unknown' };
}
