import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { action } = await req.json();

  const post = await queryOne('SELECT * FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const p = post as any;

  if (user.role === 'operator' || user.role === 'admin') {
    if (action === 'approve') {
      const updated = await queryOne(
        `UPDATE posts SET status = 'pending_tenant', tea_approved_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json({ post: updated });
    }
    if (action === 'reject') {
      const updated = await queryOne(
        `UPDATE posts SET status = 'draft' WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json({ post: updated });
    }
  }

  if (user.role === 'tenant' && user.tenant_id === p.tenant_id) {
    if (p.status !== 'pending_tenant') {
      return NextResponse.json({ error: 'Post not ready for tenant approval' }, { status: 400 });
    }
    if (action === 'approve') {
      const updated = await queryOne(
        `UPDATE posts SET status = 'scheduled', tenant_approved_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json({ post: updated });
    }
    if (action === 'reject') {
      const updated = await queryOne(
        `UPDATE posts SET status = 'rejected' WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json({ post: updated });
    }
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
