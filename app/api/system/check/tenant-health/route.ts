import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { askClaude } from '@/lib/ai/client';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';

/**
 * AI agent: scores each active tenant's health and churn risk.
 * Looks at: posts published, days since last activity, content backlog, payment status.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenants = await query<{ id: string; name: string; status: string; created_at: string }>(
    `SELECT id, name, status, created_at FROM tenants WHERE status IN ('active','strategy_review')`
  );

  const results = [];

  for (const tenant of tenants) {
    // Stats for this tenant
    const stats = await queryOne<{
      posts_published_30d: string;
      posts_drafts: string;
      posts_pending_approval: string;
      last_published: string | null;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('posted','partially_posted') AND tenant_approved_at > now() - interval '30 days') as posts_published_30d,
         COUNT(*) FILTER (WHERE status = 'draft') as posts_drafts,
         COUNT(*) FILTER (WHERE status = 'pending_tenant') as posts_pending_approval,
         MAX(tenant_approved_at) FILTER (WHERE status IN ('posted','partially_posted')) as last_published
       FROM posts WHERE tenant_id = $1`,
      [tenant.id]
    );

    try {
      const { text } = await askClaude(
        'You are a customer success analyst. Score tenant health 1-10 based on usage data. Flag churn risk. Return ONLY valid JSON.',
        `Tenant: ${tenant.name}
Status: ${tenant.status}
Created: ${tenant.created_at}
Posts published last 30 days: ${stats?.posts_published_30d || 0}
Posts in draft: ${stats?.posts_drafts || 0}
Posts pending tenant approval: ${stats?.posts_pending_approval || 0}
Last published: ${stats?.last_published || 'never'}

Return JSON:
{
  "score": 0,
  "risk": "low|medium|high",
  "concerns": [],
  "recommendation": ""
}`,
        { maxTokens: 800 }
      );

      const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const analysis = JSON.parse(cleaned);

      if (analysis.risk === 'high') {
        await recordHealth({
          check_name: 'tenant_churn_risk',
          severity: 'warning',
          status: 'warn',
          message: `${tenant.name}: churn risk HIGH (score ${analysis.score}/10)`,
          affected_resource: `tenant:${tenant.id}`,
          details: { ...analysis, stats },
        });
      }

      results.push({ tenant_id: tenant.id, name: tenant.name, ...analysis });
    } catch (e: any) {
      console.error(`Tenant health check failed for ${tenant.id}:`, e.message);
    }
  }

  return NextResponse.json({ checked: tenants.length, results });
}
