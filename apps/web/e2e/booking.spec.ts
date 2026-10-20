import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// One full household (Track A) booking, through every party's UI.
test('post → apply → parent approves → employer confirms → address revealed', async ({ page }) => {
  const title = `E2E Leaf Raking ${Date.now().toString(36)}`;
  const inTwoWeeks = new Date(Date.now() + 14 * 864e5);
  const date = `${String(inTwoWeeks.getMonth() + 1).padStart(2, '0')}/${String(inTwoWeeks.getDate()).padStart(2, '0')}/${inTwoWeeks.getFullYear()}`;

  // Employer posts a job.
  await signIn(page, 'chen@demo.test');
  await page.goto('/employer/jobs/new');
  await page.getByTestId('job-title').fill(title);
  await page.getByRole('checkbox', { name: 'Yard Work' }).click();
  await page.getByTestId('job-description').fill('Rake the front and back yard and bag the leaves. Rakes and bags provided.');
  await page.getByTestId('job-rate').fill('19.50');
  await page.getByTestId('shift-0-date').fill(date);
  await page.getByTestId('shift-0-start').fill('1pm');
  await page.getByTestId('shift-0-end').fill('3:30 PM');
  await page.getByTestId('job-address').fill('2417 228th Ave NE');
  await page.getByTestId('publish-job').click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByText('$19.50/hr').first()).toBeVisible();
  const jobUrl = page.url();
  const jobId = jobUrl.split('/').pop()!;

  // Teen finds and applies — with a phone number in the note.
  await signIn(page, 'maya@demo.test');
  await page.goto('/teen/search');
  await page.getByTestId('search-input').fill(title.split(' ').slice(-1)[0]!);
  await page.getByTestId(`job-${jobId}`).click();
  await expect(page.getByText('2417 228th Ave NE')).toHaveCount(0); // address hidden before confirmation
  await page.getByTestId('application-message').fill('I rake every fall at home. Text me at 425-555-0147.');
  await page.getByTestId('apply').click();
  await expect(page.getByText('Application sent!')).toBeVisible();
  const bookingId = page.url().split('/').pop()!.split('?')[0]!;

  // Parent approves.
  await signIn(page, 'priya@demo.test');
  await page.goto(`/parent/approvals/${bookingId}`);
  await expect(page.getByText('425-555-0147')).toBeVisible(); // guardians see the note as written
  await page.getByTestId('approve').click();
  await expect(page.getByText('Parent approved').first()).toBeVisible();

  // Employer: note was masked before confirmation; confirm.
  await signIn(page, 'chen@demo.test');
  await page.goto(`/employer/requests/${bookingId}`);
  await expect(page.getByText('[contact hidden]')).toBeVisible();
  await page.getByTestId('accept').click();
  await expect(page.getByText('Confirmed').first()).toBeVisible();
  await expect(page.getByText('425-555-0147')).toBeVisible();

  // Teen now sees the address and the employer's contact.
  await signIn(page, 'maya@demo.test');
  await page.goto(`/teen/requests/${bookingId}`);
  await expect(page.getByText('2417 228th Ave NE')).toBeVisible();
  await expect(page.getByText('Wei Chen')).toBeVisible();
});
