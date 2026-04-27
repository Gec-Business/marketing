import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  await requireOperator();
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const savedState = req.cookies.get('fb_oauth_state')?.value;

  if (!code || !state || state !== savedState) {
    return new NextResponse('<html><body><h2>Authorization failed</h2><p>Invalid state. Please try again.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  const tenantId = state.split(':')[0];
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = `${process.env.APP_URL}/api/connect/facebook/callback`;

  // Exchange code for token — POST keeps client_secret out of server logs
  const tokenRes = await fetch('https://graph.facebook.com/v25.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: appId!, redirect_uri: redirectUri, client_secret: appSecret!, code }),
  });
  if (!tokenRes.ok) {
    return new NextResponse(`<html><body><h2>Error</h2><p>Facebook API returned ${tokenRes.status}</p></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }
  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    return new NextResponse(`<html><body><h2>Error</h2><p>${tokenData.error.message}</p></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }

  const userToken = tokenData.access_token;

  // Get pages
  const pagesRes = await fetch(`https://graph.facebook.com/v25.0/me/accounts?access_token=${userToken}`);
  const pagesData = await pagesRes.json();

  if (!pagesData.data?.length) {
    return new NextResponse('<html><body><h2>No pages found</h2><p>The account has no Facebook Pages.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  const page = pagesData.data[0]; // Use first page

  // Get Instagram business account
  const igRes = await fetch(`https://graph.facebook.com/v25.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
  const igData = await igRes.json();

  // Save Facebook connection (page tokens from long-lived user tokens don't expire, but track it anyway)
  const fbExpiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  await queryOne(
    `INSERT INTO social_connections (tenant_id, platform, credentials, expires_at)
     VALUES ($1, 'facebook', $2, $3)
     ON CONFLICT (tenant_id, platform) DO UPDATE SET credentials = $2, connected_at = now(), expires_at = $3, status = 'active'
     RETURNING *`,
    [tenantId, JSON.stringify({ page_id: page.id, page_token: page.access_token, page_name: page.name, user_token: userToken }), fbExpiresAt]
  );

  // Save Instagram connection if available
  if (igData.instagram_business_account?.id) {
    await queryOne(
      `INSERT INTO social_connections (tenant_id, platform, credentials)
       VALUES ($1, 'instagram', $2)
       ON CONFLICT (tenant_id, platform) DO UPDATE SET credentials = $2, connected_at = now(), status = 'active'
       RETURNING *`,
      [tenantId, JSON.stringify({ ig_account_id: igData.instagram_business_account.id, access_token: page.access_token })]
    );
  }

  const response = new NextResponse(
    `<html><body><h2>Connected!</h2><p>Facebook Page "${page.name}" connected successfully.${igData.instagram_business_account ? ' Instagram also connected.' : ''}</p><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
  response.cookies.delete('fb_oauth_state');
  return response;
}
