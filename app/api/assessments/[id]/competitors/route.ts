import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { queryOne } from '@/lib/db';

/**
 * Manage competitors in an assessment's competitor_data.
 *
 * PATCH: Update the entire competitors array (add/edit/remove).
 *   Body: { competitors: [...] }
 *   Merges into existing competitor_data, preserving other fields (tenant_position, threats, etc.)
 *
 * POST: Add a single competitor.
 *   Body: { name, type, price_positioning, strengths, weaknesses, geographic_overlap }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const { competitors } = await req.json();

  if (!Array.isArray(competitors)) {
    return NextResponse.json({ error: 'competitors must be an array' }, { status: 400 });
  }

  const assessment = await queryOne<{ competitor_data: any }>(
    'SELECT competitor_data FROM assessments WHERE id = $1',
    [id]
  );
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

  const current = assessment.competitor_data || {};
  const updated = { ...current, competitors };

  await queryOne(
    'UPDATE assessments SET competitor_data = $1 WHERE id = $2 RETURNING id',
    [JSON.stringify(updated), id]
  );

  return NextResponse.json({ ok: true, competitors_count: competitors.length });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const newCompetitor = await req.json();

  if (!newCompetitor.name) {
    return NextResponse.json({ error: 'Competitor name is required' }, { status: 400 });
  }

  const assessment = await queryOne<{ competitor_data: any }>(
    'SELECT competitor_data FROM assessments WHERE id = $1',
    [id]
  );
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

  const current = assessment.competitor_data || {};
  const competitors = current.competitors || [];

  const competitor = {
    name: newCompetitor.name,
    type: newCompetitor.type || 'single',
    price_positioning: newCompetitor.price_positioning || 'mid',
    estimated_branches: newCompetitor.estimated_branches || null,
    strengths: newCompetitor.strengths || [],
    weaknesses: newCompetitor.weaknesses || [],
    geographic_overlap: newCompetitor.geographic_overlap || 'medium',
    social_media_presence: newCompetitor.social_media_presence || {},
    added_manually: true,
  };

  competitors.push(competitor);
  const updated = { ...current, competitors };

  await queryOne(
    'UPDATE assessments SET competitor_data = $1 WHERE id = $2 RETURNING id',
    [JSON.stringify(updated), id]
  );

  return NextResponse.json({ ok: true, competitor, competitors_count: competitors.length }, { status: 201 });
}
