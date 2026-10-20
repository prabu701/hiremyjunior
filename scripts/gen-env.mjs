#!/usr/bin/env node
// Generates a local-only .env with random secrets and matching Supabase API keys.
// Usage: node scripts/gen-env.mjs [--force]
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const envPath = resolve(root, '.env');
const force = process.argv.includes('--force');

if (existsSync(envPath) && !force) {
  console.log('.env already exists — keeping it (pass --force to regenerate; this invalidates existing sessions).');
  process.exit(0);
}

const secret = (bytes) => randomBytes(bytes).toString('hex');
const b64url = (input) => Buffer.from(input).toString('base64url');

function signJwt(payload, key) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', key).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const jwtSecret = secret(32);
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 3600;
const anonKey = signJwt({ role: 'anon', iss: 'supabase', iat, exp }, jwtSecret);
const serviceKey = signJwt({ role: 'service_role', iss: 'supabase', iat, exp }, jwtSecret);

const template = readFileSync(resolve(root, '.env.example'), 'utf8');
const values = {
  POSTGRES_PASSWORD: secret(16),
  JWT_SECRET: jwtSecret,
  ANON_KEY: anonKey,
  SERVICE_ROLE_KEY: serviceKey,
  PG_META_CRYPTO_KEY: secret(16),
};

const out = template.replace(/^([A-Z_]+)=__GENERATED__$/gm, (line, name) =>
  name in values ? `${name}=${values[name]}` : line,
);
writeFileSync(envPath, out, { mode: 0o600 });
console.log('Wrote .env with fresh local secrets.');
