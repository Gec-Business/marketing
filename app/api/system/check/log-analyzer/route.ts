import { NextRequest, NextResponse } from 'next/server';
import { askClaude } from '@/lib/ai/client';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';
import { execSync } from 'child_process';

/**
 * AI agent: reads last 24h of PM2 error logs and asks Claude to identify
 * unusual errors, repeated failures, or patterns indicating bugs.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let logs = '';
  try {
    // Last 500 lines of error log
    logs = execSync('tail -500 /var/www/marketing/logs/error-0.log 2>/dev/null || true', { encoding: 'utf-8', timeout: 5000 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not read logs' }, { status: 500 });
  }

  if (!logs.trim()) {
    await recordHealth({
      check_name: 'log_analyzer',
      severity: 'info',
      status: 'ok',
      message: 'No errors in logs',
    });
    return NextResponse.json({ ok: true, message: 'No errors' });
  }

  // Truncate to last 50KB to keep prompt reasonable
  const truncated = logs.length > 50000 ? logs.slice(-50000) : logs;

  try {
    const { text } = await askClaude(
      'You are a log analysis assistant. Analyze the provided application error logs and identify: (1) the most severe issues, (2) repeated patterns indicating bugs, (3) any anomalies. Return ONLY valid JSON.',
      `Analyze these application error logs from the last period:

\`\`\`
${truncated}
\`\`\`

Return JSON:
{
  "severity": "info|warning|error|critical",
  "summary": "1-2 sentence overall assessment",
  "issues": [
    { "type": "", "count": 0, "severity": "warning|error|critical", "description": "", "first_seen": "", "suggested_fix": "" }
  ],
  "healthy": true|false
}`,
      { maxTokens: 2000 }
    );

    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const analysis = JSON.parse(cleaned);

    await recordHealth({
      check_name: 'log_analyzer',
      severity: analysis.severity || 'info',
      status: analysis.healthy ? 'ok' : 'warn',
      message: analysis.summary || 'Log analysis complete',
      details: { issues: analysis.issues || [] },
    });

    return NextResponse.json(analysis);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
