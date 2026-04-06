import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  await requireOperator();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  const state = `${tenantId}:${crypto.randomUUID()}`;
  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.APP_URL}/api/connect/facebook/callback`;
  const scopes = 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish';

  const authUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('fb_oauth_state', state, { maxAge: 600, httpOnly: true, sameSite: 'lax' });
  return response;
}
