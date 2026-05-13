import { askClaude } from './client';
import { sanitizeTenantForPrompt } from './sanitize';
import type { Tenant } from '../types';

function cbbMaturityLabel(percentage: number): string {
  if (percentage < 26) return 'Pre-brand Stage';
  if (percentage < 46) return 'Development Stage';
  if (percentage < 66) return 'Building Stage';
  if (percentage < 81) return 'Established Brand';
  return 'Brand Leader';
}

function distillContext(research: Record<string, unknown>, competitor: Record<string, unknown>) {
  const r = research as any;
  const c = competitor as any;

  // Support both old and new research structure
  const reviewIntel = r.review_intelligence || r.review_sentiment || {};

  return {
    business_profile: r.business_profile || {},
    website_assessment: r.online_presence?.website_assessment || { status: r.online_presence?.website_status || 'unknown' },
    gbp_assessment: r.online_presence?.gbp_assessment || {},
    social_media: r.online_presence?.social_media || {},
    ratings: r.ratings || {},
    review_summary: {
      overall_sentiment: reviewIntel.overall_sentiment,
      positive_themes: reviewIntel.positive_themes || [],
      negative_themes: reviewIntel.negative_themes || [],
      owner_response_rate: reviewIntel.owner_response_rate,
      owner_response_quality: reviewIntel.owner_response_quality,
      sample_reviews: (reviewIntel.verbatim_reviews || []).slice(0, 3),
    },
    target_audience: r.target_audience || {},
    content_audit: r.content_audit || {},
    market_position: c.tenant_position || {},
    market_map_position: c.market_map?.client_position || '',
    top_competitors: (c.competitors || []).slice(0, 5).map((comp: any) => ({
      name: comp.name,
      price_positioning: comp.price_positioning,
      social_active_on: Object.entries(comp.social_media_presence || {})
        .filter(([, v]: [string, any]) => (typeof v === 'object' ? v.status : v) === 'active')
        .map(([platform, v]: [string, any]) => {
          if (typeof v === 'object') return `${platform}(${v.followers_estimate || '?'} followers, ${v.engagement_level || '?'} eng)`;
          return platform;
        }),
    })),
    best_in_class: c.best_in_class || null,
  };
}

export async function runBrandAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>,
  competitorData: Record<string, unknown>,
  apiKey?: string
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  const systemPrompt = `You are a brand audit agent. Perform a comprehensive brand analysis using established frameworks (Keller CBBE, Kapferer Prism, SWOT). Score each dimension honestly based on the evidence. Return ONLY valid JSON — no markdown, no code fences.`;

  const safe = sanitizeTenantForPrompt(tenant);
  const ctx = distillContext(researchData, competitorData);

  const userPrompt = `Brand audit for:

Business: ${safe.name}
Industry: ${safe.industry}${safe.sub_category ? ` — ${safe.sub_category}` : ''}
City: ${safe.city}${safe.neighborhood ? `, ${safe.neighborhood}` : ''}, ${safe.country}
Price Positioning: ${safe.price_positioning || 'unknown'}
USP: ${safe.usp || 'not provided'}
Primary Goal: ${safe.marketing_goal || 'not specified'}

Context:
${JSON.stringify(ctx, null, 2)}

Generate JSON:
{
  "brand_identity_assessment": {
    "visual_identity_exists": null,
    "applied_consistently": null,
    "matches_positioning": null,
    "brand_name_assessment": {
      "clarity": "high|medium|low",
      "memorability": "high|medium|low",
      "local_relevance": "high|medium|low"
    }
  },
  "cbbe_scores": {
    "identity": { "score": 0, "max": 50, "status": "critical|weak|moderate|strong", "notes": "" },
    "meaning": { "score": 0, "max": 60, "status": "critical|weak|moderate|strong", "notes": "" },
    "response": { "score": 0, "max": 50, "status": "critical|weak|moderate|strong", "notes": "" },
    "resonance": { "score": 0, "max": 30, "status": "critical|weak|moderate|strong", "notes": "" },
    "total": { "score": 0, "max": 190, "percentage": 0 }
  },
  "kapferer_prism": {
    "physique": { "description": "", "status": "strong|weak|absent" },
    "personality": { "description": "", "status": "strong|weak|absent" },
    "culture": { "description": "", "status": "strong|weak|absent" },
    "relationship": { "description": "", "status": "strong|weak|absent" },
    "reflection": { "description": "", "status": "strong|weak|absent" },
    "self_image": { "description": "", "status": "strong|weak|absent" }
  },
  "swot": {
    "strengths": [],
    "weaknesses": [],
    "opportunities": [],
    "threats": []
  },
  "reputation_score": {
    "rating_quality": { "score": 0, "max": 30, "notes": "" },
    "review_volume": { "score": 0, "max": 20, "notes": "" },
    "social_proof": { "score": 0, "max": 25, "notes": "" },
    "search_visibility": { "score": 0, "max": 25, "notes": "" },
    "total": 0
  },
  "social_media_audit": {
    "platforms": {
      "facebook": { "follower_estimate": null, "posts_per_week": null, "content_types": [], "engagement_rate_estimate": "", "content_quality_score": 0, "posting_consistency": "", "biggest_gap": "" },
      "instagram": { "follower_estimate": null, "posts_per_week": null, "content_types": [], "engagement_rate_estimate": "", "content_quality_score": 0, "posting_consistency": "", "biggest_gap": "" },
      "linkedin": { "follower_estimate": null, "posts_per_week": null, "content_types": [], "engagement_rate_estimate": "", "content_quality_score": 0, "posting_consistency": "", "biggest_gap": "" },
      "tiktok": { "follower_estimate": null, "posts_per_week": null, "content_types": [], "engagement_rate_estimate": "", "content_quality_score": 0, "posting_consistency": "", "biggest_gap": "" }
    },
    "overall_content_quality_score": 0,
    "overall_posting_consistency": ""
  },
  "brand_voice_assessment": {
    "current_tone": "",
    "consistency_rating": "strong|inconsistent|absent",
    "intended_vs_actual_gap": ""
  },
  "key_findings": [],
  "priority_actions": [
    { "action": "", "timeframe": "immediate|0-1 month|1-3 months|3-6 months", "impact": "high|medium|low", "effort": "high|medium|low", "owner": "Tea|client|designer|external vendor" }
  ]
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 8192, apiKey });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);

    // Compute maturity_label from percentage — don't let Claude guess the label
    if (parsed.cbbe_scores?.total) {
      const pct = parsed.cbbe_scores.total.percentage
        ?? (parsed.cbbe_scores.total.score / parsed.cbbe_scores.total.max * 100);
      parsed.cbbe_scores.total.percentage = Math.round(pct);
      parsed.cbbe_scores.total.maturity_label = cbbMaturityLabel(pct);
    }

    // Compute reputation total from components if missing or wrong
    if (parsed.reputation_score) {
      const rs = parsed.reputation_score;
      const computed = (rs.rating_quality?.score || 0) + (rs.review_volume?.score || 0) +
        (rs.social_proof?.score || 0) + (rs.search_visibility?.score || 0);
      rs.total = computed;
    }

    return { data: parsed, tokensUsed };
  } catch {
    return { data: { raw_text: text, parse_error: true }, tokensUsed };
  }
}
