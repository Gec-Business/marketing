import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query } from '@/lib/db';
import { saveUploadedFile } from '@/lib/storage';

export async function GET(req: NextRequest) {
  await requireOperator();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  const assets = await query(
    'SELECT * FROM assets WHERE tenant_id = $1 ORDER BY uploaded_at DESC',
    [tenantId]
  );
  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  await requireOperator();

  const formData = await req.formData();
  const tenantId = formData.get('tenant_id') as string;
  const category = (formData.get('category') as string) || 'other';
  const altText = (formData.get('alt_text') as string) || '';
  const tagsRaw = (formData.get('tags') as string) || '';
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const files = formData.getAll('files') as File[];

  if (!tenantId || files.length === 0) {
    return NextResponse.json({ error: 'tenant_id and at least one file required' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 20 * 1024 * 1024; // 20MB per file

  const created = [];
  for (const file of files) {
    if (!allowedTypes.includes(file.type)) continue;
    if (file.size > maxSize) continue;

    const { filename, filePath } = await saveUploadedFile(tenantId, file);

    const asset = await query(
      `INSERT INTO assets (tenant_id, url, filename, original_name, mime_type, size_bytes, category, tags, alt_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tenantId, filePath, filename, file.name, file.type, file.size, category, tags, altText]
    );
    created.push((asset as any[])[0]);
  }

  return NextResponse.json({ assets: created }, { status: 201 });
}
