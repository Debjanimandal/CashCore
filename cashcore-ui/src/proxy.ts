import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge-runtime-safe base64url decoder (no Buffer)
function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const rem = padded.length % 4;
  const full = rem ? padded + '='.repeat(4 - rem) : padded;
  return atob(full);
}

function parseToken(token: string | undefined): Record<string, any> | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('cc_session')?.value;
  const claims = parseToken(sessionCookie);

  const isAuthenticated = !!(claims?.sub);
  const isAdmin = claims?.user_metadata?.role === 'admin';

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Protected user routes
  const protectedPaths = ['/dashboard', '/wallet', '/activity', '/profile', '/send', '/connect-wallet'];
  if (protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Redirect authenticated users away from login/register
  if ((pathname === '/login' || pathname === '/register') && isAuthenticated) {
    return NextResponse.redirect(new URL(isAdmin ? '/admin/dashboard' : '/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/wallet',
    '/wallet/:path*',
    '/activity',
    '/activity/:path*',
    '/profile',
    '/profile/:path*',
    '/send',
    '/send/:path*',
    '/connect-wallet',
    '/connect-wallet/:path*',
    '/login',
    '/register',
  ],
};
