import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@hmj/shared';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, SUPABASE_ANON_KEY } from '@/lib/env';

/** Server-component client. Uses the internal API URL inside Docker. */
export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient<Database>(process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_ANON_KEY, {
    cookieOptions: { name: AUTH_COOKIE },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
