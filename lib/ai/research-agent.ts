import { askClaude } from './client';
import type { Tenant } from '../types';

export async function runResearchAgent(tenant: Tenant): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  let totalTokens = 0;
  let googleMapsData = null;

  if (tenant.google_maps_url && process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const placeId = extractPlaceId(tenant.google_maps_url);
      if (placeId) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,formatted_address,opening_hours,reviews,price_level,types,website,formatted_phone_number&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        const data = await res.json();
        if (data.result) googleMapsData = data.result;
      }
    } catch (e) {
      console.error('Google Maps API error:', e);
    }
  }

  const systemPrompt = `You are a marketing research agent. Analyze the business information provided and generate a comprehensive research profile. Return ONLY valid JSON — no markdown, no code fences.`;

  const userPrompt = `Analyze this business for a social media marketing strategy:

Business: ${tenant.name}
Industry: ${tenant.industry}
City: ${tenant.city}, ${tenant.country}
Website: ${tenant.website || 'none'}
Description: ${tenant.description || 'none'}

Social Media Presence:
${JSON.stringify(tenant.social_links, null, 2)}

Google Maps Data:
${googleMapsData ? JSON.stringify(googleMapsData, null, 2) : 'Not available'}

Onboarding Data:
${JSON.stringify(tenant.onboarding_data, null, 2)}

Generate a JSON research profile:
{
  "business_profile": { "name": "", "industry": "", "city": "", "branches": [], "operating_hours": "", "contact": "" },
  "online_presence": { "website_status": "", "social_media": {}, "delivery_platforms": [] },
  "ratings": {},
  "review_sentiment": { "positive_themes": [], "negative_themes": [], "overall_sentiment": "" },
  "target_audience": { "demographics": "", "psychographics": "", "behaviors": "" },
  "market_context": { "city": "", "sector": "", "market_size_estimate": "", "growth_trend": "" },
  "initial_observations": []
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 4096 });
  totalTokens += tokensUsed;

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return { data: JSON.parse(cleaned), tokensUsed: totalTokens };
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
