import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Logo must be JPG, PNG, WebP, or SVG' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Logo must be under 5MB' }, { status: 400 });
  }

  const ext = path.extname(file.name) || '.png';
  const filename = `logo_${uuid()}${ext}`;
  const uploadDir = process.env.UPLOAD_DIR || '/var/www/marketing/uploads';
  const dir = path.join(uploadDir, id, 'brand');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  const url = `/uploads/${id}/brand/${filename}`;

  const tenant = await queryOne<{ brand_config: any }>(
    'SELECT brand_config FROM tenants WHERE id = $1',
    [id]
  );
  const existing = tenant?.brand_config || {};
  const updated = { ...existing, logo_url: url };

  await queryOne(
    'UPDATE tenants SET brand_config = $1 WHERE id = $2',
    [JSON.stringify(updated), id]
  );

  return NextResponse.json({ logo_url: url });
}
