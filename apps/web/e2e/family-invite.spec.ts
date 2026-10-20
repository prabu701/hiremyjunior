import { expect, test } from '@playwright/test';

// A brand-new parent invites their teen with a link; the teen signs up from it and is linked.
test('parent signs up, shares an invite link, teen joins from it and the parent confirms', async ({ browser }) => {
  const n = String(Date.now()).slice(-4);
  const signIn = async (page: import('@playwright/test').Page, url: string, phone: string) => {
    await page.goto(url);
    await page.getByTestId('phone').fill(phone);
    await page.getByTestId('send-phone-code').click();
    await page.getByTestId('code-0').fill('0000');
  };

  // Parent: new number → parent → onboarding → invite link.
  const parentCtx = await browser.newContext();
  const parent = await parentCtx.newPage();
  await signIn(parent, '/sign-in', `206555${n}`);
  await parent.getByTestId('new-role-parent').click();
  await expect(parent).toHaveURL(/\/onboarding/);
  await expect(parent.getByLabel('Phone')).toHaveValue(`(206) 555-${n}`);
  await parent.getByTestId('full-name').fill('Pat Parent');
  await parent.getByTestId('zip').fill('98074');
  await parent.getByTestId('city').fill('Sammamish');
  await parent.getByTestId('save-profile').click();
  await expect(parent).toHaveURL(/\/parent$/);
  await parent.goto('/parent/teens/invite');
  await parent.getByTestId('new-invite').click();
  const link = (await parent.getByTestId('invite-link').innerText()).trim();
  expect(link).toMatch(/\/join\/[A-Z0-9]{8}$/);

  // Teen, on their own device: open the link → sign up (role is implied) → onboarding → linked.
  const teenCtx = await browser.newContext();
  const teen = await teenCtx.newPage();
  await teen.goto(link);
  await expect(teen.getByText('Your parent invited you')).toBeVisible();
  await teen.getByTestId('phone').fill(`253555${n}`);
  await teen.getByTestId('send-phone-code').click();
  await teen.getByTestId('code-0').fill('0000');
  await expect(teen).toHaveURL(/\/onboarding/);
  await teen.getByTestId('full-name').fill('Taylor Teen');
  await teen.getByTestId('dob').fill('05/20/2011');
  await teen.getByTestId('school').fill('Skyline High School');
  await teen.getByTestId('zip').fill('98074');
  await teen.getByTestId('city').fill('Sammamish');
  await teen.getByTestId('save-profile').click();
  await expect(teen).toHaveURL(/\/teen\/link-parent/);
  await expect(teen.getByText('Request sent!')).toBeVisible();

  // Parent confirms.
  await parent.goto('/parent/teens');
  await parent.getByText('Taylor Teen').click();
  await parent.getByTestId('attest-dob').fill('05/20/2011');
  await parent.getByTestId('attest-checkbox').check();
  await parent.getByTestId('confirm-teen').click();
  await expect(parent).toHaveURL(/\/parent\/teens$/);
  await expect(parent.getByText('Linked teen')).toBeVisible();

  // The teen's checklist now waits only on the parent's ID check and proof of age.
  await teen.goto('/teen');
  await expect(teen.getByText('Waiting for Pat to verify their ID')).toBeVisible();
});
