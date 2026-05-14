import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const stateRaw = req.nextUrl.searchParams.get('state');
  const state = stateRaw ? decodeURIComponent(stateRaw) : null;
  const error = req.nextUrl.searchParams.get('error');
  const errorDesc = req.nextUrl.searchParams.get('error_description');
  console.log('[IG Callback] state raw:', stateRaw, '→ decoded:', state, '| code present:', !!code);

  if (error) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;max-width:400px;margin:40px auto;padding:20px"><h2>Instagram Error</h2><p>${error}: ${errorDesc}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const savedState = state
    ? await queryOne<{ tenant_id: string; return_to: string | null }>(
        `DELETE FROM oauth_states WHERE state = $1 AND platform = 'instagram' AND expires_at > now() RETURNING tenant_id, return_to`,
        [state]
      )
    : null;
  console.log('[IG Callback] savedState:', savedState, '| code present:', !!code);

  if (!code || !savedState) {
    console.error('[IG Callback] Failed — code:', !!code, 'savedState:', !!savedState);
    return new NextResponse(
      '<html><body style="font-family:sans-serif;max-width:400px;margin:40px auto;padding:20px"><h2>Authorization failed</h2><p>Invalid or expired state. Please try again.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const tenantId = savedState.tenant_id;
  const returnTo = savedState.return_to || `/operator/tenants/${tenantId}/connect`;
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = `${process.env.APP_URL}/api/connect/instagram/callback`;

  // Exchange code for short-lived token
  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  console.log('[IG Callback] token exchange status:', tokenRes.status, 'error:', tokenData.error_message);

  if (!tokenRes.ok || tokenData.error_message) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;max-width:400px;margin:40px auto;padding:20px"><h2>Error</h2><p>${tokenData.error_message || `Instagram API returned ${tokenRes.status}`}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const shortToken = tokenData.access_token;
  const igUserId = String(tokenData.user_id);

  // Exchange for long-lived token (60 days)
  const llRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`
  );
  const llData = await llRes.json();
  console.log('[IG Callback] long-lived token exchange status:', llRes.status, 'error:', llData.error?.message);

  const accessToken = llData.access_token || shortToken;
  const expiresIn = llData.expires_in || 5183944; // 60 days in seconds
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // Fetch Instagram user profile
  const profileRes = await fetch(
    `https://graph.instagram.com/v25.0/me?fields=id,name,username,profile_picture_url&access_token=${accessToken}`
  );
  const profile = profileRes.ok ? await profileRes.json() : {};
  console.log('[IG Callback] profile:', profile.username || profile.id);

  const credentials = {
    ig_user_id: igUserId,
    access_token: accessToken,
    username: profile.username || null,
    name: profile.name || null,
  };

  await query(
    `INSERT INTO social_connections (tenant_id, platform, credentials, expires_at, page_name)
     VALUES ($1, 'instagram', $2, $3, $4)
     ON CONFLICT (tenant_id, platform) DO UPDATE
       SET credentials = $2, expires_at = $3, page_name = $4, connected_at = now(), status = 'active'`,
    [tenantId, JSON.stringify(credentials), expiresAt, profile.username ? `@${profile.username}` : null]
  );

  return NextResponse.redirect(new URL(returnTo, process.env.APP_URL));
}
