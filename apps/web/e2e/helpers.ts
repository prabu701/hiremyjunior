import { expect, type Page } from '@playwright/test';

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

/** Latest 6-digit code mailed to `email` after `since`. Polls Mailpit. */
export async function codeFor(email: string, since: Date): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=1`).then((r) => r.json());
    const m = res.messages?.[0];
    if (m && new Date(m.Created).getTime() >= since.getTime() - 1500) {
      const full = await fetch(`${MAILPIT}/api/v1/message/${m.ID}`).then((r) => r.json());
      const code = /\b(\d{6})\b/.exec(full.Text ?? '')?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no code for ${email}`);
}

/** Sign in through the real email UI (email → code). Pass `role` to create the account if new. */
export async function signIn(page: Page, email: string, role?: 'junior' | 'parent' | 'employer') {
  await page.context().clearCookies();
  await page.goto(role ? `/sign-in/email?role=${role}` : '/sign-in/email');
  // GoTrue allows one code per address every few seconds; wait it out between quick re-sign-ins.
  for (let attempt = 0; attempt < 3; attempt++) {
    const since = new Date();
    await page.getByTestId('email').fill(email);
    await page.getByTestId('send-code').click();
    const outcome = await Promise.race([
      page.waitForURL(/\/verify/, { timeout: 8000 }).then(() => 'ok' as const),
      page.getByText(/wait a few seconds/i).waitFor({ timeout: 8000 }).then(() => 'rate' as const),
    ]);
    if (outcome === 'rate') { await page.waitForTimeout(5500); continue; }
    const code = await codeFor(email, since);
    await page.getByTestId('code-0').fill(code);
    await page.waitForURL((u) => !/\/(verify|sign-in)/.test(u.pathname), { timeout: 15000 });
    return;
  }
  throw new Error(`could not sign in ${email}`);
}

export async function expectNoAppErrors(page: Page) {
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
}

/** Sign in with a phone number and the local test code (PHONE_LOGIN_TEST_CODE=0000). */
export async function signInWithPhone(page: Page, phone: string, role?: 'junior' | 'parent' | 'employer') {
  await page.context().clearCookies();
  await page.goto(role ? `/sign-in?role=${role}` : '/sign-in');
  await page.getByTestId('phone').fill(phone);
  await page.getByTestId('send-phone-code').click();
  await page.getByTestId('code-0').fill('0000');
}
