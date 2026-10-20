import { expect, test } from '@playwright/test';

test('landing page presents the product and routes each audience', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Real jobs for teens');
  await expect(page.getByText('ID-verified parents').first()).toBeVisible();
  for (const tab of ['Parents', 'Employers', 'Teens']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
  }
  await page.getByRole('link', { name: 'Get started' }).first().click();
  await expect(page).toHaveURL(/\/get-started/);
  await page.getByTestId('role-parent').click();
  await expect(page).toHaveURL(/\/sign-in\?role=parent/);
  await expect(page.getByTestId('phone')).toBeVisible();
});

test('signed-out visitors are sent to sign in, then back', async ({ page }) => {
  await page.goto('/teen/search');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fteen%2Fsearch/);
});
