import { defineConfig } from 'vitest/config';

// Unit tests only; Playwright end-to-end specs live in e2e/ and run with `pnpm e2e`.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
});
