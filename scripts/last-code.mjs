#!/usr/bin/env node
// Prints the latest 6-digit code Mailpit caught for an address (sign-in codes, simulated SMS).
// Usage: pnpm code maya@test.local
const email = process.argv[2];
if (!email) {
  console.error('usage: pnpm code <email>');
  process.exit(2);
}
const base = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const search = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=1`).then((r) => r.json());
const latest = search.messages?.[0];
if (!latest) {
  console.error(`no mail for ${email} yet`);
  process.exit(1);
}
const msg = await fetch(`${base}/api/v1/message/${latest.ID}`).then((r) => r.json());
const code = /\b(\d{6})\b/.exec(msg.Text ?? '')?.[1];
console.log(code ?? `(no code in "${latest.Subject}")`);
