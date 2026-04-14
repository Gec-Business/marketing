import { NextRequest, NextResponse } from 'next/server';
import { requireOperator, hashPassword } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET() {
  await requireOperator();
  const tenants = await query('SELECT * FROM tenants ORDER BY created_at DESC');
  return NextResponse.json({ tenants });
}

export async function POST(req: NextRequest) {
  await requireOperator();
  const body = await req.json();
  const { name, slug, industry, city, channels, posting_frequency, posts_per_week, video_ideas_per_month, primary_language, secondary_language, website, google_maps_url, social_links, target_audience, onboarding_data, tenant_email, tenant_password, monthly_fee, billing_currency, billing_start_date, billing_duration_months } = body;

  if (!name || !slug || !industry || !tenant_email || !tenant_password) {
    return NextResponse.json({ error: 'Missing required fields: name, slug, industry, tenant_email, tenant_password' }, { status: 400 });
  }

  const existing = await queryOne('SELECT id FROM tenants WHERE slug = $1', [slug]);
  if (existing) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
  }

  // Compute billing_day from start date (1-28 only, to avoid month-end issues)
  const billingDay = billing_start_date ? Math.min(new Date(billing_start_date).getDate(), 28) : 1;

  const tenant = await queryOne<{ id: string }>(
    `INSERT INTO tenants (name, slug, industry, city, channels, posting_frequency, posts_per_week, video_ideas_per_month, primary_language, secondary_language, website, google_maps_url, social_links, onboarding_data, api_keys, monthly_fee, billing_currency, billing_start_date, billing_duration_months, billing_day)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, '{}'::jsonb, $15, $16, $17, $18, $19)
     RETURNING *`,
    [
      name, slug, industry,
      city || 'Tbilisi',
      channels || [],
      posting_frequency || 'daily',
      posts_per_week || 5,
      video_ideas_per_month || 4,
      primary_language || 'ka',
      secondary_language || 'en',
      website || null,
      google_maps_url || null,
      JSON.stringify(social_links || {}),
      JSON.stringify(onboarding_data || {}),
      monthly_fee || null,
      billing_currency || 'GEL',
      billing_start_date || null,
      billing_duration_months || null,
      billingDay,
    ]
  );
  if (!tenant) return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });

  const passwordHash = await hashPassword(tenant_password);
  await query(
    `INSERT INTO users (email, password_hash, name, role, tenant_id, api_keys)
     VALUES ($1, $2, $3, 'tenant', $4, '{}'::jsonb)`,
    [tenant_email, passwordHash, name, tenant.id]
  );

  return NextResponse.json({ tenant }, { status: 201 });
}
