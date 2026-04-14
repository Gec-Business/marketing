import { NextRequest, NextResponse } from 'next/server';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Watchdog: verifies that the cron log file is being updated.
 * If no entries in the last hour, something is wrong with cron.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronLogPath = '/var/www/marketing/logs/cron.log';

  if (!fs.existsSync(cronLogPath)) {
    await recordHealth({
      check_name: 'cron_log_missing',
      severity: 'error',
      status: 'fail',
      message: 'Cron log file not found — crons may not be running',
      details: { path: cronLogPath },
    });
    return NextResponse.json({ ok: false, reason: 'log_missing' });
  }

  const stats = fs.statSync(cronLogPath);
  const lastModifiedMs = stats.mtimeMs;
  const ageMinutes = Math.round((Date.now() - lastModifiedMs) / 60000);

  // auto-publish runs every 15 min, so log should be updated within 30 min max
  if (ageMinutes > 30) {
    await recordHealth({
      check_name: 'cron_silent',
      severity: 'error',
      status: 'fail',
      message: `Cron log not updated for ${ageMinutes} min — crons may have stopped`,
      details: { ageMinutes, path: cronLogPath },
    });
  } else {
    await recordHealth({
      check_name: 'cron_heartbeat',
      severity: 'info',
      status: 'ok',
      message: `Cron healthy (last activity ${ageMinutes} min ago)`,
      details: { ageMinutes },
    });
  }

  return NextResponse.json({ ageMinutes });
}
