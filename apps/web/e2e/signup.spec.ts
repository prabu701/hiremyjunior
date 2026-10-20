import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('a new parent signs up, onboards and lands on their dashboard', async ({ page }) => {
  const email = `parent-${Date.now()}@e2e.test`;
  await signIn(page, email, 'parent');
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByTestId('full-name').fill('Erin Example');
  await page.getByTestId('zip').fill('98074');
  await page.getByTestId('city').fill('Sammamish');
  await page.getByTestId('save-profile').click();
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page.getByTestId('greeting')).toHaveText('Hey, Erin');
  await expect(page.getByTestId('setup-checklist')).toContainText('Verify your phone number');
  await expect(page.getByTestId('setup-checklist')).toContainText('Verify your identity');
});

test('an existing email signing up under another role keeps its role', async ({ page }) => {
  await signIn(page, 'priya@demo.test', 'employer');
  await expect(page).toHaveURL(/\/parent/);
  await expect(page.getByText("You're signed in as a Parent")).toBeVisible();
});
