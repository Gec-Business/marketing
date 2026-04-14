import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sendEmail } from '@/lib/email';

/**
 * Send a tenant report via email and mark sent_to_tenant_at.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;

  const report = await queryOne<{
    id: string;
    tenant_id: string;
    report_type: string;
    period_start: string;
    period_end: string;
    data: any;
  }>('SELECT * FROM tenant_reports WHERE id = $1', [id]);

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const tenant = await queryOne<{ name: string }>('SELECT name FROM tenants WHERE id = $1', [report.tenant_id]);
  const tenantUser = await queryOne<{ email: string; name: string }>(
    `SELECT email, name FROM users WHERE tenant_id = $1 AND role = 'tenant' ORDER BY created_at ASC LIMIT 1`,
    [report.tenant_id]
  );
  if (!tenantUser) {
    return NextResponse.json(
      {
        error: 'No tenant user account exists for this tenant',
        action_required: 'Create a tenant user account before sending reports.',
      },
      { status: 422 }
    );
  }

  const data = report.data || {};
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:640px;margin:0 auto;padding:20px;">
      <h1 style="color:#1f2937;">${tenant?.name || 'Your'} ${report.report_type === 'weekly' ? 'Weekly' : 'Monthly'} Report</h1>
      <p style="color:#6b7280;">${report.period_start} – ${report.period_end}</p>
      <div style="display:flex;gap:12px;margin:20px 0;flex-wrap:wrap;">
        <div style="background:#d1fae5;padding:14px;border-radius:8px;flex:1;min-width:120px;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#065f46;">${data.posts_published || 0}</p>
          <p style="margin:0;font-size:12px;color:#047857;">Published</p>
        </div>
        <div style="background:#dbeafe;padding:14px;border-radius:8px;flex:1;min-width:120px;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#1e40af;">${data.posts_scheduled || 0}</p>
          <p style="margin:0;font-size:12px;color:#1e3a8a;">Scheduled</p>
        </div>
        <div style="background:#fef3c7;padding:14px;border-radius:8px;flex:1;min-width:120px;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#92400e;">${data.posts_pending_approval || 0}</p>
          <p style="margin:0;font-size:12px;color:#78350f;">Awaiting Approval</p>
        </div>
      </div>
      ${data.platforms_active?.length > 0 ? `<p><strong>Active platforms:</strong> ${data.platforms_active.join(', ')}</p>` : ''}
      <p style="margin-top:30px;color:#6b7280;font-size:14px;">View the full report and approve any pending content in your <a href="https://mk.gecbusiness.com/portal/reports" style="color:#2563eb;">tenant portal</a>.</p>
    </div>
  `;

  const result = await sendEmail({
    to: tenantUser.email,
    subject: `${report.report_type === 'weekly' ? 'Weekly' : 'Monthly'} Report — ${report.period_start}`,
    html,
  });

  if (result.ok) {
    await query(`UPDATE tenant_reports SET sent_to_tenant_at = now() WHERE id = $1`, [id]);
    return NextResponse.json({ sent: true });
  }

  return NextResponse.json(
    {
      sent: false,
      error: result.error,
      hint: result.error === 'RESEND_API_KEY not set'
        ? 'Configure RESEND_API_KEY in .env to enable email delivery.'
        : 'Report email failed. sent_to_tenant_at NOT updated.',
    },
    { status: 502 }
  );
}
