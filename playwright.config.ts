import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],
  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env['CI'] ? 1 : undefined,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:4200',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for each action - increased for map operations */
    actionTimeout: 15000,

    /* Global timeout for navigation - increased for map loading */
    navigationTimeout: 45000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/mobile-*.spec.ts', '**/tablet-*.spec.ts'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ['**/mobile-*.spec.ts', '**/tablet-*.spec.ts'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/mobile-*.spec.ts'],
    },
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
      testMatch: ['**/tablet-*.spec.ts'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),

  /* Test timeout - increased for map operations */
  timeout: 60 * 1000,

  /* Expect timeout - increased for map stability checks */
  expect: {
    timeout: 10000,
  },

  /* Output directory for test results */
  outputDir: 'test-results/',
});
