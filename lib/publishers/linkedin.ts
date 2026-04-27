import { queryOne } from '../db';

const LI_API = 'https://api.linkedin.com';
const LI_VERSION = '202602';

interface LinkedInCredentials {
  access_token: string;
  refresh_token?: string;
  org_id: string;
}

async function getCredentials(tenantId: string) {
  const conn = await queryOne<{ credentials: LinkedInCredentials }>(
    `SELECT credentials FROM social_connections WHERE tenant_id = $1 AND platform = 'linkedin' AND status = 'active'`,
    [tenantId]
  );
  if (!conn) throw new Error('LinkedIn not connected');
  return { accessToken: conn.credentials.access_token, orgId: conn.credentials.org_id };
}

export async function postToLinkedIn(
  tenantId: string,
  caption: string,
  imageUrl?: string
): Promise<{ postId: string }> {
  const { accessToken, orgId } = await getCredentials(tenantId);
  const author = `urn:li:organization:${orgId}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': LI_VERSION,
  };

  let imageUrn: string | null = null;

  if (imageUrl) {
    // Initialize image upload
    const initRes = await fetch(`${LI_API}/rest/images?action=initializeUpload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    });
    if (!initRes.ok) throw new Error(`LinkedIn image init error: ${initRes.status} ${initRes.statusText}`);
    const initData = await initRes.json();
    const uploadUrl = initData.value?.uploadUrl;
    imageUrn = initData.value?.image;

    if (uploadUrl && imageUrn) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
      const imgBuffer = await imgRes.arrayBuffer();
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: imgBuffer,
      });
      if (!uploadRes.ok) throw new Error(`LinkedIn image upload error: ${uploadRes.status}`);
    }
  }

  const postBody: Record<string, unknown> = {
    author,
    commentary: caption,
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED' },
    lifecycleState: 'PUBLISHED',
  };

  if (imageUrn) {
    postBody.content = {
      media: { title: 'Post image', id: imageUrn },
    };
  }

  const postRes = await fetch(`${LI_API}/rest/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(postBody),
  });

  const postId = postRes.headers.get('x-restli-id') || 'unknown';
  if (!postRes.ok) {
    const err = await postRes.json().catch(() => ({}));
    throw new Error(`LinkedIn API error: ${postRes.status} ${(err as any).message || postRes.statusText}`);
  }

  return { postId };
}
