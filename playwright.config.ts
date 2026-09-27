import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, dependencies: ['setup'], testIgnore: /.*\.setup\.ts/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'], testIgnore: /.*\.setup\.ts/ },
  ],
  webServer: {
    command: 'npx tsx scripts/e2e-serve.ts',
    url: 'http://localhost:3100/en',
    timeout: 600_000,
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
