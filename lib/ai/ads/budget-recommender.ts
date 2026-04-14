import { askClaude } from '../client';
import { sanitizeForPrompt } from '../sanitize';
import type { CampaignObjective } from '../../types';

/**
 * Recommends a daily budget for a campaign based on objective, audience size, and currency.
 * Returns min/recommended/max with reasoning.
 */
export async function recommendBudget(
  params: {
    objective: CampaignObjective;
    audience_size_estimate: string;  // e.g., "100K-500K"
    currency: string;                 // e.g., "GEL", "USD"
    country: string;
    industry: string;
    business_size?: 'small' | 'medium' | 'large';
  },
  apiKey?: string
): Promise<{
  daily_budget: { min: number; recommended: number; max: number };
  reasoning: string;
  expected_results: string;
  tokensUsed: number;
}> {
  const systemPrompt = `You are a paid media expert specializing in budget planning for social media ads. Return ONLY valid JSON — no markdown, no code fences.`;

  const userPrompt = `Recommend a daily ad budget for this campaign:

Objective: ${params.objective}
Audience size: ${sanitizeForPrompt(params.audience_size_estimate, 50)}
Currency: ${sanitizeForPrompt(params.currency, 10)}
Country: ${sanitizeForPrompt(params.country, 50)}
Industry: ${sanitizeForPrompt(params.industry, 100)}
Business size: ${params.business_size || 'small'}

Consider:
- Local CPM/CPC norms for the country
- Objective requires more or less budget (awareness < traffic < conversions)
- Audience size — larger audience = more budget needed for meaningful reach
- Currency conversion if needed

Return JSON:
{
  "daily_budget": { "min": 10, "recommended": 25, "max": 50 },
  "reasoning": "Why this budget makes sense",
  "expected_results": "Realistic projection per day at recommended budget"
}

All amounts in ${params.currency}.`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 1000, apiKey });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);
    return {
      daily_budget: parsed.daily_budget || { min: 0, recommended: 0, max: 0 },
      reasoning: parsed.reasoning || '',
      expected_results: parsed.expected_results || '',
      tokensUsed,
    };
  } catch {
    return {
      daily_budget: { min: 0, recommended: 0, max: 0 },
      reasoning: 'Failed to parse AI response',
      expected_results: '',
      tokensUsed,
    };
  }
}
