#!/usr/bin/env node
// Dev/test helper: signs an account in through the real e-mail OTP flow (reading the code from
// Mailpit) and prints the session JSON. Creates the account with <role> if it doesn't exist.
// Usage: node scripts/dev-session.mjs <email> [junior|parent|employer]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [email, role] = process.argv.slice(2);
const env = Object.fromEntries(
  readFileSync(resolve(import.meta.dirname, '..', '.env'), 'utf8')
    .split('\n').filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const api = env.SUPABASE_PUBLIC_URL;
const headers = { apikey: env.ANON_KEY, 'content-type': 'application/json' };
const mail = 'http://localhost:8025';

let before;
for (let attempt = 0; ; attempt++) {
  before = new Date();
  const otp = await fetch(`${api}/auth/v1/otp`, {
    method: 'POST', headers,
    body: JSON.stringify({ email, create_user: !!role, data: role ? { role } : undefined }),
  });
  if (otp.ok) break;
  // GoTrue allows one code per address every few seconds locally; wait it out.
  if (otp.status === 429 && attempt < 3) { await new Promise((r) => setTimeout(r, 5000)); continue; }
  throw new Error(`otp: ${otp.status} ${await otp.text()}`);
}

let code;
for (let i = 0; i < 20 && !code; i++) {
  await new Promise((r) => setTimeout(r, 300));
  const s = await fetch(`${mail}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=1`).then((r) => r.json());
  const m = s.messages?.[0];
  if (m && new Date(m.Created) >= new Date(before.getTime() - 1000)) {
    const full = await fetch(`${mail}/api/v1/message/${m.ID}`).then((r) => r.json());
    code = /\b(\d{6})\b/.exec(full.Text)?.[1];
  }
}
if (!code) throw new Error('no code arrived');
const session = await fetch(`${api}/auth/v1/verify`, { method: 'POST', headers, body: JSON.stringify({ email, token: code, type: 'email' }) }).then((r) => r.json());
if (!session.access_token) throw new Error(JSON.stringify(session));
process.stdout.write(JSON.stringify(session));
