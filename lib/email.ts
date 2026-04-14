/**
 * Email delivery via Resend (https://resend.com).
 * Requires RESEND_API_KEY and ALERT_EMAIL env vars.
 * If not configured, falls back to console logging — never blocks the caller.
 */

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const FROM_ADDRESS = process.env.RESEND_FROM || 'MK Platform <alerts@mk.gecbusiness.com>';

export async function sendEmail(opts: SendOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email-fallback] To=${opts.to} Subject="${opts.subject}" — RESEND_API_KEY not set`);
    return { ok: false, error: 'RESEND_API_KEY not set' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[email] Resend failed: ${res.status} ${err}`);
      return { ok: false, error: `${res.status}: ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (e: any) {
    console.error('[email] Send error:', e);
    return { ok: false, error: e.message };
  }
}

/**
 * Send an alert email to the configured ALERT_EMAIL address.
 * Used by the monitoring system for critical/error alerts.
 */
export async function sendAlertEmail(subject: string, html: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const to = process.env.ALERT_EMAIL || 'it@gecbusiness.com';
  return sendEmail({ to, subject: `[MK Platform] ${subject}`, html });
}
