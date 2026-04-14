import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { saveUploadedFile } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const tenantId = formData.get('tenant_id') as string;

  if (!file || !tenantId) {
    return NextResponse.json({ error: 'File and tenant_id required' }, { status: 400 });
  }

  if (user.role === 'tenant' && user.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: `File type not allowed: ${file.type}. Accepted: images (jpeg, png, webp, gif) and videos (mp4, mov, webm).` }, { status: 400 });
  }

  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large. Maximum 500MB.' }, { status: 400 });
  }

  const { filename, filePath, size } = await saveUploadedFile(tenantId, file);

  const media = await queryOne(
    `INSERT INTO media_files (tenant_id, uploaded_by, filename, original_name, mime_type, size_bytes, file_path)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [tenantId, user.id, filename, file.name, file.type, size, filePath]
  );

  return NextResponse.json({ media }, { status: 201 });
}
