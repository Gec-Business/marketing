import { NextRequest, NextResponse } from 'next/server';
import { requireOperator, requireUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { runResearchAgent } from '@/lib/ai/research-agent';
import { runCompetitorAgent } from '@/lib/ai/competitor-agent';
import { runBrandAgent } from '@/lib/ai/brand-agent';
import { runStrategyAgent } from '@/lib/ai/strategy-agent';
import { getApiKeysForTenant } from '@/lib/api-keys';
import type { Tenant } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  if (user.role === 'tenant' && user.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const assessment = await queryOne(
    'SELECT * FROM assessments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1',
    [tenantId]
  );

  if (!assessment) {
    return NextResponse.json({ assessment: null, agents: [] });
  }

  const agents = await query(
    'SELECT * FROM assessment_agents WHERE assessment_id = $1 ORDER BY started_at',
    [(assessment as any).id]
  );

  return NextResponse.json({ assessment, agents });
}

export async function POST(req: NextRequest) {
  await requireOperator();
  const { tenant_id } = await req.json();

  const tenant = await queryOne<Tenant>('SELECT * FROM tenants WHERE id = $1', [tenant_id]);
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // Prevent concurrent assessments for the same tenant
  const inProgress = await queryOne(
    `SELECT id FROM assessments WHERE tenant_id = $1 AND status IN ('pending','researching','analyzing','generating') ORDER BY created_at DESC LIMIT 1`,
    [tenant_id]
  );
  if (inProgress) {
    return NextResponse.json(
      { error: 'An assessment is already running for this tenant', assessment_id: (inProgress as { id: string }).id },
      { status: 409 }
    );
  }

  const assessment = await queryOne<{ id: string }>(
    `INSERT INTO assessments (tenant_id, status, started_at) VALUES ($1, 'researching', now()) RETURNING *`,
    [tenant_id]
  );
  if (!assessment) return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });

  await query(`UPDATE tenants SET status = 'assessing' WHERE id = $1`, [tenant_id]);

  const assessmentId = assessment.id;

  // Run pipeline in background — return immediately so HTTP doesn't timeout
  runAssessmentPipeline(assessmentId, tenant_id, tenant).catch((error) => {
    console.error('Assessment pipeline background error:', error);
  });

  return NextResponse.json({ assessment: { id: assessmentId, status: 'researching' } });
}

async function runAssessmentPipeline(assessmentId: string, tenantId: string, tenant: Tenant) {
  let totalTokens = 0;
  const apiKeys = await getApiKeysForTenant(tenantId);
  const claudeKey = apiKeys.anthropic;

  try {
    // Agent 1: Research
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'research', 'running', now()) ON CONFLICT (assessment_id, agent_type) DO UPDATE SET status = 'running', started_at = now()`, [assessmentId]);
    const research = await runResearchAgent(tenant, claudeKey);
    totalTokens += research.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'research'`, [research.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET research_data = $1 WHERE id = $2`, [JSON.stringify(research.data), assessmentId]);

    // Agent 2: Competitor
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'competitor', 'running', now()) ON CONFLICT (assessment_id, agent_type) DO UPDATE SET status = 'running', started_at = now()`, [assessmentId]);
    const competitor = await runCompetitorAgent(tenant, research.data, claudeKey);
    totalTokens += competitor.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'competitor'`, [competitor.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET competitor_data = $1 WHERE id = $2`, [JSON.stringify(competitor.data), assessmentId]);

    // Agent 3: Brand
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'brand', 'running', now()) ON CONFLICT (assessment_id, agent_type) DO UPDATE SET status = 'running', started_at = now()`, [assessmentId]);
    const brand = await runBrandAgent(tenant, research.data, competitor.data, claudeKey);
    totalTokens += brand.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'brand'`, [brand.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET brand_audit = $1 WHERE id = $2`, [JSON.stringify(brand.data), assessmentId]);

    // Agent 4: Strategy
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'strategy', 'running', now()) ON CONFLICT (assessment_id, agent_type) DO UPDATE SET status = 'running', started_at = now()`, [assessmentId]);
    const strategy = await runStrategyAgent(tenant, research.data, competitor.data, brand.data, claudeKey);
    totalTokens += strategy.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'strategy'`, [strategy.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET strategy_data = $1 WHERE id = $2`, [JSON.stringify(strategy.data), assessmentId]);

    // Claude Sonnet 4.6 pricing: $3/1M input, $15/1M output
    const estInputTokens = Math.round(totalTokens * 0.3);
    const estOutputTokens = totalTokens - estInputTokens;
    const totalCost = (estInputTokens / 1_000_000) * 3 + (estOutputTokens / 1_000_000) * 15;

    await query(
      `UPDATE assessments SET status = 'review', tokens_used = $1, cost_usd = $2, completed_at = now() WHERE id = $3`,
      [totalTokens, totalCost, assessmentId]
    );

    const billedTo = apiKeys.source.anthropic === 'tenant' ? 'tenant' : apiKeys.source.anthropic === 'operator' ? 'operator' : 'gec';
    await query(
      `INSERT INTO cost_tracking (tenant_id, category, description, amount_usd, tokens_used, billed_to) VALUES ($1, 'ai_assessment', 'Full assessment pipeline', $2, $3, $4)`,
      [tenantId, totalCost, totalTokens, billedTo]
    );

    await query(`UPDATE tenants SET status = 'strategy_review' WHERE id = $1`, [tenantId]);

  } catch (error: any) {
    const errorMessage = (error?.message || String(error)).slice(0, 1000);
    await query(`UPDATE assessments SET status = 'failed', error_message = $1 WHERE id = $2`, [errorMessage, assessmentId]);
    await query(`UPDATE tenants SET status = 'active' WHERE id = $1`, [tenantId]);
    console.error('Assessment pipeline error:', error);
  }
}
