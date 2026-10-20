import { expect, test } from '@playwright/test';
import { signInWithPhone } from './helpers';

test('a demo teen signs in with their phone number and code 0000', async ({ page }) => {
  await signInWithPhone(page, '425-555-0101');
  await expect(page).toHaveURL(/\/teen/);
  await expect(page.getByTestId('greeting')).toHaveText('Hey, Maya');
});

test('a new number picks a role, gets an account and lands on onboarding', async ({ page }) => {
  const phone = `206555${String(Date.now()).slice(-4)}`;
  await signInWithPhone(page, phone);
  await page.getByTestId('new-role-employer').click();
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByText('Set up your employer account')).toBeVisible();
});

test('a wrong code is rejected', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByTestId('phone').fill('4255550201');
  await page.getByTestId('send-phone-code').click();
  await page.getByTestId('code-0').fill('1234');
  await expect(page.getByText("That code isn't right")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});
