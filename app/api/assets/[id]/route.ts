import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const { category, tags, alt_text } = await req.json();

  const asset = await queryOne(
    `UPDATE assets SET
       category = COALESCE($1, category),
       tags = COALESCE($2, tags),
       alt_text = COALESCE($3, alt_text)
     WHERE id = $4 RETURNING *`,
    [category ?? null, tags ?? null, alt_text ?? null, id]
  );
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ asset });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;

  const asset = await queryOne<{ url: string }>('SELECT url FROM assets WHERE id = $1', [id]);
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete file from disk
  try {
    const uploadDir = process.env.UPLOAD_DIR || '/var/www/marketing/uploads';
    const filePath = path.join(uploadDir, asset.url.replace('/uploads/', ''));
    await fs.unlink(filePath);
  } catch {
    // File may already be gone — continue with DB deletion
  }

  await query('DELETE FROM assets WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
