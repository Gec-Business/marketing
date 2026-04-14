import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');

  let sql = 'SELECT * FROM tenant_reports WHERE 1=1';
  const params: unknown[] = [];
  let idx = 1;

  if (user.role === 'tenant') {
    if (tenantId && tenantId !== user.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    sql += ` AND tenant_id = $${idx}`;
    params.push(user.tenant_id);
    idx++;
  } else if (tenantId) {
    sql += ` AND tenant_id = $${idx}`;
    params.push(tenantId);
    idx++;
  }

  sql += ' ORDER BY period_start DESC LIMIT 50';
  const reports = await query(sql, params);
  return NextResponse.json({ reports });
}
