import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await queryOne(
    'SELECT i.*, t.name as tenant_name FROM invoices i JOIN tenants t ON i.tenant_id = t.id WHERE i.id = $1',
    [id]
  );
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role === 'tenant' && user.tenant_id !== (invoice as any).tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== 'operator' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { status, paid_at } = await req.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (status) { fields.push(`status = $${idx}`); values.push(status); idx++; }
  if (paid_at) { fields.push(`paid_at = $${idx}`); values.push(paid_at); idx++; }

  if (fields.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  values.push(id);
  const invoice = await queryOne(`UPDATE invoices SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  return NextResponse.json({ invoice });
}
