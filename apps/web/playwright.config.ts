import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against a running stack (default: the Docker website on :4000).
//   pnpm --filter @hmj/web e2e                     # Docker
//   E2E_BASE_URL=http://localhost:3005 pnpm e2e    # dev server
// Requires `pnpm db:seed` (demo accounts) and Mailpit on :8025 for sign-in codes.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
