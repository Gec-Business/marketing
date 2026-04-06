import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireTenantAccess } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const post = await queryOne('SELECT * FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await requireTenantAccess((post as any).tenant_id);

  const comments = await query(
    `SELECT c.*, u.name as user_name, u.role as user_role FROM post_comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
    [id]
  );

  return NextResponse.json({ post, comments });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const post = await queryOne('SELECT * FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await requireTenantAccess((post as any).tenant_id);

  const body = await req.json();
  const allowed = ['copy_primary', 'copy_secondary', 'platform_copies', 'hashtags', 'media_urls', 'scheduled_at', 'content_type', 'platforms', 'video_idea'];
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(['platform_copies', 'video_idea'].includes(key) ? JSON.stringify(body[key]) : body[key]);
      idx++;
    }
  }

  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  values.push(id);
  const updated = await queryOne(`UPDATE posts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  return NextResponse.json({ post: updated });
}
