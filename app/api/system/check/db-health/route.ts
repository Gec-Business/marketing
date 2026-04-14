import { NextRequest, NextResponse } from 'next/server';
import { pool, queryOne } from '@/lib/db';
import { recordHealth, verifyCronSecret } from '@/lib/system-health';

/**
 * Watchdog: database connection pool health and query latency.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  let dbOk = false;
  let latencyMs = 0;
  try {
    await queryOne('SELECT 1 as ok');
    dbOk = true;
    latencyMs = Date.now() - start;
  } catch (e: any) {
    await recordHealth({
      check_name: 'db_health',
      severity: 'critical',
      status: 'fail',
      message: `Database query failed: ${e.message}`,
      details: { error: e.message },
    });
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }

  const totalConnections = pool.totalCount;
  const idleConnections = pool.idleCount;
  const waitingClients = pool.waitingCount;

  if (latencyMs > 2000) {
    await recordHealth({
      check_name: 'db_slow',
      severity: 'warning',
      status: 'warn',
      message: `DB query latency high: ${latencyMs}ms`,
      details: { latencyMs, totalConnections, idleConnections, waitingClients },
    });
  } else if (waitingClients > 5) {
    await recordHealth({
      check_name: 'db_pool_saturated',
      severity: 'error',
      status: 'fail',
      message: `DB connection pool saturated: ${waitingClients} clients waiting`,
      details: { totalConnections, idleConnections, waitingClients },
    });
  } else {
    await recordHealth({
      check_name: 'db_health',
      severity: 'info',
      status: 'ok',
      message: `DB healthy (${latencyMs}ms latency)`,
      details: { latencyMs, totalConnections, idleConnections, waitingClients },
    });
  }

  return NextResponse.json({ ok: dbOk, latencyMs, totalConnections, idleConnections, waitingClients });
}
