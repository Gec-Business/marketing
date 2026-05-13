import { askClaude } from './client';
import { sanitizeTenantForPrompt } from './sanitize';
import type { Tenant } from '../types';

export async function runCompetitorAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>,
  apiKey?: string
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  const safe = sanitizeTenantForPrompt(tenant);
  const onboarding = (tenant.onboarding_data || {}) as Record<string, unknown>;

  const systemPrompt = `You are a competitive analysis agent for social media marketing. Analyze the competitive landscape for the given business. Use your knowledge of the ${safe.city} market in ${safe.country}. Return ONLY valid JSON — no markdown, no code fences.`;

  const researchContext = (researchData as any).parse_error
    ? `Research data was not fully parsed.`
    : `Research data:\n${JSON.stringify(researchData, null, 2)}`;

  const clientCompetitors = onboarding.client_competitors
    ? `\nClient's own known competitors: ${onboarding.client_competitors}`
    : '';

  const userPrompt = `Analyze competitors for:

Business: ${safe.name}
Industry: ${safe.industry}${safe.sub_category ? ` — ${safe.sub_category}` : ''}
City: ${safe.city}${safe.neighborhood ? `, ${safe.neighborhood}` : ''}, ${safe.country}
Price Positioning: ${safe.price_positioning || 'unknown'}
USP: ${safe.usp || 'not provided'}
Primary Goal: ${safe.marketing_goal || 'not specified'}${clientCompetitors}

${researchContext}

Generate JSON with 8-12 competitors. For better_than_client and worse_than_client, compare specifically against THIS client's stated positioning and USP. For social_media_presence, estimate per-platform detail based on your knowledge of these businesses.

{
  "competitors": [
    {
      "name": "",
      "type": "chain|single|franchise|premium|budget|niche",
      "estimated_branches": 0,
      "estimated_rating": null,
      "price_positioning": "budget|mid|premium",
      "social_media_presence": {
        "facebook": { "status": "active|inactive|unknown", "followers_estimate": null, "posts_per_week": null, "top_content_format": "", "engagement_level": "high|medium|low" },
        "instagram": { "status": "active|inactive|unknown", "followers_estimate": null, "posts_per_week": null, "top_content_format": "", "engagement_level": "high|medium|low" },
        "tiktok": { "status": "active|inactive|unknown", "followers_estimate": null, "posts_per_week": null, "top_content_format": "", "engagement_level": "high|medium|low" },
        "linkedin": { "status": "active|inactive|unknown", "followers_estimate": null, "posts_per_week": null, "top_content_format": "", "engagement_level": "high|medium|low" }
      },
      "strengths": [],
      "weaknesses": [],
      "better_than_client": [],
      "worse_than_client": [],
      "geographic_overlap": "high|medium|low"
    }
  ],
  "market_segments": [
    { "name": "", "price_range": "", "estimated_share": "", "key_players": [] }
  ],
  "market_map": {
    "description": "",
    "price_tiers": [{ "tier": "budget|mid|premium|luxury", "players": [] }],
    "client_position": "",
    "white_space": []
  },
  "tenant_position": {
    "segment": "",
    "rank_estimate": 0,
    "geographic_advantage": "",
    "differentiation_gaps": [],
    "competitive_advantages": []
  },
  "competitive_threats": [
    { "threat": "", "probability": "low|moderate|high", "impact": "low|medium|high", "mitigation": "" }
  ],
  "opportunities": [
    { "description": "", "type": "audience|content_format|channel|seasonal" }
  ],
  "best_in_class": {
    "name": "",
    "why_they_win": "",
    "top_3_tactics_to_adapt": []
  }
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 8192, apiKey });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return { data: JSON.parse(cleaned), tokensUsed };
  } catch {
    return { data: { raw_text: text, parse_error: true }, tokensUsed };
  }
}
