import { askClaude } from './client';
import { parseAIJson } from './parse-json';
import { sanitizeTenantForPrompt } from './sanitize';
import type { Tenant } from '../types';

function extractContext(
  research: Record<string, unknown>,
  competitor: Record<string, unknown>,
  brand: Record<string, unknown>
): string {
  const r = research as any;
  const c = competitor as any;
  const b = brand as any;

  const reviewIntel = r?.review_intelligence || r?.review_sentiment || {};

  const summary = {
    business_profile: r?.business_profile ?? {},
    target_audience: r?.target_audience ?? {},
    market_context: r?.market_context ?? {},
    content_audit: r?.content_audit ?? {},
    review_summary: {
      overall_sentiment: reviewIntel.overall_sentiment,
      positive_themes: (reviewIntel.positive_themes || []).slice(0, 5),
      negative_themes: (reviewIntel.negative_themes || []).slice(0, 5),
    },
    competitive_position: c?.tenant_position ?? {},
    market_map: c?.market_map ? {
      client_position: c.market_map.client_position,
      white_space: c.market_map.white_space,
    } : null,
    top_competitors: (c?.competitors ?? []).slice(0, 4).map((comp: any) => ({
      name: comp.name,
      price_positioning: comp.price_positioning,
      better_than_client: comp.better_than_client || [],
    })),
    best_in_class: c?.best_in_class ?? null,
    top_opportunities: (c?.opportunities ?? []).slice(0, 4),
    brand_identity: b?.brand_identity_assessment ?? {},
    brand_voice_current: b?.brand_voice_assessment ?? {},
    cbbe_total: b?.cbbe_scores?.total ?? {},
    reputation_score: b?.reputation_score?.total ?? b?.online_reputation_score?.score ?? null,
    swot: b?.swot ?? {},
    key_findings: (b?.key_findings ?? []).slice(0, 6),
    priority_actions: (b?.priority_actions ?? []).slice(0, 5),
    social_audit_summary: Object.entries(b?.social_media_audit?.platforms ?? {}).reduce(
      (acc: any, [platform, data]: [string, any]) => {
        if (data?.content_quality_score || data?.biggest_gap) {
          acc[platform] = {
            quality_score: data.content_quality_score,
            biggest_gap: data.biggest_gap,
          };
        }
        return acc;
      },
      {}
    ),
  };

  return JSON.stringify(summary, null, 2);
}

