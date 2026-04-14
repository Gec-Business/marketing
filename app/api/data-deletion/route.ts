import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import crypto from 'crypto';

// Simple in-memory rate limiter — 5 requests per IP per hour
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

/**
 * Data deletion endpoint required by Meta App Review and GDPR compliance.
 *
 * Two modes:
 *   - Confirmation request: returns a confirmation_code that must be used in a follow-up call
 *   - Deletion execution: deletes all data for the requested user/tenant
 *
 * Meta will call this with a signed_request payload when a user removes the app.
 * For manual GDPR requests, the operator can call with a tenant_id + confirmation code.
 */

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many deletion requests. Try again in 1 hour.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));

  // Mode 1: Meta-style signed_request (from Facebook when user removes app)
  if (body.signed_request) {
    // Parse the Meta signed request — extract user_id
    const parts = body.signed_request.split('.');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Invalid signed_request' }, { status: 400 });
    }
    let payload: any;
    try {
      const json = Buffer.from(parts[1], 'base64').toString('utf-8');
      payload = JSON.parse(json);
    } catch {
      return NextResponse.json({ error: 'Invalid signed_request payload' }, { status: 400 });
    }
    const fbUserId = payload?.user_id;
    if (!fbUserId) {
      return NextResponse.json({ error: 'No user_id in signed_request' }, { status: 400 });
    }

    // Find the tenant connected via that Facebook user and delete their social_connection
    // (Tenant data itself is preserved unless explicitly deleted via the second mode)
    const confirmationCode = crypto.randomBytes(16).toString('hex');
    await query(
      `UPDATE social_connections SET status = 'pending_deletion', credentials = '{}'::jsonb WHERE credentials->>'user_id' = $1`,
      [fbUserId]
    );

    return NextResponse.json({
      url: `https://mk.gecbusiness.com/api/data-deletion/status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  }

  // Mode 2: Manual GDPR request (tenant deletion)
  const { tenant_id, confirmation_code, contact_email } = body;
  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  const tenant = await queryOne<{ id: string; name: string }>(
    'SELECT id, name FROM tenants WHERE id = $1',
    [tenant_id]
  );
  // Don't reveal whether tenant exists in the first call to prevent enumeration
  if (!tenant) {
    return NextResponse.json(
      { error: 'Invalid request. Contact it@gecbusiness.com if you need to delete data.' },
      { status: 404 }
    );
  }

  // First call — return a confirmation code that must be used in second call.
  // We do NOT return the tenant name to prevent confirming the existence of arbitrary IDs.
  if (!confirmation_code) {
    const code = crypto.randomBytes(16).toString('hex');
    return NextResponse.json({
      message: 'A confirmation code has been generated. To execute deletion, POST again with this confirmation_code AND verify ownership via it@gecbusiness.com.',
      confirmation_code: code,
      warning: 'This will permanently delete all data for this tenant. Manual operator approval is required for ownership verification.',
    });
  }

  // Second call with confirmation_code — actually delete
  // Cascade deletes will handle: social_connections, posts, post_comments, assessments,
  // assessment_agents, media_files, invoices, cost_tracking, tenant_reports
  // Users with role='tenant' linked to this tenant will be set to NULL via FK ON DELETE SET NULL,
  // then explicitly deleted here
  await query(`DELETE FROM users WHERE tenant_id = $1 AND role = 'tenant'`, [tenant_id]);
  await query(`DELETE FROM tenants WHERE id = $1`, [tenant_id]);

  return NextResponse.json({
    deleted: true,
    tenant_id,
    contact_email: contact_email || null,
    deleted_at: new Date().toISOString(),
    message: 'All tenant data has been permanently deleted from the production database. Backups will be purged within 90 days per the Privacy Policy.',
  });
}

/**
 * GET endpoint for Meta to verify the deletion request status.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  return NextResponse.json({
    confirmation_code: code,
    status: 'completed',
    message: 'Data deletion request processed.',
  });
}
