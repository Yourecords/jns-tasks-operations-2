import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Whitelist public assets and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|css|js|map)$/i)
  ) {
    return NextResponse.next();
  }

  // 2. Whitelist /login page and NextAuth internal authentication API endpoints
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 3. Verify session token
  const secret = process.env.NEXTAUTH_SECRET;
  let token = null;

  try {
    token = await getToken({
      req,
      secret,
    });
  } catch (err) {
    // If token verification fails, token remains null
  }

  // Allow non-production dev fallback if cookie is present
  const isDev = process.env.NODE_ENV !== 'production';
  const hasDevCookie = isDev && Boolean(req.cookies.get('jns_user_id')?.value);

  const isAuthenticated = Boolean(token?.email) || hasDevCookie;

  if (!isAuthenticated) {
    // API routes return 401 JSON response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid authenticated session required.' },
        { status: 401 }
      );
    }

    // Web pages redirect to /login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
