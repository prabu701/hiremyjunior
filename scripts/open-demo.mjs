#!/usr/bin/env node
// Opens one browser window per demo account, each already signed in (via the normal e-mail
// code flow), side by side. Close the windows (or Ctrl-C) when done.
// Usage: pnpm demo [maya chen priya …]   (default: maya priya chen)
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const { chromium } = require('@playwright/test');

const BASE = process.env.WEB_URL ?? 'http://localhost:4000';
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['maya', 'priya', 'chen'];
const LABEL = { maya: 'Teen', jaden: 'Teen', sofia: 'Teen', priya: 'Parent', mark: 'Parent', elena: 'Parent', chen: 'Employer', patel: 'Employer', garcia: 'Employer', petsupply: 'Business', scoops: 'Business', ops: 'Admin' };
const W = 620, H = 900;
// Start further right when other demo windows are already open (e.g. SLOT=1).
const SLOT = Number(process.env.SLOT ?? 0);

const browsers = [];
for (const [i, name] of names.entries()) {
  const email = name.includes('@') ? name : `${name}@demo.test`;
  const session = execFileSync('node', [resolve(root, 'scripts/dev-session.mjs'), email], { encoding: 'utf8' });
  const browser = await chromium.launch({ headless: false, args: [`--window-position=${(i + SLOT) * (W + 10)},40`, `--window-size=${W},${H}`] });
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: null });
  await ctx.addCookies([{ name: 'sb-hmj-auth-token', value: 'base64-' + Buffer.from(session).toString('base64url'), url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/home`);
  await page.bringToFront();
  console.log(`✓ ${LABEL[name] ?? 'Account'}: ${email}`);
  browser.on('disconnected', () => {
    if (browsers.every((b) => !b.isConnected())) process.exit(0);
  });
}
// Test browsers open behind other apps on macOS; bring them forward.
if (process.platform === 'darwin') {
  try { execFileSync('osascript', ['-e', 'tell application "Google Chrome for Testing" to activate']); } catch { /* not fatal */ }
}
console.log('\nAll signed in. Close the windows (or press Ctrl-C here) when you are done.');
await new Promise(() => {});
