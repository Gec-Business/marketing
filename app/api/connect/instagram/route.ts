import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  await requireOperator();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  const returnTo = req.nextUrl.searchParams.get('return_to') || `/operator/tenants/${tenantId}/connect`;
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  const state = `${tenantId}:${crypto.randomUUID()}`;
  await query(
    `INSERT INTO oauth_states (state, tenant_id, platform, return_to) VALUES ($1, $2, 'instagram', $3)`,
    [state, tenantId, returnTo]
  );

  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.APP_URL}/api/connect/instagram/callback`;
  const scopes = 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_manage_comments';
  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(authUrl);
}
