import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.ts';
import { HttpError } from './http.ts';

/** Service-role client: bypasses RLS. Only ever used server-side, after authorizing the caller. */
export const admin: SupabaseClient = createClient(env.supabaseUrl, env.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface Caller {
  id: string;
  email: string | null;
  role: 'junior' | 'parent' | 'employer' | 'admin';
  full_name: string | null;
  phone: string | null;
  status: string;
  onboarded_at: string | null;
}

/** Resolve the signed-in user from the Authorization header, with their profile. */
export async function requireCaller(req: Request): Promise<Caller> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sign in again.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sign in again.');
  const { data: profile, error: pe } = await admin
    .from('profiles')
    .select('id, email, role, full_name, phone, status, onboarded_at')
    .eq('id', data.user.id)
    .single();
  if (pe || !profile) throw new HttpError(403, 'Profile not found.');
  if (profile.status === 'suspended') throw new HttpError(403, 'Your account is suspended. Contact support.');
  return profile as Caller;
}

/** Call a service-role SQL function; our P0001/hmj errors are user-safe messages. */
export async function svc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(fn, args);
  if (error) {
    if (error.hint === 'hmj') throw new HttpError(400, error.message);
    throw new Error(`${fn}: ${error.message}`);
  }
  return data as T;
}
