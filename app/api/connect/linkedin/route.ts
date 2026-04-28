import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  await requireOperator();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  const state = `${tenantId}:${crypto.randomUUID()}`;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/api/connect/linkedin/callback`;
  const scopes = 'openid profile w_member_social w_organization_social';

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('li_oauth_state', state, { maxAge: 600, httpOnly: true, sameSite: 'lax' });
  return response;
}
