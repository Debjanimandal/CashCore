import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseTokenClaims(token: string | undefined): { role?: string; wallet?: string } | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('cc_session')?.value;
  const claims = parseTokenClaims(sessionCookie);

  // Admin routes — require admin role
  if (pathname.startsWith('/admin')) {
    if (!claims || claims.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Protected user routes — require any auth
  const protectedPaths = ['/dashboard', '/wallet', '/activity', '/profile', '/send', '/connect-wallet'];
  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    if (!claims) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Redirect logged-in users away from login
  if (pathname === '/login' && claims) {
    const dest = claims.role === 'admin' ? '/admin/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/wallet/:path*',
    '/activity/:path*',
    '/profile/:path*',
    '/send/:path*',
    '/connect-wallet/:path*',
    '/connect-wallet',
    '/login',
  ],
};
