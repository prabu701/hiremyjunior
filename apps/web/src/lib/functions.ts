'use client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { AppError } from './rpc';
import { getSupabase } from './supabase/client';

/** Call an Edge Function with the user's session; throws AppError with the function's message. */
export async function callFunction<T = Record<string, unknown>>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke<T>(name, { body: body ?? {} });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new AppError(payload?.message ?? 'Something went wrong. Please try again.');
    }
    throw new AppError("Can't reach HireMyJunior. Check your connection and try again.");
  }
  return data as T;
}