export async function runStrategyAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>,
  competitorData: Record<string, unknown>,
  brandAudit: Record<string, unknown>,
  apiKey?: string
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  let totalTokens = 0;
  const t = sanitizeTenantForPrompt(tenant);
  const ctx = extractContext(researchData, competitorData, brandAudit);
  const lang = tenant.primary_language === 'ka' ? 'Georgian' : tenant.primary_language === 'ru' ? 'Russian' : 'English';

  const base = `Business: ${t.name} | Industry: ${t.industry}${t.sub_category ? ` (${t.sub_category})` : ''} | City: ${t.city}${t.neighborhood ? `, ${t.neighborhood}` : ''}
Price Positioning: ${t.price_positioning || 'unknown'} | Primary Goal: ${t.marketing_goal || 'not specified'}
USP: ${t.usp || 'not provided'}
Channels: ${tenant.channels.join(', ')} | Posts/week: ${tenant.posts_per_week} | Content language: ${lang}

Context:
${ctx}`;

  const sys = `You are a social media strategy consultant. Return ONLY valid JSON — no markdown, no code fences.`;

  // Call 1: Strategic Foundation
  const { text: t1, tokensUsed: tk1 } = await askClaude(sys,
    `${base}

Generate JSON. Be concise: max 1 sentence per text field except positioning_statement.
{
  "strategic_framework": {
    "positioning_statement": "For [target audience], [brand name] is the [category] that [key benefit] because [reason to believe].",
    "brand_promise": "",
    "vision": "",
    "mission": "",
    "strategic_pillars": [
      { "name": "", "description": "", "kpis": [""], "content_examples": [""] }
    ],
    "quarterly_goals": [{ "quarter": "Q3 2026", "goals": [""] }]
  }
}`,
    { maxTokens: 4096, apiKey });
  totalTokens += tk1;

  // Call 2: Audience Personas (new)
  const { text: t2, tokensUsed: tk2 } = await askClaude(sys,
    `${base}

Generate 2-3 audience personas. Use ${lang} for persona names if appropriate. Be specific to this business and city.
{
  "audience_personas": [
    {
      "name": "",
      "demographic_snapshot": "",
      "motivations": [],
      "pain_points": [],
      "social_media_behavior": {
        "platforms_used": [],
        "content_types_preferred": [],
        "active_time_of_day": ""
      },
      "what_they_need_to_hear": "",
      "resonant_tone": ""
    }
  ]
}`,
    { maxTokens: 4096, apiKey });
  totalTokens += tk2;

  // Call 3: Channel Strategy + Messaging + Visual Direction
  const { text: t3, tokensUsed: tk3 } = await askClaude(sys,
    `${base}

Generate JSON. For channels, only include the ones listed above. Use ${lang} for example text fields.
{
  "channel_strategy": {
    "channels": {
      "CHANNEL_NAME": {
        "role": "awareness|engagement|conversion|retention",
        "primary_audience": "",
        "content_formats": [],
        "posting_frequency": "",
        "best_posting_times": [],
        "paid_organic_balance": ""
      }
    },
    "content_mix": [{ "type": "", "percentage": 0, "description": "" }]
  },
  "messaging_strategy": {
    "brand_voice": { "tone": "", "personality": "", "do": [""], "dont": [""] },
    "content_pillars": [{ "name": "", "percentage": 0, "description": "", "example_topics": [""] }],
    "hashtag_strategy": { "branded": [""], "industry": [""], "local": [""] },
    "headline_formulas": [""],
    "cta_bank": [""]
  },
  "visual_direction": {
    "photography_style": "",
    "graphic_style": "",
    "color_application_guidelines": "",
    "stop_doing_visually": []
  }
}`,
    { maxTokens: 6144, apiKey });
  totalTokens += tk3;

  // Call 4: 3-Month Action Plan
  const { text: t4, tokensUsed: tk4 } = await askClaude(sys,
    `${base}

Generate a 3-month action plan. 3-5 tasks per week. Each task must have a specific owner.
{
  "action_plan": {
    "month_1": [
      { "week": 1, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] },
      { "week": 2, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] },
      { "week": 3, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] },
      { "week": 4, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] }
    ],
    "month_2": [
      { "week": 1, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] },
      { "week": 2, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] },
      { "week": 3, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] },
      { "week": 4, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] }
    ],
    "month_3": [
      { "week": 1, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] },
      { "week": 2, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] },
      { "week": 3, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] },
      { "week": 4, "tasks": [{ "task": "", "owner": "Tea|client|designer|external" }] }
    ]
  }
}`,
    { maxTokens: 4096, apiKey });
  totalTokens += tk4;

  // Call 5: Video Ideas + Innovations
  const { text: t5, tokensUsed: tk5 } = await askClaude(sys,
    `${base}
Video ideas needed: ${tenant.video_ideas_per_month} per month. Use ${lang} for all text content in videos.
Include at least one zero-budget and one paid innovation.

Generate JSON:
{
  "video_ideas": [
    {
      "concept": "",
      "scenario": "",
      "platform": "tiktok|instagram|facebook",
      "duration": "15s|30s|60s",
      "texts_on_screen": [""],
      "call_to_action": "",
      "audio_direction": "",
      "production_difficulty": "easy|medium|requires crew",
      "expected_impact": "awareness|engagement|conversion"
    }
  ],
  "disruptive_innovations": [
    {
      "idea": "",
      "description": "",
      "cost": "low|medium|high",
      "budget_required": "zero|low|medium|high",
      "impact": "high|medium"
    }
  ]
}`,
    { maxTokens: 4096, apiKey });
  totalTokens += tk5;

  const parts = [t1, t2, t3, t4, t5].map((text, i) => {
    const r = parseAIJson(text);
    if (!r.success) console.error(`[strategy-agent] Call ${i + 1} parse failed. First 300:`, text?.slice(0, 300));
    return r.success ? r.parsed : {};
  });

  const merged = Object.assign({}, ...parts);

  if (Object.keys(merged).length === 0) {
    console.error('[strategy-agent] All parts empty.');
    return { data: { parse_error: true, raw_text1: t1?.slice(0, 1000) }, tokensUsed: totalTokens };
  }

  return { data: merged, tokensUsed: totalTokens };
}
