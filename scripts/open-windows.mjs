#!/usr/bin/env node
// Opens clean, signed-OUT browser windows (each with its own cookies) at the given pages, tiled
// in a grid. Handy for trying sign-up flows with several people at once.
// Usage: node scripts/open-windows.mjs "Parent=http://localhost:4000/sign-in" "Teen=http://localhost:4000/get-started" …
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const { chromium } = require('@playwright/test');

const items = process.argv.slice(2).map((a) => {
  const i = a.indexOf('=');
  return { label: a.slice(0, i), url: a.slice(i + 1) };
});
const SCREEN_W = Number(process.env.SCREEN_W ?? 1512);
const SCREEN_H = Number(process.env.SCREEN_H ?? 982);
const cols = items.length <= 2 ? items.length : 2;
const rows = Math.ceil(items.length / cols);
const W = Math.floor(SCREEN_W / cols);
const H = Math.floor((SCREEN_H - 30) / rows);

const browsers = [];
for (const [i, { label, url }] of items.entries()) {
  const x = (i % cols) * W;
  const y = 30 + Math.floor(i / cols) * H;
  const browser = await chromium.launch({ headless: false, args: [`--window-position=${x},${y}`, `--window-size=${W},${H}`] });
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: null });
  const page = await ctx.newPage();
  await page.goto(url);
  // Label the tab so the windows are easy to tell apart.
  await page.evaluate((l) => { document.title = `[${l}] ${document.title}`; }, label).catch(() => {});
  console.log(`✓ ${label}: ${url}`);
  browser.on('disconnected', () => {
    if (browsers.every((b) => !b.isConnected())) process.exit(0);
  });
}
if (process.platform === 'darwin') {
  try { execFileSync('osascript', ['-e', 'tell application "Google Chrome for Testing" to activate']); } catch { /* not fatal */ }
}
console.log('\nAll open. Close the windows (or press Ctrl-C) when you are done.');
await new Promise(() => {});
