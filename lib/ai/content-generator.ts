import { askClaude } from './client';
import { sanitizeTenantForPrompt } from './sanitize';
import { parseAIJson } from './parse-json';
import { query } from '../db';
import type { Tenant, Assessment } from '../types';

const GEORGIAN_HOLIDAYS = [
  { month: 1,  day: 1,  name: "New Year's Day" },
  { month: 1,  day: 2,  name: "New Year's Day (cont.)" },
  { month: 1,  day: 7,  name: "Orthodox Christmas" },
  { month: 1,  day: 19, name: "Orthodox Epiphany" },
  { month: 3,  day: 3,  name: "Mother's Day" },
  { month: 3,  day: 8,  name: "International Women's Day" },
  { month: 4,  day: 9,  name: "National Unity Day" },
  { month: 5,  day: 9,  name: "Victory over Fascism / Europe Day" },
  { month: 5,  day: 12, name: "Saint Andrew the First-Called Day" },
  { month: 5,  day: 17, name: "Day of Family Purity and Respect for Parents" },
  { month: 5,  day: 26, name: "Independence Day" },
  { month: 8,  day: 28, name: "Saint Mary's Day" },
  { month: 10, day: 14, name: "Svetitskhoveli Cathedral Day" },
  { month: 11, day: 23, name: "Saint George's Day" },
];

function getUpcomingHolidays(weekStart: string, windowDays = 14): string[] {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + windowDays);
  const results: string[] = [];
  for (const year of [start.getFullYear(), start.getFullYear() + 1]) {
    for (const h of GEORGIAN_HOLIDAYS) {
      const d = new Date(year, h.month - 1, h.day);
      if (d >= start && d <= end) {
        results.push(`${d.toISOString().slice(0, 10)} — ${h.name}`);
      }
    }
  }
  return results;
}

function buildApprovalExamples(posts: any[]): string {
  if (!posts.length) return '';
  const lines = posts.map((p, i) =>
    `Example ${i + 1} (${p.content_type}, ${(p.platforms || []).join('/')}):\n  Primary: ${(p.copy_primary || '').slice(0, 200)}\n  Hashtags: ${(p.hashtags || []).slice(0, 5).join(' ')}`
  );
  return `PREVIOUSLY APPROVED POSTS (match this tone and style):\n${lines.join('\n\n')}`;
}

function extractStrategyContext(strategy: any): string {
  if (!strategy || strategy.parse_error) return '';

  const sf = strategy.strategic_framework || {};
  const ms = strategy.messaging_strategy || {};
  const vd = strategy.visual_direction || {};
  const personas: any[] = strategy.audience_personas || [];
  const channelStrategy = strategy.channel_strategy || {};

  const lines: string[] = [];

  if (sf.positioning_statement) {
    lines.push(`POSITIONING: ${sf.positioning_statement}`);
  }

  const bv = ms.brand_voice || {};
  if (bv.tone || bv.personality) {
    lines.push(`BRAND VOICE: ${[bv.tone, bv.personality].filter(Boolean).join(', ')}`);
    if (bv.do?.length)   lines.push(`  Voice DO: ${bv.do.join(' | ')}`);
    if (bv.dont?.length) lines.push(`  Voice DON'T: ${bv.dont.join(' | ')}`);
  }

  const pillars = (ms.content_pillars || []).map((p: any) => `${p.name} (${p.percentage}%): ${p.description}`);
  if (pillars.length) lines.push(`CONTENT PILLARS:\n${pillars.join('\n')}`);

  const formulas = (ms.headline_formulas || []).slice(0, 5);
  if (formulas.length) lines.push(`HEADLINE FORMULAS:\n${formulas.join('\n')}`);

  const ctas = (ms.cta_bank || []).slice(0, 5);
  if (ctas.length) lines.push(`CTAS TO USE:\n${ctas.join('\n')}`);

  const hs = ms.hashtag_strategy || {};
  const allTags = [
    ...(hs.branded || []),
    ...(hs.industry || []).slice(0, 5),
    ...(hs.local || []).slice(0, 5),
  ].slice(0, 15);
  if (allTags.length) lines.push(`HASHTAGS: ${allTags.join(' ')}`);

  const personaSummaries = personas.slice(0, 2).map((p: any) =>
    `${p.name}: ${p.demographic_snapshot}. Needs: ${p.what_they_need_to_hear}. Tone: ${p.resonant_tone}`
  );
  if (personaSummaries.length) lines.push(`AUDIENCE PERSONAS:\n${personaSummaries.join('\n')}`);

  if (vd.photography_style || vd.graphic_style) {
    lines.push(`VISUAL STYLE: ${[vd.photography_style, vd.graphic_style].filter(Boolean).join('. ')}`);
    if (vd.color_application_guidelines) lines.push(`  Color use: ${vd.color_application_guidelines}`);
    if (vd.stop_doing_visually?.length)  lines.push(`  VISUAL DON'T: ${vd.stop_doing_visually.join(', ')}`);
  }

  const channels = channelStrategy.channels || {};
  const channelNotes = Object.entries(channels)
    .slice(0, 4)
    .map(([ch, cfg]: [string, any]) => `${ch}: ${cfg.role || ''} — formats: ${(cfg.content_formats || []).join(', ')}`);
  if (channelNotes.length) lines.push(`CHANNEL ROLES:\n${channelNotes.join('\n')}`);

  return lines.join('\n\n');
}

