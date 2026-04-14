import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { runResearchAgent } from '@/lib/ai/research-agent';
import { runCompetitorAgent } from '@/lib/ai/competitor-agent';
import { runBrandAgent } from '@/lib/ai/brand-agent';
import { runStrategyAgent } from '@/lib/ai/strategy-agent';
import { getApiKeysForTenant } from '@/lib/api-keys';
import type { Tenant } from '@/lib/types';

/**
 * Re-run a single assessment agent.
 * Tea can provide feedback explaining WHY she's re-running (e.g., "competitors are wrong,
 * exclude banks and government agencies"). The feedback is appended to the AI prompt.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const { agent_type, feedback } = await req.json();

  if (!agent_type || !['research', 'competitor', 'brand', 'strategy'].includes(agent_type)) {
    return NextResponse.json({ error: 'agent_type must be one of: research, competitor, brand, strategy' }, { status: 400 });
  }

  const assessment = await queryOne<{
    id: string;
    tenant_id: string;
    research_data: any;
    competitor_data: any;
    brand_audit: any;
    strategy_data: any;
  }>('SELECT * FROM assessments WHERE id = $1', [id]);

  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

  const tenant = await queryOne<Tenant>('SELECT * FROM tenants WHERE id = $1', [assessment.tenant_id]);
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const apiKeys = await getApiKeysForTenant(assessment.tenant_id);
  const claudeKey = apiKeys.anthropic;

  // Mark agent as running
  await query(
    `INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at)
     VALUES ($1, $2, 'running', now())
     ON CONFLICT (assessment_id, agent_type) DO UPDATE SET status = 'running', started_at = now(), completed_at = NULL, error_message = NULL`,
    [id, agent_type]
  );

  // Return immediately, run in background
  rerunAgent(id, assessment, tenant, agent_type, feedback, claudeKey).catch((error) => {
    console.error(`Rerun ${agent_type} error:`, error);
  });

  return NextResponse.json({ ok: true, message: `Re-running ${agent_type} agent in background. Refresh to see results.` });
}

async function rerunAgent(
  assessmentId: string,
  assessment: any,
  tenant: Tenant,
  agentType: string,
  feedback: string | undefined,
  claudeKey: string
) {
  try {
    let result: { data: any; tokensUsed: number };

    // If Tea provided feedback, we'll inject it into the tenant description temporarily
    // so the AI agent uses it as context
    const enrichedTenant = feedback
      ? { ...tenant, description: `${tenant.description || ''}\n\nOperator feedback for re-analysis: ${feedback}` }
      : tenant;

    switch (agentType) {
      case 'research':
        result = await runResearchAgent(enrichedTenant, claudeKey);
        await query(`UPDATE assessments SET research_data = $1 WHERE id = $2`, [JSON.stringify(result.data), assessmentId]);
        break;

      case 'competitor':
        const researchData = assessment.research_data || {};
        result = await runCompetitorAgent(enrichedTenant, researchData, claudeKey);
        await query(`UPDATE assessments SET competitor_data = $1 WHERE id = $2`, [JSON.stringify(result.data), assessmentId]);
        break;

      case 'brand':
        const rData = assessment.research_data || {};
        const cData = assessment.competitor_data || {};
        result = await runBrandAgent(enrichedTenant, rData, cData, claudeKey);
        await query(`UPDATE assessments SET brand_audit = $1 WHERE id = $2`, [JSON.stringify(result.data), assessmentId]);
        break;

      case 'strategy':
        const rd = assessment.research_data || {};
        const cd = assessment.competitor_data || {};
        const bd = assessment.brand_audit || {};
        result = await runStrategyAgent(enrichedTenant, rd, cd, bd, claudeKey);
        await query(`UPDATE assessments SET strategy_data = $1 WHERE id = $2`, [JSON.stringify(result.data), assessmentId]);
        break;

      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Update agent status
    await query(
      `UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now()
       WHERE assessment_id = $2 AND agent_type = $3`,
      [result.tokensUsed, assessmentId, agentType]
    );

    // Update total tokens
    await query(
      `UPDATE assessments SET tokens_used = COALESCE(tokens_used, 0) + $1 WHERE id = $2`,
      [result.tokensUsed, assessmentId]
    );

  } catch (error: any) {
    const errorMessage = (error?.message || String(error)).slice(0, 1000);
    await query(
      `UPDATE assessment_agents SET status = 'failed', error_message = $1, completed_at = now()
       WHERE assessment_id = $2 AND agent_type = $3`,
      [errorMessage, assessmentId, agentType]
    );
    console.error(`Rerun ${agentType} failed:`, error);
  }
}
