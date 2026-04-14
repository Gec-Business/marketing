import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import type { Assessment } from '@/lib/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const assessment = await queryOne<Assessment>('SELECT * FROM assessments WHERE id = $1', [id]);
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role === 'tenant' && user.tenant_id !== assessment.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const agents = await query('SELECT * FROM assessment_agents WHERE assessment_id = $1 ORDER BY started_at', [id]);

  return NextResponse.json({ assessment, agents });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { action } = await req.json();

  if (action === 'tea_approve') {
    if (user.role !== 'operator' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await queryOne('UPDATE assessments SET tea_approved = true WHERE id = $1 RETURNING *', [id]);
  }

  if (action === 'tenant_approve') {
    const assessment = await queryOne<{ tenant_id: string }>('SELECT tenant_id FROM assessments WHERE id = $1', [id]);
    if (user.role !== 'tenant' || user.tenant_id !== assessment?.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await queryOne('UPDATE assessments SET tenant_approved = true, status = $1 WHERE id = $2 RETURNING *', ['approved', id]);
    await query('UPDATE tenants SET status = $1 WHERE id = $2', ['active', assessment.tenant_id]);
  }

  const updated = await queryOne('SELECT * FROM assessments WHERE id = $1', [id]);
  return NextResponse.json({ assessment: updated });
}
