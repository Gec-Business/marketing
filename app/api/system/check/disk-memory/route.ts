import { NextRequest, NextResponse } from 'next/server';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';
import { execSync } from 'child_process';
import os from 'os';

/**
 * Watchdog: disk usage on /, memory usage of the Node process.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Disk usage on / (parses df output)
  let diskUsedPct = 0;
  let diskAvailable = '';
  try {
    const out = execSync('df -h / | tail -1', { encoding: 'utf-8', timeout: 5000 });
    const parts = out.trim().split(/\s+/);
    diskUsedPct = parseInt(parts[4]?.replace('%', '') || '0', 10);
    diskAvailable = parts[3] || '';
  } catch (e: any) {
    console.error('df failed:', e.message);
  }

  if (diskUsedPct >= 90) {
    await recordHealth({
      check_name: 'disk_critical',
      severity: 'critical',
      status: 'fail',
      message: `Disk usage CRITICAL: ${diskUsedPct}% used, ${diskAvailable} available`,
      details: { diskUsedPct, diskAvailable },
    });
  } else if (diskUsedPct >= 80) {
    await recordHealth({
      check_name: 'disk_warning',
      severity: 'warning',
      status: 'warn',
      message: `Disk usage high: ${diskUsedPct}% used`,
      details: { diskUsedPct, diskAvailable },
    });
  } else {
    await recordHealth({
      check_name: 'disk_health',
      severity: 'info',
      status: 'ok',
      message: `Disk OK (${diskUsedPct}%)`,
      details: { diskUsedPct, diskAvailable },
    });
  }

  // Memory
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsedPct = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const processMemMB = Math.round(process.memoryUsage().rss / 1024 / 1024);

  if (memUsedPct >= 90) {
    await recordHealth({
      check_name: 'memory_high',
      severity: 'warning',
      status: 'warn',
      message: `System memory ${memUsedPct}% used, Node process ${processMemMB} MB`,
      details: { memUsedPct, processMemMB },
    });
  }

  return NextResponse.json({ diskUsedPct, diskAvailable, memUsedPct, processMemMB });
}
