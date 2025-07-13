import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting global setup e2e tests...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:4200');
    console.log('Application is accessible');
  } catch (error) {
    console.error('Application is not accessible:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('Global setup completed');
}

export default globalSetup;
