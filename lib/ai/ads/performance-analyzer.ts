import { askClaude } from '../client';
import { sanitizeForPrompt } from '../sanitize';
import type { AdMetric } from '../../types';

/**
 * Analyzes the last N days of ad metrics for a campaign.
 * Identifies winning/losing ad sets, suggests pause/scale actions.
 * Run daily per active campaign.
 */
export async function analyzePerformance(
  params: {
    campaign_name: string;
    objective: string;
    daily_budget: number;
    currency: string;
    days_running: number;
    metrics: Array<AdMetric & { ad_name?: string; ad_set_name?: string }>;
  },
  apiKey?: string
): Promise<{
  overall_health: 'excellent' | 'good' | 'concerning' | 'poor';
  summary: string;
  insights: Array<{ type: 'win' | 'concern' | 'action'; ad_id?: string; description: string }>;
  recommended_actions: Array<{ action: 'pause' | 'scale' | 'adjust_budget' | 'rewrite_creative' | 'change_audience'; target_ad_id?: string; details: string }>;
  tokensUsed: number;
}> {
  const systemPrompt = `You are a paid media analyst. Review ad performance data and recommend optimization actions. Be data-driven and specific. Return ONLY valid JSON — no markdown, no code fences.`;

  const userPrompt = `Analyze this campaign's recent performance:

Campaign: ${sanitizeForPrompt(params.campaign_name, 200)}
Objective: ${sanitizeForPrompt(params.objective, 50)}
Daily budget: ${params.daily_budget} ${params.currency}
Running for: ${params.days_running} days

Metrics (last ${params.metrics.length} data points):
${JSON.stringify(params.metrics.slice(0, 30), null, 2)}

Identify:
1. Overall health
2. Specific wins (best performing ads)
3. Specific concerns (worst performers, anomalies)
4. Concrete recommended actions

Return JSON:
{
  "overall_health": "excellent|good|concerning|poor",
  "summary": "1-2 sentence overall assessment",
  "insights": [
    { "type": "win|concern|action", "ad_id": "uuid or null", "description": "" }
  ],
  "recommended_actions": [
    { "action": "pause|scale|adjust_budget|rewrite_creative|change_audience", "target_ad_id": "uuid or null", "details": "" }
  ]
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 2000, apiKey });

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);
    return {
      overall_health: parsed.overall_health || 'good',
      summary: parsed.summary || '',
      insights: parsed.insights || [],
      recommended_actions: parsed.recommended_actions || [],
      tokensUsed,
    };
  } catch {
    return {
      overall_health: 'good',
      summary: 'Failed to parse analysis',
      insights: [],
      recommended_actions: [],
      tokensUsed,
    };
  }
}
