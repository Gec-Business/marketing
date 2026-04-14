import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { askClaude } from '@/lib/ai/client';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';

/**
 * AI agent: when assessments fail, analyze the error and suggest root cause.
 * Runs daily — checks all failed assessments from last 24h that haven't been analyzed.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only analyze failures we haven't already analyzed (failure_analyzed_at IS NULL)
  const failed = await query<{ id: string; tenant_id: string; error_message: string }>(
    `SELECT id, tenant_id, error_message FROM assessments
     WHERE status = 'failed'
       AND error_message IS NOT NULL
       AND failure_analyzed_at IS NULL
       AND completed_at > now() - interval '24 hours'`
  );

  for (const a of failed) {
    try {
      const { text } = await askClaude(
        'You are a debugging assistant. Given an error message from a failed AI pipeline, identify the root cause category and severity. Return ONLY valid JSON.',
        `Assessment failed with this error:
"${a.error_message}"

Return JSON:
{
  "category": "user_input|api_quota|api_auth|network|validation|bug",
  "severity": "info|warning|error|critical",
  "root_cause": "1-sentence root cause",
  "user_action_needed": "what should the operator do?",
  "is_our_bug": true|false
}`,
        { maxTokens: 500 }
      );

      const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const analysis = JSON.parse(cleaned);

      await recordHealth({
        check_name: 'failed_assessment',
        severity: analysis.severity || 'error',
        status: 'fail',
        message: `${analysis.category}: ${analysis.root_cause}`,
        affected_resource: `assessment:${a.id}`,
        details: { ...analysis, original_error: a.error_message, tenant_id: a.tenant_id },
      });
      // Mark as analyzed so we don't re-process on subsequent cron runs
      await query(`UPDATE assessments SET failure_analyzed_at = now() WHERE id = $1`, [a.id]);
    } catch (e: any) {
      console.error(`Failed assessment analyzer error for ${a.id}:`, e.message);
    }
  }

  return NextResponse.json({ analyzed: failed.length });
}
