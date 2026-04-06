import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireTenantAccess } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const post = await queryOne('SELECT tenant_id FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await requireTenantAccess((post as any).tenant_id);

  const comments = await query(
    `SELECT c.*, u.name as user_name, u.role as user_role FROM post_comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
    [id]
  );
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { component, message } = await req.json();

  if (!component || !message) {
    return NextResponse.json({ error: 'Component and message required' }, { status: 400 });
  }

  const validComponents = ['copy', 'hashtags', 'visual', 'video', 'general'];
  if (!validComponents.includes(component)) {
    return NextResponse.json({ error: `Invalid component. Must be one of: ${validComponents.join(', ')}` }, { status: 400 });
  }

  const post = await queryOne('SELECT tenant_id FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await requireTenantAccess((post as any).tenant_id);

  const comment = await queryOne(
    `INSERT INTO post_comments (post_id, user_id, component, message) VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, user.id, component, message]
  );

  return NextResponse.json({ comment }, { status: 201 });
}
