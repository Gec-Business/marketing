import OpenAI from 'openai';
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

export interface VisualDirection {
  photography_style?: string;
  graphic_style?: string;
  color_application_guidelines?: string;
  stop_doing_visually?: string[];
}

type DalleSize = '1024x1024' | '1024x1792' | '1792x1024';

function resolveSize(contentType?: string): { size: DalleSize; formatHint: string } {
  if (contentType === 'reel' || contentType === 'video') {
    return { size: '1024x1792', formatHint: 'Vertical 9:16 format, optimized for Stories and Reels.' };
  }
  return { size: '1024x1024', formatHint: 'Square 1:1 format, optimized for social media feed.' };
}

export async function generatePostImage(
  tenantId: string,
  description: string,
  brandConfig: Record<string, unknown>,
  apiKey?: string,
  visualDirection?: VisualDirection,
  contentType?: string
): Promise<{ url: string; localPath: string; cost: number }> {
  const openai = getOpenAIClient(apiKey);

  const styleParts: string[] = [];

  if (visualDirection?.photography_style) styleParts.push(visualDirection.photography_style);
  if (visualDirection?.graphic_style)     styleParts.push(visualDirection.graphic_style);
  if (visualDirection?.color_application_guidelines) styleParts.push(`Color use: ${visualDirection.color_application_guidelines}`);
  if (brandConfig?.colors) styleParts.push(`Brand colors: ${brandConfig.colors}`);

  const avoidParts: string[] = [];
  if (visualDirection?.stop_doing_visually?.length) avoidParts.push(...visualDirection.stop_doing_visually);

  const styleGuide = styleParts.length
    ? styleParts.join('. ')
    : 'professional social media post, clean modern design';

  const avoidGuide = avoidParts.length ? ` Avoid: ${avoidParts.join(', ')}.` : '';

  const { size, formatHint } = resolveSize(contentType);
  const prompt = `${description}. ${styleGuide}.${avoidGuide} ${formatHint} No text overlays.`.slice(0, 4000);

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size,
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

  return { url: `/uploads/generated/${filename}`, localPath: filePath, cost: 0.04 };
}
