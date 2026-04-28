import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  await requireOperator();
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  const savedState = state ? await queryOne<{ tenant_id: string }>(
    `DELETE FROM oauth_states WHERE state = $1 AND platform = 'facebook' AND expires_at > now() RETURNING tenant_id`,
    [state]
  ) : null;

  if (!code || !savedState) {
    return new NextResponse('<html><body><h2>Authorization failed</h2><p>Invalid or expired state. Please try again.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  const tenantId = savedState.tenant_id;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = `${process.env.APP_URL}/api/connect/facebook/callback`;

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

  const pagesRes = await fetch(`https://graph.facebook.com/v25.0/me/accounts?access_token=${userToken}`);
  const pagesData = await pagesRes.json();

  if (!pagesData.data?.length) {
    return new NextResponse('<html><body><h2>No pages found</h2><p>The account has no Facebook Pages.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  const page = pagesData.data[0];

  const igRes = await fetch(`https://graph.facebook.com/v25.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
  const igData = await igRes.json();

  const fbExpiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  await query(
    `INSERT INTO social_connections (tenant_id, platform, credentials, expires_at)
     VALUES ($1, 'facebook', $2, $3)
     ON CONFLICT (tenant_id, platform) DO UPDATE SET credentials = $2, connected_at = now(), expires_at = $3, status = 'active'`,
    [tenantId, JSON.stringify({ page_id: page.id, page_token: page.access_token, page_name: page.name, user_token: userToken }), fbExpiresAt]
  );

  if (igData.instagram_business_account?.id) {
    await query(
      `INSERT INTO social_connections (tenant_id, platform, credentials)
       VALUES ($1, 'instagram', $2)
       ON CONFLICT (tenant_id, platform) DO UPDATE SET credentials = $2, connected_at = now(), status = 'active'`,
      [tenantId, JSON.stringify({ ig_account_id: igData.instagram_business_account.id, access_token: page.access_token })]
    );
  }

  return new NextResponse(
    `<html><body><h2>Connected!</h2><p>Facebook Page "${page.name}" connected.${igData.instagram_business_account ? ' Instagram also connected.' : ''}</p><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
