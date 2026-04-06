import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  await requireOperator();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  const state = `${tenantId}:${crypto.randomUUID()}`;
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = `${process.env.APP_URL}/api/connect/tiktok/callback`;
  const scopes = 'user.info.basic,video.publish,video.upload';

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('tt_oauth_state', state, { maxAge: 600, httpOnly: true, sameSite: 'lax' });
  return response;
}
