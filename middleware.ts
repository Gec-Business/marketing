import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import type { SessionData } from '@/lib/types';

export async function middleware(req: NextRequest) {
  const session = await getIronSession<SessionData>(req.cookies as any, {
    password: process.env.SESSION_SECRET!,
    cookieName: 'mk-session',
  });

  const path = req.nextUrl.pathname;

  if (path.startsWith('/operator')) {
    if (!session.is_logged_in || (session.role !== 'operator' && session.role !== 'admin')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  if (path.startsWith('/portal')) {
    if (!session.is_logged_in || session.role !== 'tenant') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Cron-secret-protected paths bypass session auth (they verify secret themselves).
  // Use strict matching: path must equal the prefix OR continue with a '/' to prevent
  // bypass via crafted paths like /api/system/digestauth/login
  const cronPrefixes = [
    '/api/publish/cron',
    '/api/invoices/auto-generate',
    '/api/reports/auto-generate',
    '/api/system/digest',
  ];
  const isCronPath =
    cronPrefixes.some((p) => path === p || path.startsWith(p + '/')) ||
    /^\/api\/system\/check\/[a-z0-9-]+\/?$/.test(path);

  // Public endpoints (no auth needed) — strict equality
  const isPublicPath =
    path === '/api/data-deletion' || path.startsWith('/api/data-deletion/') ||
    path === '/api/connect/facebook/callback' ||
    path === '/api/connect/facebook/select-page' ||
    path === '/api/connect/linkedin/callback' ||
    path === '/api/connect/tiktok/callback';

  if (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/health') && !isCronPath && !isPublicPath) {
    if (!session.is_logged_in) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/operator/:path*', '/portal/:path*', '/api/((?!auth|health).*)'],
};
