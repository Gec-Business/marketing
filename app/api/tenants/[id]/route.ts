import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [id]);
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ tenant });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const body = await req.json();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = ['name', 'industry', 'description', 'city', 'website', 'google_maps_url', 'social_links', 'brand_config', 'channels', 'posting_frequency', 'posts_per_week', 'video_ideas_per_month', 'primary_language', 'secondary_language', 'status', 'onboarding_data', 'monthly_fee', 'billing_currency', 'billing_start_date', 'billing_duration_months', 'billing_day', 'auto_invoice', 'auto_reports', 'ad_management_fee_pct', 'ads_enabled', 'monthly_ad_budget_cap'];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(['social_links', 'brand_config', 'onboarding_data'].includes(key) ? JSON.stringify(body[key]) : body[key]);
      idx++;
    }
  }

  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  values.push(id);
  const tenant = await queryOne(
    `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return NextResponse.json({ tenant });
}
