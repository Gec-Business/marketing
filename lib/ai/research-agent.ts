import { askClaude } from './client';
import { sanitizeTenantForPrompt } from './sanitize';
import type { Tenant } from '../types';

interface MapsReview {
  author_name?: string;
  rating?: number;
  text?: string;
  time?: number;
  owner_response?: { text?: string; time?: number };
}

interface MapsData {
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  reviews?: MapsReview[];
  [key: string]: unknown;
}

function extractVerbatimReviews(maps: MapsData | null) {
  if (!maps?.reviews?.length) return [];
  return maps.reviews.slice(0, 5).map((r) => ({
    text: r.text || '',
    rating: r.rating ?? null,
    date: r.time ? new Date(r.time * 1000).toISOString().split('T')[0] : null,
    has_owner_response: !!r.owner_response?.text,
  }));
}

function calculateReviewVelocity(maps: MapsData | null) {
  if (!maps?.reviews?.length) return { last_30_days: 0, last_90_days: 0 };
  const now = Date.now() / 1000;
  const last30 = maps.reviews.filter((r) => r.time && now - r.time <= 30 * 86400).length;
  const last90 = maps.reviews.filter((r) => r.time && now - r.time <= 90 * 86400).length;
  return { last_30_days: last30, last_90_days: last90 };
}

function calculateOwnerResponseRate(maps: MapsData | null): number {
  if (!maps?.reviews?.length) return 0;
  const withResponse = maps.reviews.filter((r) => !!r.owner_response?.text).length;
  return Math.round((withResponse / maps.reviews.length) * 100);
}

function assessOwnerResponseQuality(maps: MapsData | null): 'none' | 'generic' | 'personalized' {
  if (!maps?.reviews?.length) return 'none';
  const responses = maps.reviews.map((r) => r.owner_response?.text || '').filter(Boolean);
  if (responses.length === 0) return 'none';
  const avgLen = responses.reduce((sum, r) => sum + r.length, 0) / responses.length;
  const unique = new Set(responses).size;
  if (avgLen < 60 || unique === 1) return 'generic';
  return 'personalized';
}

