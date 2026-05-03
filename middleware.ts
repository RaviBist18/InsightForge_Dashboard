import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/auth'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Allow all auth routes through
  const isPublic = PUBLIC_ROUTES.some(r =>
    request.nextUrl.pathname.startsWith(r)
  );
  if (isPublic) return response;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({
              request: { headers: request.headers },
            })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({
              request: { headers: request.headers },
            })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    return response;

  } catch {
    // On error let through — never block the user
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|auth|.*\\.png|.*\\.svg|.*\\.ico).*)',
  ],
};