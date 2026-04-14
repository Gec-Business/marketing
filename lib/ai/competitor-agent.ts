import { askClaude } from './client';
import { sanitizeTenantForPrompt } from './sanitize';
import type { Tenant } from '../types';

export async function runCompetitorAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>,
  apiKey?: string
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  const safe = sanitizeTenantForPrompt(tenant);

  const systemPrompt = `You are a competitive analysis agent for social media marketing. Analyze the competitive landscape for the given business. Use your knowledge of the ${safe.city} market in ${safe.country}. Return ONLY valid JSON — no markdown, no code fences.`;

  const researchContext = (researchData as any).parse_error
    ? `Research data was not fully parsed. Raw summary available but may be incomplete.`
    : `Research data:\n${JSON.stringify(researchData, null, 2)}`;

  const userPrompt = `Analyze competitors for:

Business: ${safe.name}
Industry: ${safe.industry}
City: ${safe.city}, ${safe.country}

${researchContext}

Generate JSON:
{
  "competitors": [
    {
      "name": "",
      "type": "chain|single|franchise|premium|budget",
      "estimated_branches": 0,
      "estimated_rating": null,
      "price_positioning": "budget|mid|premium",
      "social_media_presence": { "facebook": "active|inactive|unknown", "instagram": "", "tiktok": "", "linkedin": "" },
      "strengths": [],
      "weaknesses": [],
      "geographic_overlap": "high|medium|low"
    }
  ],
  "market_segments": [
    { "name": "", "price_range": "", "estimated_share": "", "key_players": [] }
  ],
  "tenant_position": {
    "segment": "",
    "rank_estimate": 0,
    "geographic_advantage": "",
    "differentiation_gaps": [],
    "competitive_advantages": []
  },
  "competitive_threats": [
    { "threat": "", "probability": "low|moderate|high", "impact": "low|medium|high" }
  ],
  "opportunities": []
}

Include 8-12 competitors.`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 6144, apiKey });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return { data: JSON.parse(cleaned), tokensUsed };
  } catch {
    return { data: { raw_text: text, parse_error: true }, tokensUsed };
  }
}
