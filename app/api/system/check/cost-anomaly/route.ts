import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { askClaude } from '@/lib/ai/client';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';

/**
 * AI agent: detects cost spikes per tenant by comparing last 7 days to baseline.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Aggregate per-tenant costs for last 7 days vs prior 21 days (baseline)
  const data = await query<{
    tenant_id: string;
    tenant_name: string;
    last_7_days: string;
    baseline_avg: string;
  }>(
    `SELECT
       t.id as tenant_id,
       t.name as tenant_name,
       COALESCE(SUM(c.amount_usd) FILTER (WHERE c.created_at > now() - interval '7 days'), 0) as last_7_days,
       COALESCE(SUM(c.amount_usd) FILTER (WHERE c.created_at BETWEEN now() - interval '28 days' AND now() - interval '7 days') / 3, 0) as baseline_avg
     FROM tenants t
     LEFT JOIN cost_tracking c ON c.tenant_id = t.id
     WHERE t.status = 'active'
     GROUP BY t.id, t.name
     HAVING COALESCE(SUM(c.amount_usd) FILTER (WHERE c.created_at > now() - interval '7 days'), 0) > 0`
  );

  if (data.length === 0) {
    await recordHealth({
      check_name: 'cost_anomaly',
      severity: 'info',
      status: 'ok',
      message: 'No cost data to analyze',
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const { text } = await askClaude(
      'You are a cost anomaly detector. Identify tenants whose AI spending in the last 7 days is significantly higher than their baseline. Return ONLY valid JSON.',
      `Tenant cost data (USD):
${JSON.stringify(data, null, 2)}

Find tenants whose last_7_days spend is >2x their baseline_avg. Return JSON:
{
  "anomalies": [
    { "tenant_id": "", "tenant_name": "", "last_7_days": 0, "baseline": 0, "ratio": 0, "reason_hypothesis": "" }
  ]
}`,
      { maxTokens: 1500 }
    );

    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const result = JSON.parse(cleaned);

    for (const a of result.anomalies || []) {
      await recordHealth({
        check_name: 'cost_spike',
        severity: 'warning',
        status: 'warn',
        message: `${a.tenant_name} cost spiked ${a.ratio}x baseline ($${a.last_7_days} vs $${a.baseline} avg)`,
        affected_resource: `tenant:${a.tenant_id}`,
        details: a,
      });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
