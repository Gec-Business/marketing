import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const savedState = req.cookies.get('li_oauth_state')?.value;

  if (!code || !state || state !== savedState) {
    return new NextResponse('<html><body><h2>Authorization failed</h2></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  const tenantId = state.split(':')[0];

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.APP_URL}/api/connect/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return new NextResponse(`<html><body><h2>Error</h2><p>${tokenData.error_description}</p></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }

  await queryOne(
    `INSERT INTO social_connections (tenant_id, platform, credentials, expires_at)
     VALUES ($1, 'linkedin', $2, $3)
     ON CONFLICT (tenant_id, platform) DO UPDATE SET credentials = $2, connected_at = now(), expires_at = $3, status = 'active'
     RETURNING *`,
    [
      tenantId,
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        org_id: process.env.LINKEDIN_ORG_ID,
      }),
      tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    ]
  );

  const response = new NextResponse(
    '<html><body><h2>LinkedIn Connected!</h2><script>setTimeout(() => window.close(), 3000);</script></body></html>',
    { headers: { 'Content-Type': 'text/html' } }
  );
  response.cookies.delete('li_oauth_state');
  return response;
}
