import { queryOne } from '../db';

const GRAPH_API = 'https://graph.facebook.com/v25.0';

interface FacebookCredentials {
  page_id: string;
  page_token: string;
  page_name?: string;
  user_token?: string;
}

async function getCredentials(tenantId: string) {
  const conn = await queryOne<{ credentials: FacebookCredentials }>(
    `SELECT credentials FROM social_connections WHERE tenant_id = $1 AND platform = 'facebook' AND status = 'active'`,
    [tenantId]
  );
  if (!conn) throw new Error('Facebook not connected');
  return { pageId: conn.credentials.page_id, pageToken: conn.credentials.page_token };
}

export async function postToFacebook(
  tenantId: string,
  caption: string,
  imageUrl?: string
): Promise<{ postId: string }> {
  const { pageId, pageToken } = await getCredentials(tenantId);

  if (imageUrl) {
    const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, message: caption, access_token: pageToken }),
    });
    if (!res.ok) throw new Error(`Facebook API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (data.error) throw new Error(`Facebook: ${data.error.message}`);
    const postId = data.id || data.post_id;
    if (!postId) throw new Error('Facebook: No post ID returned from API');
    return { postId };
  }

  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: caption, access_token: pageToken }),
  });
  if (!res.ok) throw new Error(`Facebook API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(`Facebook: ${data.error.message}`);
  return { postId: data.id };
}

export async function postVideoToFacebook(
  tenantId: string,
  caption: string,
  videoUrl: string
): Promise<{ postId: string }> {
  const { pageId, pageToken } = await getCredentials(tenantId);

  const initRes = await fetch(`${GRAPH_API}/${pageId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_phase: 'start',
      file_url: videoUrl,
      access_token: pageToken,
    }),
  });
  if (!initRes.ok) throw new Error(`Facebook video API error: ${initRes.status} ${initRes.statusText}`);
  const initData = await initRes.json();
  if (initData.error) throw new Error(`Facebook video: ${initData.error.message}`);

  return { postId: initData.id };
}
