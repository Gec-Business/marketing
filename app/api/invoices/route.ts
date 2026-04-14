import { NextRequest, NextResponse } from 'next/server';
import { requireOperator, requireUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');

  let sql = 'SELECT i.*, t.name as tenant_name FROM invoices i JOIN tenants t ON i.tenant_id = t.id WHERE 1=1';
  const params: unknown[] = [];
  let idx = 1;

  if (user.role === 'tenant') {
    if (tenantId && tenantId !== user.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    sql += ` AND i.tenant_id = $${idx}`;
    params.push(user.tenant_id);
    idx++;
  } else if (tenantId) {
    sql += ` AND i.tenant_id = $${idx}`;
    params.push(tenantId);
    idx++;
  }

  sql += ' ORDER BY i.created_at DESC';
  const invoices = await query(sql, params);
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  await requireOperator();
  const { tenant_id, items, total_amount, currency, period_start, period_end, due_date, notes } = await req.json();

  if (!tenant_id || !items || !total_amount || !period_start || !period_end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const year = new Date().getFullYear();
  const seq = await queryOne<{ nextval: string }>(`SELECT nextval('invoice_number_seq') AS nextval`);
  const num = parseInt(seq?.nextval || '1', 10);
  const invoiceNumber = `MK-${year}-${String(num).padStart(4, '0')}`;

  const invoice = await queryOne(
    `INSERT INTO invoices (tenant_id, invoice_number, period_start, period_end, items, total_amount, currency, due_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [tenant_id, invoiceNumber, period_start, period_end, JSON.stringify(items), total_amount, currency || 'GEL', due_date || null, notes || null]
  );

  return NextResponse.json({ invoice }, { status: 201 });
}
