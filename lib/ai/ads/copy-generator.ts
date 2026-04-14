import { askClaude } from '../client';
import { sanitizeTenantForPrompt, sanitizeForPrompt } from '../sanitize';
import type { Tenant, CampaignObjective } from '../../types';

/**
 * Generates 3 ad copy variants (for A/B testing) optimized for the campaign objective.
 * Different from organic post copy — more direct, conversion-focused, character-limited.
 */
export async function generateAdCopy(
  tenant: Tenant,
  objective: CampaignObjective,
  context: { audience_description?: string; landing_url?: string; product?: string },
  apiKey?: string
): Promise<{
  variants: Array<{
    headline: string;          // max 27 chars (Meta)
    body: string;              // max 125 chars (Meta primary text)
    description: string;       // max 27 chars (Meta link description)
    cta: string;               // CTA enum
    rationale: string;
  }>;
  tokensUsed: number;
}> {
  const safe = sanitizeTenantForPrompt(tenant);
  const safeLang = sanitizeForPrompt(tenant.primary_language, 10);
  const lang = safeLang === 'ka' ? 'Georgian' : 'English';

  const systemPrompt = `You are a direct response copywriter specializing in social media ads. Write conversion-focused ad copy. Return ONLY valid JSON — no markdown, no code fences.`;

  const userPrompt = `Write 3 ad copy variants in ${lang} for this campaign:

Business: ${safe.name}
Industry: ${safe.industry}
Objective: ${objective}
Audience: ${sanitizeForPrompt(context.audience_description || 'general', 300)}
Product/Service: ${sanitizeForPrompt(context.product || 'main offering', 200)}
Landing URL: ${sanitizeForPrompt(context.landing_url || 'website homepage', 200)}

Constraints:
- Headline: max 27 characters (will be truncated by Meta)
- Body (primary text): max 125 characters
- Description: max 27 characters
- CTA: choose ONE from: SHOP_NOW, LEARN_MORE, SIGN_UP, BOOK_NOW, CONTACT_US, GET_OFFER, ORDER_NOW, DOWNLOAD, SUBSCRIBE

Make 3 variants test different angles (e.g., benefit-focused, urgency, social proof).

Return JSON:
{
  "variants": [
    {
      "headline": "Max 27 chars",
      "body": "Max 125 chars",
      "description": "Max 27 chars",
      "cta": "LEARN_MORE",
      "rationale": "Why this angle"
    }
  ]
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 2000, apiKey });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);
    return { variants: parsed.variants || [], tokensUsed };
  } catch {
    return { variants: [], tokensUsed };
  }
}
