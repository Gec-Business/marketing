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

  if (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/health')) {
    if (!session.is_logged_in) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/operator/:path*', '/portal/:path*', '/api/((?!auth|health).*)'],
};
