import { askClaude } from '../client';
import { sanitizeTenantForPrompt, sanitizeForPrompt } from '../sanitize';
import type { Tenant, CampaignObjective } from '../../types';

/**
 * Suggests 3 audience configurations (broad / mid / narrow) for a Meta or LinkedIn ad campaign.
 * Used during the campaign creation wizard.
 */
export async function suggestAudiences(
  tenant: Tenant,
  objective: CampaignObjective,
  apiKey?: string
): Promise<{
  audiences: Array<{
    name: string;
    breadth: 'broad' | 'mid' | 'narrow';
    description: string;
    geo_locations: { countries: string[]; cities?: { name: string; radius_km: number }[] };
    age_min: number;
    age_max: number;
    genders: 'all' | 'male' | 'female';
    interests: string[];
    behaviors: string[];
    estimated_reach: string;
    rationale: string;
  }>;
  tokensUsed: number;
}> {
  const safe = sanitizeTenantForPrompt(tenant);

  const systemPrompt = `You are an expert paid social media strategist. Suggest target audiences for ad campaigns. Return ONLY valid JSON — no markdown, no code fences.`;

  const userPrompt = `Suggest 3 target audiences for this ad campaign:

Business: ${safe.name}
Industry: ${safe.industry}
City: ${safe.city}, ${safe.country}
Description: ${safe.description}

Campaign objective: ${objective}

Tenant onboarding data (sanitized):
${sanitizeForPrompt(JSON.stringify(tenant.onboarding_data || {}), 2000)}

Provide 3 audiences:
1. BROAD — wide reach, lower precision
2. MID — balanced
3. NARROW — high precision, smaller size

Return JSON:
{
  "audiences": [
    {
      "name": "Descriptive audience name",
      "breadth": "broad|mid|narrow",
      "description": "1-sentence description",
      "geo_locations": { "countries": ["GE"], "cities": [{"name": "Tbilisi", "radius_km": 25}] },
      "age_min": 18,
      "age_max": 65,
      "genders": "all|male|female",
      "interests": ["Coffee", "Cafés", "Local food"],
      "behaviors": [],
      "estimated_reach": "100K-500K",
      "rationale": "Why this audience for this objective"
    }
  ]
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 3000, apiKey });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);
    return { audiences: parsed.audiences || [], tokensUsed };
  } catch {
    return { audiences: [], tokensUsed };
  }
}
