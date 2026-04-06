import { queryOne } from '../db';

const LI_API = 'https://api.linkedin.com';
const LI_VERSION = '202602';

async function getCredentials(tenantId: string) {
  const conn = await queryOne(
    `SELECT credentials FROM social_connections WHERE tenant_id = $1 AND platform = 'linkedin' AND status = 'active'`,
    [tenantId]
  );
  if (!conn) throw new Error('LinkedIn not connected');
  const creds = (conn as any).credentials;
  return { accessToken: creds.access_token, orgId: creds.org_id };
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
    const initData = await initRes.json();
    const uploadUrl = initData.value?.uploadUrl;
    imageUrn = initData.value?.image;

    if (uploadUrl && imageUrn) {
      const imgRes = await fetch(imageUrl);
      const imgBuffer = await imgRes.arrayBuffer();
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: imgBuffer,
      });
    }
  }

  const postBody: any = {
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
    throw new Error(`LinkedIn: ${(err as any).message || postRes.statusText}`);
  }

  return { postId };
}
