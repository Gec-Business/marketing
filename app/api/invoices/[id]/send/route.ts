import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sendEmail } from '@/lib/email';

/**
 * Send an invoice to the tenant via email.
 * Updates status to 'sent' and records sent timestamp.
 * If RESEND_API_KEY is not configured, falls back to console log + status update only.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;

  const invoice = await queryOne<{
    id: string;
    tenant_id: string;
    invoice_number: string;
    period_start: string;
    period_end: string;
    total_amount: string;
    currency: string;
    due_date: string | null;
    items: any;
    status: string;
  }>(
    'SELECT * FROM invoices WHERE id = $1',
    [id]
  );

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  // Find tenant primary user (role = 'tenant')
  const tenantUser = await queryOne<{ email: string; name: string }>(
    `SELECT email, name FROM users WHERE tenant_id = $1 AND role = 'tenant' ORDER BY created_at ASC LIMIT 1`,
    [invoice.tenant_id]
  );
  if (!tenantUser) {
    return NextResponse.json(
      {
        error: 'No tenant user account exists for this tenant',
        action_required: 'Create a tenant user account in the tenant settings before sending invoices.',
      },
      { status: 422 }
    );
  }

  const items = Array.isArray(invoice.items) ? invoice.items : (typeof invoice.items === 'string' ? JSON.parse(invoice.items) : []);
  const itemRows = items.map((it: any) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.description)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${invoice.currency} ${Number(it.amount).toFixed(2)}</td></tr>`).join('');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h1 style="color:#1f2937;margin-bottom:8px;">Invoice ${escapeHtml(invoice.invoice_number)}</h1>
      <p style="color:#6b7280;margin-top:0;">From: GEC Business / MK Marketing Platform</p>
      <p style="color:#6b7280;">To: ${escapeHtml(tenantUser.name)} (${escapeHtml(tenantUser.email)})</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p><strong>Period:</strong> ${invoice.period_start} – ${invoice.period_end}</p>
      ${invoice.due_date ? `<p><strong>Due Date:</strong> ${invoice.due_date}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-top:20px;">
        <thead><tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:right;">Amount</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr><td style="padding:8px;font-weight:600;">TOTAL</td><td style="padding:8px;text-align:right;font-weight:600;font-size:18px;">${invoice.currency} ${Number(invoice.total_amount).toFixed(2)}</td></tr></tfoot>
      </table>
      <p style="margin-top:30px;color:#6b7280;font-size:14px;">View this invoice and download the PDF in your <a href="https://mk.gecbusiness.com/portal/invoices" style="color:#2563eb;">tenant portal</a>.</p>
    </div>
  `;

  const result = await sendEmail({
    to: tenantUser.email,
    subject: `Invoice ${invoice.invoice_number} from GEC Business`,
    html,
  });

  if (result.ok) {
    // Email was actually sent — record both status change and timestamp
    await query(`UPDATE invoices SET status = 'sent', sent_at = now() WHERE id = $1`, [id]);
    return NextResponse.json({ sent: true, invoice_status: 'sent' });
  }

  // Email failed — DO NOT update status. Return clear error so operator knows.
  return NextResponse.json(
    {
      sent: false,
      error: result.error,
      invoice_status: invoice.status,
      hint: result.error === 'RESEND_API_KEY not set'
        ? 'Configure RESEND_API_KEY in .env to enable email delivery.'
        : 'Email delivery failed. Invoice status NOT changed. Try again or check Resend dashboard.',
    },
    { status: 502 }
  );
}

function escapeHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
