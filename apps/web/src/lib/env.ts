// NEXT_PUBLIC_* values are inlined at build time.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// One cookie name for browser and server: the server reaches the API on a different host
// inside Docker (gateway:8000), which would otherwise change the derived cookie name.
export const AUTH_COOKIE = 'sb-hmj-auth-token';
