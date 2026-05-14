import { queryOne } from '../db';

const GRAPH_API = 'https://graph.instagram.com/v25.0';

interface InstagramCredentials {
  ig_user_id?: string;
  ig_account_id?: string; // legacy field from old facebook-linked connections
  access_token: string;
}

async function getCredentials(tenantId: string) {
  const conn = await queryOne<{ credentials: InstagramCredentials }>(
    `SELECT credentials FROM social_connections WHERE tenant_id = $1 AND platform = 'instagram' AND status = 'active'`,
    [tenantId]
  );
  if (!conn) throw new Error('Instagram not connected');
  const igUserId = conn.credentials.ig_user_id || conn.credentials.ig_account_id;
  if (!igUserId) throw new Error('Instagram credentials missing user ID');
  return { igUserId, accessToken: conn.credentials.access_token };
}

export async function postToInstagram(
  tenantId: string,
  caption: string,
  imageUrl: string
): Promise<{ postId: string }> {
  const { igUserId, accessToken } = await getCredentials(tenantId);

  const containerRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
  });
  if (!containerRes.ok) throw new Error(`Instagram API error: ${containerRes.status} ${containerRes.statusText}`);
  const container = await containerRes.json();
  if (container.error) throw new Error(`Instagram container: ${container.error.message}`);

  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`${GRAPH_API}/${container.id}?fields=status_code&access_token=${accessToken}`);
    if (!statusRes.ok) throw new Error(`Instagram status API error: ${statusRes.status}`);
    const status = await statusRes.json();
    if (status.status_code === 'FINISHED' || status.status_code === 'READY') break;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') throw new Error(`Instagram image processing failed: ${status.status_code}`);
    if (i === 9) throw new Error('Instagram image processing timed out');
  }

  const pubRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
  });
  if (!pubRes.ok) throw new Error(`Instagram publish API error: ${pubRes.status} ${pubRes.statusText}`);
  const pub = await pubRes.json();
  if (pub.error) throw new Error(`Instagram publish: ${pub.error.message}`);
  if (!pub.id) throw new Error('Instagram: No post ID returned from API');
  return { postId: pub.id };
}

export async function postReelToInstagram(
  tenantId: string,
  caption: string,
  videoUrl: string
): Promise<{ postId: string }> {
  const { igUserId, accessToken } = await getCredentials(tenantId);

  const containerRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption, access_token: accessToken }),
  });
  if (!containerRes.ok) throw new Error(`Instagram reel API error: ${containerRes.status} ${containerRes.statusText}`);
  const container = await containerRes.json();
  if (container.error) throw new Error(`Instagram reel: ${container.error.message}`);

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(`${GRAPH_API}/${container.id}?fields=status_code&access_token=${accessToken}`);
    if (!statusRes.ok) throw new Error(`Instagram status API error: ${statusRes.status}`);
    const status = await statusRes.json();
    if (status.status_code === 'FINISHED') break;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') throw new Error(`Instagram reel processing failed: ${status.status_code}`);
    if (i === 19) throw new Error('Instagram reel processing timed out');
  }

  const pubRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
  });
  if (!pubRes.ok) throw new Error(`Instagram reel publish API error: ${pubRes.status} ${pubRes.statusText}`);
  const pub = await pubRes.json();
  if (pub.error) throw new Error(`Instagram reel publish: ${pub.error.message}`);
  if (!pub.id) throw new Error('Instagram reel: No post ID returned from API');
  return { postId: pub.id };
}
