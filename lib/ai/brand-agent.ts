import { askClaude } from './client';
import { sanitizeTenantForPrompt } from './sanitize';
import type { Tenant } from '../types';

export async function runBrandAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>,
  competitorData: Record<string, unknown>,
  apiKey?: string
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  const systemPrompt = `You are a brand audit agent. Perform a comprehensive brand analysis using established frameworks (Keller CBBE, Kapferer Prism, SWOT). Score each dimension honestly. Return ONLY valid JSON — no markdown, no code fences.`;

  const safe = sanitizeTenantForPrompt(tenant);

  const userPrompt = `Brand audit for:

Business: ${safe.name}
Industry: ${safe.industry}
City: ${safe.city}

Research: ${JSON.stringify(researchData, null, 2)}
Competitors: ${JSON.stringify(competitorData, null, 2)}

Generate JSON:
{
  "cbbe_scores": {
    "identity": { "score": 0, "max": 50, "status": "critical|weak|moderate|strong", "notes": "" },
    "meaning": { "score": 0, "max": 60, "status": "", "notes": "" },
    "response": { "score": 0, "max": 50, "status": "", "notes": "" },
    "resonance": { "score": 0, "max": 30, "status": "", "notes": "" },
    "total": { "score": 0, "max": 190, "percentage": 0 }
  },
  "kapferer_prism": {
    "physique": "", "personality": "", "culture": "",
    "relationship": "", "reflection": "", "self_image": ""
  },
  "swot": {
    "strengths": [], "weaknesses": [],
    "opportunities": [], "threats": []
  },
  "online_reputation_score": { "score": 0, "max": 100, "breakdown": {} },
  "social_media_audit": {
    "platforms": {},
    "content_quality_score": 0,
    "posting_consistency": ""
  },
  "key_findings": [],
  "priority_actions": [
    { "action": "", "timeframe": "0-3 months", "impact": "high|medium|low", "effort": "high|medium|low" }
  ]
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 6144, apiKey });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return { data: JSON.parse(cleaned), tokensUsed };
  } catch {
    return { data: { raw_text: text, parse_error: true }, tokensUsed };
  }
}
