import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { askClaudeWithPdf } from '@/lib/ai/client';
import { parseAIJson } from '@/lib/ai/parse-json';
import { getApiKeysForTenant } from '@/lib/api-keys';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
  }

  if (file.size > 32 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF must be under 32MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pdfBase64 = buffer.toString('base64');

  const tenant = await queryOne<{ brand_config: any; name: string; industry: string }>(
    'SELECT brand_config, name, industry FROM tenants WHERE id = $1',
    [id]
  );
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const apiKeys = await getApiKeysForTenant(id);

  const systemPrompt = `You are a brand analyst. Extract structured brand guidelines from this brandbook. Return ONLY valid JSON — no markdown, no code fences.`;

  const userPrompt = `Extract all brand guidelines from this brandbook for ${tenant.name} (${tenant.industry}).

Return JSON with exactly these fields (use null for anything not found):
{
  "primary_color": "#hex or null",
  "secondary_color": "#hex or null",
  "accent_color": "#hex or null",
  "font_primary": "font name or null",
  "font_secondary": "font name or null",
  "tagline": "official tagline or null",
  "brand_values": ["value1", "value2"],
  "tone_of_voice": "description of brand tone",
  "visual_style_notes": "photography and design style notes",
  "photography_guidelines": "specific photography do/don't rules",
  "logo_usage_notes": "logo placement and sizing rules",
  "do_use": ["visual/copy element to use"],
  "dont_use": ["visual/copy element to avoid"],
  "additional_colors": [{"name": "color name", "hex": "#hex"}]
}`;

  try {
    const { text, tokensUsed } = await askClaudeWithPdf(systemPrompt, pdfBase64, userPrompt, {
      maxTokens: 3000,
      apiKey: apiKeys.anthropic,
    });

    const { parsed, success } = parseAIJson(text);
    if (!success || !parsed) {
      return NextResponse.json({ error: 'Could not parse brandbook — try a text-based PDF' }, { status: 422 });
    }

    // Merge extracted fields into existing brand_config, preserving logo_url and manual overrides
    const existing = tenant.brand_config || {};
    const merged: Record<string, any> = { ...existing };

    const colorFields = ['primary_color', 'secondary_color', 'accent_color'];
    const textFields = ['font_primary', 'font_secondary', 'tagline', 'tone_of_voice', 'visual_style_notes', 'photography_guidelines', 'logo_usage_notes'];
    const arrayFields = ['brand_values', 'do_use', 'dont_use', 'additional_colors'];

    for (const f of colorFields) {
      if (parsed[f]) merged[f] = parsed[f];
    }
    for (const f of textFields) {
      if (parsed[f]) merged[f] = parsed[f];
    }
    for (const f of arrayFields) {
      if (parsed[f]?.length) merged[f] = parsed[f];
    }

    // Build legacy colors string for backward compat with older code
    if (merged.primary_color) {
      merged.colors = [
        merged.primary_color && `Primary: ${merged.primary_color}`,
        merged.secondary_color && `Secondary: ${merged.secondary_color}`,
        merged.accent_color && `Accent: ${merged.accent_color}`,
      ].filter(Boolean).join(', ');
    }

    await queryOne(
      'UPDATE tenants SET brand_config = $1 WHERE id = $2',
      [JSON.stringify(merged), id]
    );

    return NextResponse.json({ brand_config: merged, extracted: parsed, tokensUsed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Extraction failed' }, { status: 500 });
  }
}
