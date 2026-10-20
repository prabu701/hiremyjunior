import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, SUPABASE_ANON_KEY } from '@/lib/env';

// Signed-in areas. Role checks happen in the app (RoleGate) and, authoritatively, in the database.
const PROTECTED = ['/home', '/onboarding', '/teen', '/parent', '/employer', '/admin', '/settings'];
// Pages a signed-in person shouldn't see again.
const GUEST_ONLY = ['/sign-in', '/sign-in/email', '/verify', '/get-started'];

/** Refreshes the Supabase session cookie on every request and does optimistic auth redirects. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_ANON_KEY, {
    cookieOptions: { name: AUTH_COOKIE },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const path = request.nextUrl.pathname;

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (signedIn && GUEST_ONLY.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Everything except static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|svg|webp|ico)$).*)'],
};
