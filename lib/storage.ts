import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/www/marketing/uploads';

export async function saveUploadedFile(
  tenantId: string,
  file: File
): Promise<{ filename: string; filePath: string; size: number }> {
  const ext = path.extname(file.name) || '.bin';
  const filename = `${tenantId}_${uuid()}${ext}`;
  const dir = path.join(UPLOAD_DIR, tenantId);
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return { filename, filePath: `/uploads/${tenantId}/${filename}`, size: buffer.length };
}
