import { NextRequest, NextResponse } from 'next/server';
import { requireOperator, hashPassword } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

/**
 * Reset a tenant user's password.
 * Generates a new random password, hashes it, updates DB, emails to tenant.
 * Tea uses this when a client forgets their password or a new manager takes over.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;

  // Find the tenant and their user account
  const tenant = await queryOne<{ id: string; name: string }>(
    'SELECT id, name FROM tenants WHERE id = $1', [id]
  );
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const tenantUser = await queryOne<{ id: string; email: string; name: string }>(
    `SELECT id, email, name FROM users WHERE tenant_id = $1 AND role = 'tenant' ORDER BY created_at ASC LIMIT 1`,
    [id]
  );
  if (!tenantUser) {
    return NextResponse.json({ error: 'No tenant user account found for this tenant' }, { status: 404 });
  }

  // Generate a new random password
  const newPassword = crypto.randomBytes(4).toString('hex') + '-' + crypto.randomBytes(4).toString('hex');
  const passwordHash = await hashPassword(newPassword);

  // Update in DB
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, tenantUser.id]);

  // Email the new password
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
      <h2 style="color:#1f2937;">Password Reset</h2>
      <p>Hi ${tenantUser.name || 'there'},</p>
      <p>Your password for the MK Marketing Platform has been reset by your account manager.</p>
      <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#6b7280;">Login URL</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:600;"><a href="https://mk.gecbusiness.com" style="color:#2563eb;">https://mk.gecbusiness.com</a></p>
        <p style="margin:12px 0 0;font-size:14px;color:#6b7280;">Email</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:600;">${tenantUser.email}</p>
        <p style="margin:12px 0 0;font-size:14px;color:#6b7280;">New Password</p>
        <p style="margin:4px 0 0;font-size:18px;font-weight:700;font-family:monospace;letter-spacing:1px;">${newPassword}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;">Please log in and review your content at your earliest convenience.</p>
    </div>
  `;

  const emailResult = await sendEmail({
    to: tenantUser.email,
    subject: `Your MK Platform password has been reset`,
    html,
  });

  return NextResponse.json({
    ok: true,
    email_sent: emailResult.ok,
    sent_to: tenantUser.email,
    note: emailResult.ok
      ? 'New password emailed to tenant.'
      : `Password reset in DB but email failed (${emailResult.error}). New password: ${newPassword}`,
    // Only show password in response if email failed — so Tea can share it manually
    ...(emailResult.ok ? {} : { new_password: newPassword }),
  });
}
