import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  await requireOperator();
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const savedState = req.cookies.get('tt_oauth_state')?.value;

  if (!code || !state || state !== savedState) {
    return new NextResponse('<html><body><h2>Authorization failed</h2></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  const tenantId = state.split(':')[0];

  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.APP_URL}/api/connect/tiktok/callback`,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return new NextResponse(`<html><body><h2>Error</h2><p>${tokenData.error_description}</p></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }

  await queryOne(
    `INSERT INTO social_connections (tenant_id, platform, credentials, expires_at)
     VALUES ($1, 'tiktok', $2, $3)
     ON CONFLICT (tenant_id, platform) DO UPDATE SET credentials = $2, connected_at = now(), expires_at = $3, status = 'active'
     RETURNING *`,
    [
      tenantId,
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        open_id: tokenData.open_id,
      }),
      tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    ]
  );

  const response = new NextResponse(
    '<html><body><h2>TikTok Connected!</h2><script>setTimeout(() => window.close(), 3000);</script></body></html>',
    { headers: { 'Content-Type': 'text/html' } }
  );
  response.cookies.delete('tt_oauth_state');
  return response;
}
