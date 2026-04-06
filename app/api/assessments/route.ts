import { NextRequest, NextResponse } from 'next/server';
import { requireOperator, requireUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { runResearchAgent } from '@/lib/ai/research-agent';
import { runCompetitorAgent } from '@/lib/ai/competitor-agent';
import { runBrandAgent } from '@/lib/ai/brand-agent';
import { runStrategyAgent } from '@/lib/ai/strategy-agent';
import type { Tenant } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
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

  const assessment = await queryOne(
    `INSERT INTO assessments (tenant_id, status, started_at) VALUES ($1, 'researching', now()) RETURNING *`,
    [tenant_id]
  );

  await query(`UPDATE tenants SET status = 'assessing' WHERE id = $1`, [tenant_id]);

  const assessmentId = (assessment as any).id;
  let totalTokens = 0;

  try {
    // Agent 1: Research
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'research', 'running', now())`, [assessmentId]);
    const research = await runResearchAgent(tenant);
    totalTokens += research.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'research'`, [research.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET research_data = $1 WHERE id = $2`, [JSON.stringify(research.data), assessmentId]);

    // Agent 2: Competitor
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'competitor', 'running', now())`, [assessmentId]);
    const competitor = await runCompetitorAgent(tenant, research.data);
    totalTokens += competitor.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'competitor'`, [competitor.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET competitor_data = $1 WHERE id = $2`, [JSON.stringify(competitor.data), assessmentId]);

    // Agent 3: Brand
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'brand', 'running', now())`, [assessmentId]);
    const brand = await runBrandAgent(tenant, research.data, competitor.data);
    totalTokens += brand.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'brand'`, [brand.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET brand_audit = $1 WHERE id = $2`, [JSON.stringify(brand.data), assessmentId]);

    // Agent 4: Strategy
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'strategy', 'running', now())`, [assessmentId]);
    const strategy = await runStrategyAgent(tenant, research.data, competitor.data, brand.data);
    totalTokens += strategy.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'strategy'`, [strategy.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET strategy_data = $1 WHERE id = $2`, [JSON.stringify(strategy.data), assessmentId]);

    const totalCost = (totalTokens / 1_000_000) * 5;

    await query(
      `UPDATE assessments SET status = 'review', tokens_used = $1, cost_usd = $2, completed_at = now() WHERE id = $3`,
      [totalTokens, totalCost, assessmentId]
    );

    await query(
      `INSERT INTO cost_tracking (tenant_id, category, description, amount_usd, tokens_used) VALUES ($1, 'ai_assessment', 'Full assessment pipeline', $2, $3)`,
      [tenant_id, totalCost, totalTokens]
    );

    await query(`UPDATE tenants SET status = 'strategy_review' WHERE id = $1`, [tenant_id]);

    return NextResponse.json({ assessment: { id: assessmentId, status: 'review', tokensUsed: totalTokens, costUsd: totalCost } });

  } catch (error: any) {
    await query(`UPDATE assessments SET status = 'failed' WHERE id = $1`, [assessmentId]);
    console.error('Assessment pipeline error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
