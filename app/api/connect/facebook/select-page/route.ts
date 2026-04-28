import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { token, page_id } = await req.json();
  if (!token || !page_id) return NextResponse.json({ error: 'Missing token or page_id' }, { status: 400 });

  const row = await queryOne<{ tenant_id: string; pages: any[]; user_token: string }>(
    `DELETE FROM fb_page_selections WHERE token = $1 AND expires_at > now() RETURNING tenant_id, pages, user_token`,
    [token]
  );
  if (!row) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });

  const page = row.pages.find((p: any) => p.id === page_id);
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 400 });

  // Check for linked Instagram business account
  const igRes = await fetch(`https://graph.facebook.com/v25.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
  const igData = igRes.ok ? await igRes.json() : {};

  const fbExpiresAt = null; // Page tokens from long-lived user tokens don't expire

  await query(
    `INSERT INTO social_connections (tenant_id, platform, credentials, expires_at)
     VALUES ($1, 'facebook', $2, $3)
     ON CONFLICT (tenant_id, platform) DO UPDATE SET credentials = $2, connected_at = now(), expires_at = $3, status = 'active'`,
    [row.tenant_id, JSON.stringify({ page_id: page.id, page_token: page.access_token, page_name: page.name, user_token: row.user_token }), fbExpiresAt]
  );

  if (igData.instagram_business_account?.id) {
    await query(
      `INSERT INTO social_connections (tenant_id, platform, credentials)
       VALUES ($1, 'instagram', $2)
       ON CONFLICT (tenant_id, platform) DO UPDATE SET credentials = $2, connected_at = now(), status = 'active'`,
      [row.tenant_id, JSON.stringify({ ig_account_id: igData.instagram_business_account.id, access_token: page.access_token })]
    );
  }

  return NextResponse.json({ ok: true, page_name: page.name, instagram: !!igData.instagram_business_account?.id });
}
