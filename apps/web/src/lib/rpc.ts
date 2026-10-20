import type { Database } from '@hmj/shared';
import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabase } from './supabase/client';

/**
 * Errors raised by our SQL functions via public.fail() carry hint 'hmj' and a message written for
 * end users; anything else is unexpected and gets generic copy (details go to the console).
 */
export class AppError extends Error {}

export function toAppError(error: PostgrestError | Error | null | undefined): AppError {
  if (!error) return new AppError('Something went wrong.');
  if ('hint' in error && error.hint === 'hmj') return new AppError(error.message);
  if (/fetch|network/i.test(error.message)) return new AppError("Can't reach HireMyJunior. Check your connection and try again.");
  console.warn('[hmj] unexpected error', error);
  return new AppError('Something went wrong. Please try again.');
}

type Fns = Database['public']['Functions'];
type ArgsFor<F extends keyof Fns> = [Fns[F]['Args']] extends [never] ? [] : Fns[F]['Args'] extends Record<string, never> ? [] : [args: Fns[F]['Args']];

/** Typed RPC call (types from the generated schema) that throws AppError on failure. */
export async function rpc<F extends keyof Fns & string>(fn: F, ...args: ArgsFor<F>): Promise<Fns[F]['Returns']> {
  const { data, error } = await getSupabase().rpc(fn, args[0] as never);
  if (error) throw toAppError(error);
  return data as Fns[F]['Returns'];
}

export function errorMessage(e: unknown): string {
  return e instanceof AppError ? e.message : e instanceof Error ? toAppError(e).message : 'Something went wrong.';
}

/** Unwrap a Supabase response, converting errors to AppError. */
export function unwrap<T>({ data, error }: { data: T; error: PostgrestError | null }): T {
  if (error) throw toAppError(error);
  return data;
}

/** Like unwrap, for queries that must return a row (`.single()`). */
export function unwrapOne<T>(res: { data: T; error: PostgrestError | null }): NonNullable<T> {
  const data = unwrap(res);
  if (data == null) throw new AppError('Not found.');
  return data;
}
