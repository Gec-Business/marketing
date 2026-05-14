import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  await requireOperator();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  const returnTo = req.nextUrl.searchParams.get('return_to') || `/operator/tenants/${tenantId}/connect`;
  const state = `${tenantId}:${crypto.randomUUID()}`;
  await query(
    `INSERT INTO oauth_states (state, tenant_id, platform, return_to) VALUES ($1, $2, 'linkedin', $3)`,
    [state, tenantId, returnTo]
  );

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/api/connect/linkedin/callback`;
  const scopes = 'openid profile w_member_social';
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(authUrl);
}
