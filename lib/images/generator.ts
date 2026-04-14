import OpenAI from 'openai';
import { query } from '../db';
import fs from 'fs/promises';
import path from 'path';

let globalOpenai: OpenAI | null = null;

function getOpenAIClient(apiKey?: string): OpenAI {
  if (apiKey) return new OpenAI({ apiKey });
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('No OpenAI API key configured (none provided, none in env)');
  }
  if (!globalOpenai) globalOpenai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return globalOpenai;
}

export async function generatePostImage(
  tenantId: string,
  description: string,
  brandConfig: Record<string, unknown>,
  apiKey?: string
): Promise<{ url: string; localPath: string; cost: number }> {
  const openai = getOpenAIClient(apiKey);
  const prompt = `${description}. Style: professional social media post, clean modern design. ${brandConfig.colors ? `Brand colors: ${brandConfig.colors}` : ''}`.slice(0, 4000);

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) throw new Error('DALL-E returned no image URL');

  const imageRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  const uploadDir = process.env.UPLOAD_DIR || '/var/www/marketing/uploads';
  const filename = `${tenantId}_${Date.now()}.png`;
  const dir = path.join(uploadDir, 'generated');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);

  const cost = 0.04;
  // Note: cost tracking is done by the caller (content route) so it can be aggregated
  // and properly attributed via billed_to. This function only returns the cost.

  return { url: `/uploads/generated/${filename}`, localPath: filePath, cost };
}
