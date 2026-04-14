import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import crypto from 'crypto';

/**
 * Auto-generate monthly invoices for tenants with active subscriptions.
 *
 * Triggered by cron daily at 9am. For each tenant where today matches billing_day:
 *   - Skip if subscription expired (start + duration months ago)
 *   - Skip if invoice already exists for this billing period
 *   - Otherwise create draft invoice with monthly_fee
 *
 * Tea reviews and sends manually from the operator UI.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;
  if (!secret || !expected || secret.length !== expected.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const todayDay = today.getDate();
  const todayYear = today.getFullYear();

  // Find all tenants whose billing_day == today and have a monthly_fee set.
  // Subscription expiry is computed in SQL using Postgres interval (avoids JS setMonth() bugs).
  const tenants = await query<{
    id: string;
    name: string;
    monthly_fee: string;
    billing_currency: string;
    is_expired: boolean;
  }>(
    `SELECT id, name, monthly_fee, billing_currency,
            CASE
              WHEN billing_start_date IS NOT NULL AND billing_duration_months IS NOT NULL
              THEN (billing_start_date::timestamp + (billing_duration_months || ' months')::interval) < now()
              ELSE false
            END as is_expired
     FROM tenants
     WHERE auto_invoice = true
       AND status = 'active'
       AND monthly_fee IS NOT NULL
       AND monthly_fee > 0
       AND billing_day = $1`,
    [todayDay]
  );

  let generated = 0;
  let skippedExpired = 0;
  let skippedExisting = 0;
  let errors = 0;

  for (const tenant of tenants) {
    try {
      if (tenant.is_expired) {
        skippedExpired++;
        continue;
      }

      // Period: this month (1st → last day)
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const periodStartStr = periodStart.toISOString().split('T')[0];
      const periodEndStr = periodEnd.toISOString().split('T')[0];

      // Check if invoice already exists for this period
      const existing = await queryOne(
        `SELECT id FROM invoices WHERE tenant_id = $1 AND period_start = $2 AND period_end = $3 LIMIT 1`,
        [tenant.id, periodStartStr, periodEndStr]
      );
      if (existing) {
        skippedExisting++;
        continue;
      }

      // Atomic invoice number from sequence (no race condition)
      const seq = await queryOne<{ nextval: string }>(`SELECT nextval('invoice_number_seq') AS nextval`);
      const num = parseInt(seq?.nextval || '1', 10);
      const invoiceNumber = `MK-${todayYear}-${String(num).padStart(4, '0')}`;

      const monthLabel = periodStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const items = [{ description: `Monthly subscription — ${monthLabel}`, amount: parseFloat(tenant.monthly_fee) }];
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 14);

      await queryOne(
        `INSERT INTO invoices (tenant_id, invoice_number, period_start, period_end, items, total_amount, currency, due_date, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
         RETURNING id`,
        [
          tenant.id,
          invoiceNumber,
          periodStartStr,
          periodEndStr,
          JSON.stringify(items),
          parseFloat(tenant.monthly_fee),
          tenant.billing_currency || 'GEL',
          dueDate.toISOString().split('T')[0],
          'Auto-generated subscription invoice',
        ]
      );
      generated++;
    } catch (e) {
      console.error(`Auto-invoice error for tenant ${tenant.id}:`, e);
      errors++;
    }
  }

  return NextResponse.json({
    checked: tenants.length,
    generated,
    skipped_expired: skippedExpired,
    skipped_existing: skippedExisting,
    errors,
  });
}
