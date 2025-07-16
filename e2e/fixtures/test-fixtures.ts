import { expect, test as base } from '@playwright/test';
import { MapPage } from '../pages/map-page';
import { ApiMockManager, createApiMocks } from './api-mocks';

/**
 * Extended test fixtures with API mocking capabilities
 */
type TestFixtures = {
  mapPage: MapPage;
  apiMocks: ApiMockManager;
};

/**
 * Test fixture that automatically sets up API mocks and page objects
 */
export const test = base.extend<TestFixtures>({
  // API Mock Manager fixture
  apiMocks: async ({ page }, use) => {
    const apiMocks = createApiMocks(page);
    await apiMocks.setupDefaultMocks();
    await use(apiMocks);
    await apiMocks.clearAllMocks();
  },

  // Map Page fixture with API mocks pre-configured
  mapPage: async ({ page, apiMocks }, use) => {
    const mapPage = new MapPage(page);
    await use(mapPage);
  },
});

/**
 * Test fixture without API mocks for integration tests
 */
export const integrationTest = base.extend<{ mapPage: MapPage }>({
  mapPage: async ({ page }, use) => {
    const mapPage = new MapPage(page);
    await use(mapPage);
  },
});

/**
 * Test fixture with custom API mock setup
 */
export const testWithCustomMocks = base.extend<TestFixtures>({
  apiMocks: async ({ page }, use) => {
    const apiMocks = createApiMocks(page);
    // Don't set up default mocks - let tests configure their own
    await use(apiMocks);
    await apiMocks.clearAllMocks();
  },

  mapPage: async ({ page }, use) => {
    const mapPage = new MapPage(page);
    await use(mapPage);
  },
});

// Re-export expect for convenience
export { expect };
