import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:3000',
    trace: 'off',
    channel: 'chromium',
    ...devices['iPhone 13'],
    defaultBrowserType: 'chromium',
  },
  reporter: 'list',
});
