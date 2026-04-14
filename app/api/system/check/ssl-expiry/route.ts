import { NextRequest, NextResponse } from 'next/server';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';
import { execSync } from 'child_process';

/**
 * Watchdog: SSL certificate expiry on mk.gecbusiness.com.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let daysRemaining = -1;
  let notAfter = '';
  try {
    // openssl returns "notAfter=Apr 12 12:00:00 2026 GMT"
    const out = execSync(
      `echo | timeout 8 openssl s_client -servername mk.gecbusiness.com -connect mk.gecbusiness.com:443 2>/dev/null | openssl x509 -noout -enddate`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    notAfter = out.replace('notAfter=', '').trim();
    const expiryMs = new Date(notAfter).getTime();
    daysRemaining = Math.floor((expiryMs - Date.now()) / (1000 * 60 * 60 * 24));
  } catch (e: any) {
    await recordHealth({
      check_name: 'ssl_check_failed',
      severity: 'warning',
      status: 'warn',
      message: `SSL check failed: ${e.message}`,
      details: { error: e.message },
    });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  if (daysRemaining < 7) {
    await recordHealth({
      check_name: 'ssl_critical',
      severity: 'critical',
      status: 'fail',
      message: `SSL cert expires in ${daysRemaining} days (${notAfter})`,
      details: { daysRemaining, notAfter },
    });
  } else if (daysRemaining < 14) {
    await recordHealth({
      check_name: 'ssl_warning',
      severity: 'warning',
      status: 'warn',
      message: `SSL cert expires in ${daysRemaining} days`,
      details: { daysRemaining, notAfter },
    });
  } else {
    await recordHealth({
      check_name: 'ssl_health',
      severity: 'info',
      status: 'ok',
      message: `SSL OK (${daysRemaining} days remaining)`,
      details: { daysRemaining, notAfter },
    });
  }

  return NextResponse.json({ daysRemaining, notAfter });
}
