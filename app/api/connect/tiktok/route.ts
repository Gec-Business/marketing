import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  await requireOperator();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  const state = `${tenantId}:${crypto.randomUUID()}`;
  await query(
    `INSERT INTO oauth_states (state, tenant_id, platform) VALUES ($1, $2, 'tiktok')`,
    [state, tenantId]
  );

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = `${process.env.APP_URL}/api/connect/tiktok/callback`;
  const scopes = 'user.info.basic,video.publish,video.upload';
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(authUrl);
}
