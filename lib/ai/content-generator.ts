import { askClaude } from './client';
import type { Tenant, Assessment } from '../types';

export async function generateContentBatch(
  tenant: Tenant,
  assessment: Assessment,
  count: number,
  weekStart: string
): Promise<{ posts: any[]; tokensUsed: number }> {
  const strategy = assessment.strategy_data;

  const systemPrompt = `You are a social media content creator. Generate ${count} social media posts for the given business. Each post must be bilingual: ${tenant.primary_language === 'ka' ? 'Georgian' : 'English'} primary, ${tenant.secondary_language === 'ka' ? 'Georgian' : 'English'} secondary. Return ONLY a valid JSON array — no markdown, no code fences.`;

  const userPrompt = `Generate ${count} posts for:

Business: ${tenant.name}
Industry: ${tenant.industry}
Channels: ${tenant.channels.join(', ')}
Week starting: ${weekStart}

Strategy context:
${JSON.stringify(strategy, null, 2)}

For each post generate:
{
  "content_type": "image_post" | "carousel" | "reel" | "video",
  "platforms": ["facebook", "instagram", ...],
  "copy_primary": "Primary language text",
  "copy_secondary": "Secondary language text",
  "platform_copies": {
    "facebook": { "primary": "FB-optimized primary", "secondary": "FB-optimized secondary" }
  },
  "hashtags": ["#tag1", "#tag2"],
  "visual_description": "Detailed description for AI image generation",
  "video_idea": null or { "concept": "", "scenario": "", "texts": ["text overlay 1"], "duration": "15s|30s|60s", "call_to_action": "" },
  "suggested_date": "YYYY-MM-DD",
  "sort_order": 1
}

Mix content types. Include video posts where appropriate. Visual descriptions should be specific enough for DALL-E.`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 8192 });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const posts = JSON.parse(cleaned);
    return { posts: Array.isArray(posts) ? posts : [], tokensUsed };
  } catch {
    return { posts: [], tokensUsed };
  }
}
