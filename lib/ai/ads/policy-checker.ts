import { askClaude } from '../client';
import { sanitizeForPrompt } from '../sanitize';
import type { AdCreative } from '../../types';

/**
 * Pre-checks ad creative against Meta and LinkedIn ad policies.
 * Flags likely violations BEFORE submitting to the platform — saves Tea from disapproval cycles.
 */
export async function checkAdPolicy(
  creative: AdCreative,
  context: { industry: string; landing_url?: string; platform: 'meta' | 'linkedin' },
  apiKey?: string
): Promise<{
  passes: boolean;
  risk_level: 'none' | 'low' | 'medium' | 'high';
  violations: Array<{ category: string; severity: 'warning' | 'rejection_likely'; description: string; suggestion: string }>;
  cleaned_suggestion?: AdCreative;
  tokensUsed: number;
}> {
  const systemPrompt = `You are an ad policy compliance expert for ${context.platform === 'meta' ? 'Meta (Facebook + Instagram)' : 'LinkedIn'} advertising. Identify potential policy violations BEFORE submission. Return ONLY valid JSON — no markdown, no code fences.`;

  const safeCreative = {
    headline: sanitizeForPrompt(creative.headline, 200),
    body: sanitizeForPrompt(creative.body, 500),
    cta: creative.cta || '',
    image_url: creative.image_url || '',
    link_url: creative.link_url || '',
  };

  const userPrompt = `Review this ad creative for policy compliance:

Platform: ${context.platform}
Industry: ${context.industry}
Landing URL: ${context.landing_url || 'none'}

Creative:
- Headline: "${safeCreative.headline}"
- Body: "${safeCreative.body}"
- CTA: ${safeCreative.cta}
- Image URL: ${safeCreative.image_url}

Check for common violations:
- Personal attributes (mentioning user's race, religion, health, etc.)
- Misleading claims ("guaranteed", "100% effective", etc.)
- Sensational language or clickbait
- Restricted categories (gambling, alcohol, weight loss, financial promises)
- Prohibited products (drugs, weapons, adult content)
- Trademark/copyright issues
- Grammatical errors that look unprofessional
- ALL CAPS or excessive punctuation
- Unsupported superlatives

Return JSON:
{
  "passes": true|false,
  "risk_level": "none|low|medium|high",
  "violations": [
    { "category": "misleading_claim|restricted_category|...", "severity": "warning|rejection_likely", "description": "", "suggestion": "" }
  ],
  "cleaned_suggestion": {
    "headline": "Improved version that avoids the issues",
    "body": "Cleaned body text",
    "cta": "SAME_OR_BETTER"
  }
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 1500, apiKey });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);
    return {
      passes: parsed.passes ?? true,
      risk_level: parsed.risk_level || 'none',
      violations: parsed.violations || [],
      cleaned_suggestion: parsed.cleaned_suggestion,
      tokensUsed,
    };
  } catch {
    return {
      passes: true,
      risk_level: 'none',
      violations: [],
      tokensUsed,
    };
  }
}
