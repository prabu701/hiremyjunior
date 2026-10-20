#!/usr/bin/env node
// Provisions an ops admin via the GoTrue admin API (service role). Admin is carried in
// app_metadata, which users can't set, and the on_auth_user_created trigger turns it into an
// admin profile. Then sign in at <app>/sign-in?role=admin with the e-mailed code.
// Usage: pnpm admin:create ops@hiremyjunior.local
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const email = process.argv[2];
if (!email) {
  console.error('usage: pnpm admin:create <email>');
  process.exit(2);
}
const env = Object.fromEntries(
  readFileSync(resolve(import.meta.dirname, '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const res = await fetch(`${env.SUPABASE_PUBLIC_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: env.SERVICE_ROLE_KEY, authorization: `Bearer ${env.SERVICE_ROLE_KEY}`, 'content-type': 'application/json' },
  // user_metadata.role satisfies the sign-up trigger; app_metadata.role=admin then promotes the
  // account (on_auth_user_promoted). Users can set user_metadata but never app_metadata.
  body: JSON.stringify({ email, email_confirm: true, user_metadata: { role: 'parent' }, app_metadata: { role: 'admin' } }),
});
const body = await res.json();
if (!res.ok) {
  console.error(`failed (${res.status}):`, body.msg ?? body.message ?? body);
  process.exit(1);
}
console.log(`admin ${email} created — sign in at ${env.SITE_URL}/sign-in?role=admin`);
