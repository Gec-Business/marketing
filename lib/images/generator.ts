import OpenAI from 'openai';
import { query } from '../db';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePostImage(
  tenantId: string,
  description: string,
  brandConfig: Record<string, unknown>
): Promise<{ url: string; localPath: string; cost: number }> {
  const prompt = `${description}. Style: professional social media post, clean modern design. ${brandConfig.colors ? `Brand colors: ${brandConfig.colors}` : ''}`.slice(0, 4000);

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });

  const imageUrl = response.data[0].url!;

  const imageRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  const uploadDir = process.env.UPLOAD_DIR || '/var/www/marketing/uploads';
  const filename = `${tenantId}_${Date.now()}.png`;
  const dir = path.join(uploadDir, 'generated');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);

  const cost = 0.04;

  await query(
    `INSERT INTO cost_tracking (tenant_id, category, description, amount_usd) VALUES ($1, 'ai_images', 'Generated post image', $2)`,
    [tenantId, cost]
  );

  return { url: `/uploads/generated/${filename}`, localPath: filePath, cost };
}
