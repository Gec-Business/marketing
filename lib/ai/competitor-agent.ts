import { askClaude } from './client';
import type { Tenant } from '../types';

export async function runCompetitorAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  const systemPrompt = `You are a competitive analysis agent for social media marketing. Analyze the competitive landscape for the given business. Use your knowledge of the ${tenant.city} market in ${tenant.country}. Return ONLY valid JSON — no markdown, no code fences.`;

  const userPrompt = `Analyze competitors for:

Business: ${tenant.name}
Industry: ${tenant.industry}
City: ${tenant.city}, ${tenant.country}

Research data:
${JSON.stringify(researchData, null, 2)}

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

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 6144 });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return { data: JSON.parse(cleaned), tokensUsed };
  } catch {
    return { data: { raw_text: text, parse_error: true }, tokensUsed };
  }
}
