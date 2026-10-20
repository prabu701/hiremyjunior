// Dev helper: screenshot a URL at desktop and phone widths.
// Usage: node scripts/shot.mjs <url> <outPrefix> [--full] [--session=<json file>] [--theme=midnight]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const [url, out] = process.argv.slice(2);
const full = process.argv.includes('--full');
const sessionArg = process.argv.find((a) => a.startsWith('--session='));
const theme = process.argv.find((a) => a.startsWith('--theme='))?.split('=')[1];
const widths = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]?.split(',') ?? ['desktop', 'phone'];
const SIZES = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };

const browser = await chromium.launch();
for (const name of widths) {
  const ctx = await browser.newContext({ viewport: SIZES[name], deviceScaleFactor: name === 'phone' ? 2 : 1 });
  const cookies = [];
  if (sessionArg) {
    // @supabase/ssr cookie format: "base64-" + base64url(JSON session)
    const session = readFileSync(sessionArg.split('=')[1], 'utf8');
    cookies.push({ name: 'sb-hmj-auth-token', value: 'base64-' + Buffer.from(session).toString('base64url'), url: new URL(url).origin });
  }
  if (theme) cookies.push({ name: 'hmj-theme', value: theme, url: new URL(url).origin });
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}-${name}.png`, fullPage: full });
  console.log(`${name}: ${page.url()}${errors.length ? `  ERRORS: ${errors.join(' | ').slice(0, 400)}` : ''}`);
  await ctx.close();
}
await browser.close();
