import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/auth', '/auth/callback'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    const isPublic = PUBLIC_ROUTES.some(r => req.nextUrl.pathname.startsWith(r));

    // Not logged in + trying to access protected route → redirect to auth
    if (!session && !isPublic) {
      const redirectUrl = new URL('/auth', req.url);
      redirectUrl.searchParams.set('next', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Already logged in + hitting /auth → redirect to dashboard
    if (session && req.nextUrl.pathname === '/auth') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return res;
  } catch {
    // On error, allow request through (avoids infinite redirect loops)
    return res;
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)'],
};