import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const connections = await query(
    `SELECT platform, status, connected_at, expires_at FROM social_connections WHERE tenant_id = $1`,
    [id]
  );
  return NextResponse.json({ connections });
}
