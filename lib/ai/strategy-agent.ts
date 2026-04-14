import { askClaude } from './client';
import { sanitizeTenantForPrompt } from './sanitize';
import type { Tenant } from '../types';

export async function runStrategyAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>,
  competitorData: Record<string, unknown>,
  brandAudit: Record<string, unknown>,
  apiKey?: string
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  let totalTokens = 0;

  const { text: text1, tokensUsed: t1 } = await askClaude(
    `You are a social media strategy consultant. Generate a strategic framework and channel strategy. Return ONLY valid JSON — no markdown, no code fences.`,
    `Business: ${sanitizeTenantForPrompt(tenant).name} | Industry: ${sanitizeTenantForPrompt(tenant).industry} | City: ${sanitizeTenantForPrompt(tenant).city}
Channels: ${tenant.channels.join(', ')}
Posting: ${tenant.posts_per_week} posts/week, ${tenant.video_ideas_per_month} video ideas/month
Language: ${tenant.primary_language} primary, ${tenant.secondary_language} secondary

Research: ${JSON.stringify(researchData, null, 2)}
Competitors: ${JSON.stringify(competitorData, null, 2)}
Brand Audit: ${JSON.stringify(brandAudit, null, 2)}

Generate JSON:
{
  "strategic_framework": {
    "vision": "",
    "mission": "",
    "strategic_pillars": [{ "name": "", "description": "", "kpis": [] }],
    "quarterly_goals": [{ "quarter": "Q2 2026", "goals": [] }]
  },
  "channel_strategy": {
    "channels": {},
    "content_mix": [{ "type": "", "percentage": 0, "description": "" }]
  }
}`,
    { maxTokens: 8192, apiKey }
  );
  totalTokens += t1;

  const { text: text2, tokensUsed: t2 } = await askClaude(
    `You are a social media strategy consultant. Generate messaging strategy, action plan, and video content ideas. Use ${tenant.primary_language === 'ka' ? 'Georgian' : 'English'} for example copy. Return ONLY valid JSON — no markdown, no code fences.`,
    `Business: ${tenant.name} | Industry: ${tenant.industry}
Channels: ${tenant.channels.join(', ')}
Video ideas needed: ${tenant.video_ideas_per_month} per month

Previous strategy context:
${text1}

Generate JSON:
{
  "messaging_strategy": {
    "brand_voice": { "tone": "", "personality": "", "do": [], "dont": [] },
    "content_pillars": [{ "name": "", "percentage": 0, "description": "", "example_topics": [] }],
    "hashtag_strategy": { "branded": [], "industry": [], "local": [] }
  },
  "action_plan": {
    "month_1": [{ "week": 1, "tasks": [] }],
    "month_2": [{ "week": 1, "tasks": [] }],
    "month_3": [{ "week": 1, "tasks": [] }]
  },
  "video_ideas": [
    { "concept": "", "scenario": "", "platform": "tiktok|instagram|facebook", "duration": "15s|30s|60s", "texts_on_screen": [], "call_to_action": "" }
  ],
  "disruptive_innovations": [
    { "idea": "", "cost": "low|medium|high", "impact": "high|medium", "description": "" }
  ]
}`,
    { maxTokens: 8192, apiKey }
  );
  totalTokens += t2;

  try {
    const clean1 = text1.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const clean2 = text2.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const part1 = JSON.parse(clean1);
    const part2 = JSON.parse(clean2);
    return { data: { ...part1, ...part2 }, tokensUsed: totalTokens };
  } catch {
    return { data: { part1: text1, part2: text2, parse_error: true }, tokensUsed: totalTokens };
  }
}
