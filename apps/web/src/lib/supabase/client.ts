'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@hmj/shared';
import { AUTH_COOKIE, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser client (session in cookies, shared with the server). One instance per tab. */
export function getSupabase() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { cookieOptions: { name: AUTH_COOKIE } });
  return client;
}