export async function runResearchAgent(tenant: Tenant, apiKey?: string): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  let totalTokens = 0;
  let googleMapsData: MapsData | null = null;

  if (tenant.google_maps_url && process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const placeId = extractPlaceId(tenant.google_maps_url);
      if (placeId) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,formatted_address,opening_hours,reviews,price_level,types,website,formatted_phone_number&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        if (!res.ok) throw new Error(`Google Maps API error: ${res.status}`);
        const json = await res.json();
        if (json.result) googleMapsData = json.result as MapsData;
      }
    } catch (e) {
      console.error('Google Maps API error:', e);
    }
  }

  // Pre-compute from Maps data — these are facts, not AI inferences
  const verbatimReviews = extractVerbatimReviews(googleMapsData);
  const reviewVelocity = calculateReviewVelocity(googleMapsData);
  const ownerResponseRate = calculateOwnerResponseRate(googleMapsData);
  const ownerResponseQuality = assessOwnerResponseQuality(googleMapsData);

  const systemPrompt = `You are a marketing research agent. Analyze the business information provided and generate a comprehensive research profile. Return ONLY valid JSON — no markdown, no code fences.`;

  const safe = sanitizeTenantForPrompt(tenant);
  const onboarding = (tenant.onboarding_data || {}) as Record<string, unknown>;

  const userPrompt = `Analyze this business for a social media marketing strategy:

Business: ${safe.name}
Industry: ${safe.industry}${safe.sub_category ? ` — ${safe.sub_category}` : ''}
City: ${safe.city}${safe.neighborhood ? `, ${safe.neighborhood}` : ''}, ${safe.country}
Price Positioning: ${safe.price_positioning || 'unknown'}
USP: ${safe.usp || 'not provided'}
Primary Marketing Goal: ${safe.marketing_goal || 'not specified'}
Website: ${safe.website || 'none'}
Delivery Platforms: ${safe.delivery_platforms?.length ? safe.delivery_platforms.join(', ') : 'none'}

Social Media Links:
${JSON.stringify(tenant.social_links, null, 2)}

Google Maps Data:
${googleMapsData ? JSON.stringify(googleMapsData, null, 2) : 'Not available'}

Verbatim Reviews (from Google Maps):
${verbatimReviews.length ? JSON.stringify(verbatimReviews, null, 2) : 'Not available'}

Onboarding Answers:
${JSON.stringify(onboarding, null, 2)}

Generate a JSON research profile. For review_intelligence, DO NOT invent velocity or response_rate — those fields will be overwritten by the system. Focus on synthesizing themes and sentiment from the verbatim reviews provided.

{
  "business_profile": {
    "name": "",
    "industry": "",
    "sub_category": "",
    "city": "",
    "neighborhood": "",
    "branches": [],
    "operating_hours": { "weekday": "", "weekend": "" },
    "contact": "",
    "maturity_stage": "startup|growing|established|mature",
    "price_positioning": ""
  },
  "online_presence": {
    "website_assessment": {
      "status": "exists|not_found",
      "mobile_friendly": null,
      "has_cta": null,
      "has_blog": null,
      "has_booking": null
    },
    "gbp_assessment": {
      "claimed": "yes|no|unknown",
      "posts_active": null,
      "qa_filled": null
    },
    "social_media": {
      "facebook": { "url": "", "follower_estimate": null, "last_post_date": "", "posts_per_week": null, "content_types_observed": [] },
      "instagram": { "url": "", "follower_estimate": null, "last_post_date": "", "posts_per_week": null, "content_types_observed": [] },
      "linkedin": { "url": "", "follower_estimate": null, "last_post_date": "", "posts_per_week": null, "content_types_observed": [] },
      "tiktok": { "url": "", "follower_estimate": null, "last_post_date": "", "posts_per_week": null, "content_types_observed": [] }
    },
    "delivery_platforms": []
  },
  "ratings": {
    "google_maps": { "score": null, "total_reviews": null, "price_level": "" }
  },
  "review_intelligence": {
    "owner_response_rate": 0,
    "owner_response_quality": "none|generic|personalized",
    "verbatim_reviews": [],
    "review_velocity": { "last_30_days": 0, "last_90_days": 0 },
    "positive_themes": [],
    "negative_themes": [],
    "overall_sentiment": "positive|mixed|negative"
  },
  "target_audience": {
    "demographics": "",
    "psychographics": "",
    "behaviors": "",
    "jobs_to_be_done": []
  },
  "content_audit": {
    "visual_identity_consistency": "strong|inconsistent|absent",
    "estimated_posting_frequency": "",
    "content_types_observed": [],
    "best_performing_formats": []
  },
  "market_context": {
    "city": "",
    "sector": "",
    "market_size_estimate": "",
    "growth_trend": "",
    "seasonality_patterns": ""
  },
  "initial_observations": []
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 4096, apiKey });
  totalTokens += tokensUsed;

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);

    // Overwrite review_intelligence fields with pre-computed facts
    if (!parsed.review_intelligence) parsed.review_intelligence = {};
    parsed.review_intelligence.verbatim_reviews = verbatimReviews;
    parsed.review_intelligence.review_velocity = reviewVelocity;
    parsed.review_intelligence.owner_response_rate = ownerResponseRate;
    parsed.review_intelligence.owner_response_quality = ownerResponseQuality;

    return { data: parsed, tokensUsed: totalTokens };
  } catch {
    return { data: { raw_text: text, parse_error: true }, tokensUsed: totalTokens };
  }
}

function extractPlaceId(url: string): string | null {
  const patterns = [
    /place_id[=:]([A-Za-z0-9_-]+)/,
    /!1s(0x[0-9a-f]+:[0-9a-fx]+)/,
    /ftid=(0x[0-9a-f]+:[0-9a-fx]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
