import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');
  const errorDesc = req.nextUrl.searchParams.get('error_description');

  console.log('[linkedin-callback] code:', !!code, 'state:', state, 'error:', error, errorDesc);

  if (error) {
    return new NextResponse(`<html><body><h2>LinkedIn Error</h2><p>${error}: ${errorDesc}</p></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }

  const savedState = state ? await queryOne<{ tenant_id: string }>(
    `DELETE FROM oauth_states WHERE state = $1 AND platform = 'linkedin' AND expires_at > now() RETURNING tenant_id`,
    [state]
  ) : null;

  console.log('[linkedin-callback] savedState:', savedState);

  if (!code || !savedState) {
    const dbCheck = state ? await queryOne(`SELECT state, expires_at, now() FROM oauth_states WHERE state = $1`, [state]) : null;
    console.log('[linkedin-callback] DB check (may be already deleted):', dbCheck);
    return new NextResponse(`<html><body><h2>Authorization failed</h2><p>code: ${!!code}, state: ${!!state}, savedState: ${!!savedState}</p><p>Try again.</p></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }

  const tenantId = savedState.tenant_id;

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

  await query(
    `INSERT INTO social_connections (tenant_id, platform, credentials, expires_at)
     VALUES ($1, 'linkedin', $2, $3)
     ON CONFLICT (tenant_id, platform) DO UPDATE SET credentials = $2, connected_at = now(), expires_at = $3, status = 'active'`,
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

  return new NextResponse(
    '<html><body><h2>LinkedIn Connected!</h2><script>setTimeout(() => window.close(), 3000);</script></body></html>',
    { headers: { 'Content-Type': 'text/html' } }
  );
}
