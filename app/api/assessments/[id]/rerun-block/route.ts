import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { askClaude } from '@/lib/ai/client';
import { getApiKeysForTenant } from '@/lib/api-keys';
import { sanitizeForPrompt } from '@/lib/ai/sanitize';
import { parseAIJson } from '@/lib/ai/parse-json';

/**
 * Re-run a specific sub-block within an assessment section.
 * Tea provides feedback explaining what to fix. Only the targeted sub-block is regenerated;
 * all other data is preserved.
 *
 * Body: { section: "brand_audit"|"strategy_data"|"research_data"|"competitor_data", block: "swot"|"cbbe_scores"|..., feedback: "..." }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const { section, block, feedback } = await req.json();

  const validSections = ['research_data', 'competitor_data', 'brand_audit', 'strategy_data'];
  if (!section || !validSections.includes(section)) {
    return NextResponse.json({ error: 'section must be one of: research_data, competitor_data, brand_audit, strategy_data' }, { status: 400 });
  }
  if (!block) {
    return NextResponse.json({ error: 'block is required (e.g., "swot", "cbbe_scores", "strategic_framework")' }, { status: 400 });
  }

  const assessment = await queryOne<{ id: string; tenant_id: string; [key: string]: any }>(
    'SELECT * FROM assessments WHERE id = $1', [id]
  );
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

  const currentData = assessment[section] || {};
  const currentBlockData = currentData[block];

  const apiKeys = await getApiKeysForTenant(assessment.tenant_id);
  const safeFeedback = sanitizeForPrompt(feedback, 1000);

  // Build prompt for sub-block regeneration
  const systemPrompt = `You are an expert marketing strategist. Regenerate ONLY the "${block}" section of a ${section.replace('_', ' ')} assessment. Keep the same JSON structure as the current data. Return ONLY valid JSON for this specific block — no markdown, no code fences, no explanation.`;

  const currentBlockJson = currentBlockData
    ? `\n\nCurrent "${block}" data (for reference — improve or replace based on feedback):\n${JSON.stringify(currentBlockData, null, 2)}`
    : '';

  const feedbackSection = safeFeedback
    ? `\n\nOperator feedback (IMPORTANT — this is why the re-run was requested):\n"${safeFeedback}"`
    : '';

  const userPrompt = `Regenerate the "${block}" block for a ${section.replace('_', ' ')} assessment.${currentBlockJson}${feedbackSection}

Return ONLY the JSON for the "${block}" key. Example structure:
${getBlockStructureHint(section, block)}`;

  // Run in background
  regenerateBlock(id, section, block, systemPrompt, userPrompt, apiKeys.anthropic, currentData).catch((error) => {
    console.error(`Rerun block ${section}.${block} error:`, error);
  });

  return NextResponse.json({
    ok: true,
    message: `Re-generating "${block}" in background. Refresh in 15-30 seconds.`,
  });
}

async function regenerateBlock(
  assessmentId: string,
  section: string,
  block: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  currentData: Record<string, any>
) {
  try {
    const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 4096, apiKey });

    const { parsed, success } = parseAIJson(text);

    if (success && parsed) {
      // Merge: replace only the targeted block, keep everything else
      const updated = { ...currentData, [block]: parsed };
      // Remove parse_error flag if it existed
      delete updated.parse_error;
      delete updated.raw_text;

      await query(
        `UPDATE assessments SET ${section} = $1 WHERE id = $2`,
        [JSON.stringify(updated), assessmentId]
      );

      await query(
        `UPDATE assessments SET tokens_used = COALESCE(tokens_used, 0) + $1 WHERE id = $2`,
        [tokensUsed, assessmentId]
      );
    } else {
      console.error(`Failed to parse sub-block ${section}.${block}:`, text?.slice(0, 200));
    }
  } catch (error: any) {
    console.error(`Rerun block ${section}.${block} failed:`, error.message);
  }
}

function getBlockStructureHint(section: string, block: string): string {
  const hints: Record<string, Record<string, string>> = {
    brand_audit: {
      cbbe_scores: '{"identity": {"score": 0, "max": 50, "status": "moderate", "notes": ""}, "meaning": {...}, "response": {...}, "resonance": {...}}',
      swot: '{"strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."], "threats": ["..."]}',
      kapferer_prism: '{"physique": "...", "personality": "...", "culture": "...", "relationship": "...", "reflection": "...", "self_image": "..."}',
      priority_actions: '[{"action": "...", "timeframe": "0-3 months", "impact": "high", "effort": "medium"}]',
      key_findings: '["Finding 1", "Finding 2", ...]',
      online_reputation_score: '{"score": 0, "max": 100, "breakdown": {}}',
      social_media_audit: '{"platforms": {}, "content_quality_score": 0, "posting_consistency": "..."}',
    },
    strategy_data: {
      strategic_framework: '{"vision": "...", "mission": "...", "strategic_pillars": [{"name": "", "description": "", "kpis": []}]}',
      messaging_strategy: '{"brand_voice": {"tone": "", "personality": "", "do": [], "dont": []}, "content_pillars": [...], "hashtag_strategy": {...}}',
      channel_strategy: '{"channels": {...}, "content_mix": [{"type": "", "percentage": 0}]}',
      video_ideas: '[{"concept": "", "scenario": "", "platform": "", "duration": "", "texts_on_screen": [], "call_to_action": ""}]',
      action_plan: '{"month_1": [{"week": 1, "tasks": [...]}], "month_2": [...], "month_3": [...]}',
      disruptive_innovations: '[{"idea": "", "cost": "low", "impact": "high", "description": ""}]',
    },
    research_data: {
      business_profile: '{"name": "", "industry": "", "city": "", "branches": [], "operating_hours": "", "contact": ""}',
      target_audience: '{"demographics": "", "psychographics": "", "behaviors": ""}',
      market_context: '{"city": "", "sector": "", "market_size_estimate": "", "growth_trend": ""}',
      review_sentiment: '{"positive_themes": [], "negative_themes": [], "overall_sentiment": ""}',
      online_presence: '{"website_status": "", "social_media": {}, "delivery_platforms": []}',
    },
    competitor_data: {
      competitors: '[{"name": "", "type": "", "price_positioning": "", "strengths": [], "weaknesses": [], "geographic_overlap": ""}]',
      tenant_position: '{"segment": "", "rank_estimate": 0, "competitive_advantages": [], "differentiation_gaps": []}',
      competitive_threats: '[{"threat": "", "probability": "moderate", "impact": "high"}]',
      opportunities: '["Opportunity 1", ...]',
    },
  };

  return hints[section]?.[block] || '{ /* matching the current structure */ }';
}
