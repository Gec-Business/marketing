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
    `INSERT INTO oauth_states (state, tenant_id, platform, return_to) VALUES ($1, $2, 'facebook', $3)`,
    [state, tenantId, returnTo]
  );
  console.log('[FB OAuth] Inserted state:', state);

  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.APP_URL}/api/connect/facebook/callback`;
  const scopes = 'pages_show_list,pages_manage_posts,pages_read_engagement,instagram_content_publish';
  const authUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
