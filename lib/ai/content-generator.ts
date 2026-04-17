import { askClaude } from './client';
import { sanitizeTenantForPrompt } from './sanitize';
import { parseAIJson } from './parse-json';
import type { Tenant, Assessment } from '../types';

export async function generateContentBatch(
  tenant: Tenant,
  assessment: Assessment,
  count: number,
  weekStart: string,
  apiKey?: string
): Promise<{ posts: any[]; tokensUsed: number }> {
  const strategy = assessment.strategy_data || {};

  // Handle strategy data that may have parse_error — extract usable text
  let strategyContext: string;
  if (strategy.parse_error) {
    // Use raw text parts if structured data isn't available
    const parts = [strategy.part1, strategy.part2, strategy.raw_text].filter(Boolean);
    strategyContext = parts.join('\n\n').slice(0, 3000);
  } else {
    strategyContext = JSON.stringify(strategy, null, 2).slice(0, 4000);
  }

  const systemPrompt = `You are a social media content creator. Generate ${count} social media posts for the given business. Each post must be bilingual: ${tenant.primary_language === 'ka' ? 'Georgian' : 'English'} primary, ${tenant.secondary_language === 'ka' ? 'Georgian' : 'English'} secondary. Return ONLY a valid JSON array — no markdown, no code fences.`;

  const safe = sanitizeTenantForPrompt(tenant);

  const userPrompt = `Generate ${count} posts for:

Business: ${safe.name}
Industry: ${safe.industry}
Channels: ${tenant.channels.join(', ')}
Week starting: ${weekStart}

Strategy context:
${strategyContext}

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

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 8192, apiKey });

  const { parsed, success } = parseAIJson(text);
  if (success && Array.isArray(parsed)) {
    return { posts: parsed, tokensUsed };
  }
  if (success && parsed && !Array.isArray(parsed)) {
    // Claude sometimes wraps array in an object like { posts: [...] }
    const arr = parsed.posts || parsed.content || parsed.items || Object.values(parsed).find(Array.isArray);
    if (Array.isArray(arr)) return { posts: arr, tokensUsed };
  }
  console.error('Content generation: failed to parse response, text length:', text?.length);
  return { posts: [], tokensUsed };
}
