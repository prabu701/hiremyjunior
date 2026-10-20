#!/usr/bin/env node
// Loads demo data: creates the demo auth users through the GoTrue admin API (so they can sign in
// with e-mail codes like anyone else), then applies supabase/seed.sql. Safe to re-run.
// Usage: pnpm db:seed
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

const users = {
  parent: ['priya', 'mark', 'elena'],
  junior: ['maya', 'jaden', 'sofia'],
  employer: ['chen', 'patel', 'garcia', 'petsupply', 'scoops'],
};

async function createUser(email, role, admin = false) {
  const res = await fetch(`${env.SUPABASE_PUBLIC_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: env.SERVICE_ROLE_KEY, authorization: `Bearer ${env.SERVICE_ROLE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email, email_confirm: true, user_metadata: { role }, ...(admin ? { app_metadata: { role: 'admin' } } : {}) }),
  });
  if (res.ok) return 'created';
  const body = await res.json().catch(() => ({}));
  if (res.status === 422 && /already/i.test(body.msg ?? body.message ?? '')) return 'exists';
  throw new Error(`${email}: ${res.status} ${JSON.stringify(body)}`);
}

let created = 0;
for (const [role, names] of Object.entries(users)) {
  for (const name of names) if ((await createUser(`${name}@demo.test`, role)) === 'created') created++;
}
if ((await createUser('ops@demo.test', 'parent', true)) === 'created') created++;
console.log(`auth users: ${created} created`);

const out = execFileSync('docker', ['compose', 'run', '--rm', '-T', 'migrate', 'seed'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
console.log(out.trim().split('\n').filter((l) => l.startsWith('seed:')).join('\n') || out.trim());