function buildAssetContext(assets: any[]): string {
  if (!assets.length) return '';
  const lines = assets.map(a =>
    `[${a.id}] category:${a.category} — ${a.alt_text || a.original_name || a.filename}${a.tags?.length ? ` (${a.tags.join(', ')})` : ''}`
  );
  return `AVAILABLE PHOTO ASSETS (use asset_id to reference a real photo instead of AI generation):\n${lines.join('\n')}`;
}

export async function generateContentBatch(
  tenant: Tenant,
  assessment: Assessment,
  count: number,
  weekStart: string,
  apiKey?: string
): Promise<{ posts: any[]; tokensUsed: number }> {
  const strategy = assessment.strategy_data || {};
  const strategyContext = extractStrategyContext(strategy);
  const vd = (strategy as any).visual_direction || {};
  const bc = (tenant as any).brand_config || {};

  const [assets, approvedPosts] = await Promise.all([
    query(
      'SELECT id, category, alt_text, original_name, filename, tags FROM assets WHERE tenant_id = $1 ORDER BY uploaded_at DESC',
      [tenant.id]
    ) as Promise<any[]>,
    query(
      `SELECT content_type, platforms, copy_primary, hashtags FROM posts WHERE tenant_id = $1 AND status = 'approved' ORDER BY updated_at DESC LIMIT 3`,
      [tenant.id]
    ) as Promise<any[]>,
  ]);
  const assetContext = buildAssetContext(assets);
  const approvalContext = buildApprovalExamples(approvedPosts);

  const upcomingHolidays = tenant.seasonal_posting
    ? getUpcomingHolidays(weekStart)
    : [];

  const lang = tenant.primary_language === 'ka' ? 'Georgian' : 'English';
  const secLang = tenant.secondary_language === 'ka' ? 'Georgian' : tenant.secondary_language === 'ru' ? 'Russian' : 'English';
  const safe = sanitizeTenantForPrompt(tenant);

  const visualInstructions = [
    vd.photography_style ? `Photography style: ${vd.photography_style}` : null,
    bc.photography_guidelines ? `Brandbook photography rules: ${bc.photography_guidelines}` : null,
    vd.graphic_style ? `Graphic style: ${vd.graphic_style}` : null,
    vd.stop_doing_visually?.length ? `DO NOT use: ${vd.stop_doing_visually.join(', ')}` : null,
    bc.dont_use?.length ? `Brandbook says avoid: ${bc.dont_use.slice(0, 4).join(', ')}` : null,
    'No text overlays in the scene — DALL-E renders text poorly.',
    'Be specific: describe composition, lighting, subject matter, mood.',
  ].filter(Boolean).join(' ');

  // Brandbook brand voice additions (complement strategy brand_voice)
  const brandbookVoice = [
    bc.tone_of_voice ? `Brandbook tone: ${bc.tone_of_voice}` : null,
    bc.do_use?.length ? `Brandbook says use: ${bc.do_use.slice(0, 4).join(', ')}` : null,
    bc.tagline ? `Official tagline: "${bc.tagline}"` : null,
    bc.brand_values?.length ? `Brand values: ${bc.brand_values.join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are a social media content creator. Generate ${count} posts. Primary language: ${lang}. Secondary language: ${secLang}. Return ONLY a valid JSON array — no markdown, no code fences.`;

  const userPrompt = `Generate ${count} social media posts for:

Business: ${safe.name}
Industry: ${safe.industry}${safe.sub_category ? ` — ${safe.sub_category}` : ''}
City: ${safe.city}${safe.neighborhood ? `, ${safe.neighborhood}` : ''}
Price positioning: ${safe.price_positioning || 'unknown'}
USP: ${safe.usp || 'not specified'}
Channels: ${tenant.channels.join(', ')}
Posts per week target: ${tenant.posts_per_week}
Week starting: ${weekStart}

--- STRATEGY ---
${strategyContext || 'No strategy data available — use industry best practices.'}
--- END STRATEGY ---

${brandbookVoice ? `--- BRANDBOOK ---\n${brandbookVoice}\n--- END BRANDBOOK ---\n` : ''}
${assetContext ? `--- ASSETS ---\n${assetContext}\n--- END ASSETS ---\n` : ''}
${approvalContext ? `--- APPROVED EXAMPLES ---\n${approvalContext}\n--- END APPROVED EXAMPLES ---\n` : ''}
${upcomingHolidays.length ? `--- UPCOMING GEORGIAN HOLIDAYS (in the next 14 days) ---\n${upcomingHolidays.join('\n')}\nCreate at least one post that connects the business to a relevant upcoming holiday. Keep it natural, not forced.\n--- END HOLIDAYS ---\n` : ''}

For each post, generate exactly this JSON shape:
{
  "content_type": "image_post" | "carousel" | "reel" | "video",
  "platforms": ["facebook", "instagram", ...],
  "copy_primary": "${lang} caption text",
  "copy_secondary": "${secLang} caption text",
  "platform_copies": {
    "facebook": { "primary": "...", "secondary": "..." },
    "instagram": { "primary": "...", "secondary": "..." }
  },
  "hashtags": ["#tag"],
  "asset_id": "UUID from ASSETS list or null — prefer real photos over AI generation when a good match exists",
  "visual_description": "Scene description for DALL-E — only used if asset_id is null. ${visualInstructions}",
  "video_idea": null,
  "suggested_date": "YYYY-MM-DD",
  "sort_order": 1
}

Rules:
- Follow content pillar percentages strictly when mixing post types
- Use headline formulas and CTAs from strategy
- Match brand voice DO/DON'T rules
- visual_description must match the visual style above — no generic stock photo descriptions
- For video/reel posts, fill video_idea: { "concept": "", "scenario": "", "texts": ["overlay 1"], "duration": "15s|30s|60s", "call_to_action": "" }
- Spread suggested_date across the week starting ${weekStart}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 8192, apiKey });

  const { parsed, success } = parseAIJson(text);
  if (success && Array.isArray(parsed)) {
    return { posts: parsed, tokensUsed };
  }
  if (success && parsed && !Array.isArray(parsed)) {
    const arr = parsed.posts || parsed.content || parsed.items || Object.values(parsed).find(Array.isArray);
    if (Array.isArray(arr)) return { posts: arr as any[], tokensUsed };
  }
  console.error('Content generation: failed to parse response, text length:', text?.length);
  return { posts: [], tokensUsed };
}
