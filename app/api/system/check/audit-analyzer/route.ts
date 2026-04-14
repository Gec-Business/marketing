import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { askClaude } from '@/lib/ai/client';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';

/**
 * AI agent: analyzes audit_log for the last 24h.
 * Flags suspicious patterns like bulk key changes or off-hours admin actions.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = await query(
    `SELECT user_id, action, resource_type, resource_id, details, ip_address, created_at
     FROM audit_log
     WHERE created_at > now() - interval '24 hours'
     ORDER BY created_at DESC
     LIMIT 200`
  );

  if (events.length === 0) {
    await recordHealth({
      check_name: 'audit_analyzer',
      severity: 'info',
      status: 'ok',
      message: 'No audit events in last 24h',
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const { text } = await askClaude(
      'You are a security audit analyzer. Look at audit log events and flag suspicious patterns: bulk operations, off-hours actions, repeated failures, unusual IPs, privilege escalations. Return ONLY valid JSON.',
      `Analyze these audit log events from the last 24h:
${JSON.stringify(events.slice(0, 50), null, 2)}

Total events: ${events.length}

Return JSON:
{
  "suspicious": true|false,
  "findings": [
    { "pattern": "", "severity": "info|warning|error", "description": "", "involved_users": [], "recommendation": "" }
  ]
}`,
      { maxTokens: 1500 }
    );

    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const result = JSON.parse(cleaned);

    if (result.suspicious && result.findings?.length > 0) {
      const worstSeverity = result.findings.reduce((max: string, f: any) => {
        const order = ['info', 'warning', 'error', 'critical'];
        return order.indexOf(f.severity) > order.indexOf(max) ? f.severity : max;
      }, 'info');

      await recordHealth({
        check_name: 'audit_suspicious',
        severity: worstSeverity as any,
        status: 'warn',
        message: `${result.findings.length} suspicious patterns in audit log`,
        details: { findings: result.findings, event_count: events.length },
      });
    } else {
      await recordHealth({
        check_name: 'audit_analyzer',
        severity: 'info',
        status: 'ok',
        message: `${events.length} audit events, no suspicious patterns`,
      });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
