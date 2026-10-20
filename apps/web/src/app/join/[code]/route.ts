import { NextResponse, type NextRequest } from 'next/server';
import { INVITE_COOKIE } from '@/lib/invite';

/** Parent's invite link: remember the code, then send the teen to sign up / link. */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Relative Location: behind Docker/proxies the server's own host (e.g. 0.0.0.0:3000) isn't
  // the address the browser used.
  const redirect = (path: string) => new NextResponse(null, { status: 307, headers: { Location: path } });
  if (!/^[A-Z0-9]{8}$/.test(clean)) return redirect('/get-started');

  // Signed-in teens go straight to linking; everyone else is sent to sign up first (proxy.ts).
  const res = redirect(`/teen/link-parent?code=${clean}`);
  res.cookies.set(INVITE_COOKIE, clean, { path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' });
  return res;
}
