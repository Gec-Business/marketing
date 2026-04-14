import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { setApiKeysForOperator, getKeyStatusForOperator } from '@/lib/api-keys';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const user = await requireOperator();
  const status = await getKeyStatusForOperator(user.id);
  return NextResponse.json(status);
}

export async function PATCH(req: NextRequest) {
  const user = await requireOperator();
  const body = await req.json();

  const update: { anthropic?: string; openai?: string } = {};
  if (typeof body.anthropic === 'string') update.anthropic = body.anthropic.trim();
  if (typeof body.openai === 'string') update.openai = body.openai.trim();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No keys provided' }, { status: 400 });
  }

  await setApiKeysForOperator(user.id, update);

  const cleared = Object.entries(update).filter(([, v]) => v === '').map(([k]) => k);
  const set = Object.entries(update).filter(([, v]) => v !== '').map(([k]) => k);
  await logAudit({
    userId: user.id,
    action: cleared.length && !set.length ? 'clear_operator_api_keys' : 'set_operator_api_keys',
    resourceType: 'user',
    resourceId: user.id,
    details: { fields_set: set, fields_cleared: cleared },
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
  });

  const status = await getKeyStatusForOperator(user.id);
  return NextResponse.json({ ok: true, status });
}
