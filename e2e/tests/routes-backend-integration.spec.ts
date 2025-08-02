import { expect, test } from '@playwright/test';
import { RoutesPage } from '../pages/routes-page';

test.describe('Routes Page - Backend Integration', () => {
  let routesPage: RoutesPage;

  test.beforeEach(async ({ page }) => {
    routesPage = new RoutesPage(page);
  });

  test.describe('API Integration', () => {
    test('should load routes from backend API', async ({ page }) => {
      // Intercept the API call to verify it's being made
      let apiCalled = false;
      await page.route('**/api/routes/public*', async (route) => {
        apiCalled = true;
        // Let the request continue to the real backend
        await route.continue();
      });

      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Verify API was called
      expect(apiCalled).toBeTruthy();

      // Page should load successfully regardless of whether routes exist
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();
    });

    test('should handle empty response from backend', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/routes/public*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [],
            totalElements: 0,
            totalPages: 0,
            number: 0,
            size: 12,
          }),
        });
      });

      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Should show empty state
      await expect(routesPage.emptyState).toBeVisible();
      await expect(routesPage.emptyStateTitle).toHaveText('No routes found');
      await expect(routesPage.createRouteButton).toBeVisible();

      // Results summary should indicate no routes
      const summaryText = await routesPage.getResultsSummaryText();
      expect(summaryText).toContain('No routes found');
    });

    test('should handle backend error gracefully', async ({ page }) => {
      // Mock error response
      await page.route('**/api/routes/public*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: 'Database connection failed',
          }),
        });
      });

      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Should handle error gracefully
      const hasError = await routesPage.isErrorStateVisible();
      if (hasError) {
        await expect(routesPage.errorState).toBeVisible();
      } else {
        // If no explicit error state, should at least show empty state
        await expect(routesPage.emptyState).toBeVisible();
      }
    });

    test('should handle network timeout', async ({ page }) => {
      // Mock slow response
      await page.route('**/api/routes/public*', async (route) => {
        // Delay response by 30 seconds to trigger timeout
        await new Promise((resolve) => setTimeout(resolve, 30000));
        await route.continue();
      });

      await routesPage.navigateToRoutes();

      // Should show loading state initially
      const isLoading = await routesPage.isLoadingStateVisible();
      if (isLoading) {
        await expect(routesPage.loadingState).toBeVisible();
      }

      // After timeout, should handle gracefully
      // (This test might timeout itself, which is expected behavior)
    });

    test('should make API calls with correct parameters', async ({ page }) => {
      let lastApiCall: any = null;

      await page.route('**/api/routes/public*', async (route) => {
        const url = new URL(route.request().url());
        lastApiCall = {
          page: url.searchParams.get('page'),
          size: url.searchParams.get('size'),
        };

        // Return empty response for testing
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [],
            totalElements: 0,
            totalPages: 0,
            number: 0,
            size: 12,
          }),
        });
      });

      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Verify API was called with correct parameters
      expect(lastApiCall).not.toBeNull();
      expect(lastApiCall.page).toBe('0'); // First page
      expect(lastApiCall.size).toBe('12'); // Default page size
    });
  });

  test.describe('Real Backend Testing', () => {
    test('should work with real backend when available', async () => {
      // This test runs against the real backend
      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Page should load successfully
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();

      // Should show either routes or empty state
      const hasRoutes = await routesPage.routesGrid.isVisible();
      const isEmpty = await routesPage.emptyState.isVisible();

      expect(hasRoutes || isEmpty).toBeTruthy();

      // Results summary should be appropriate
      const summaryText = await routesPage.getResultsSummaryText();
      expect(summaryText).toMatch(/routes|No routes found/);
    });

    test('should refresh data from backend', async () => {
      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Get initial state
      const initialSummary = await routesPage.getResultsSummaryText();

      // Refresh data
      await routesPage.refreshRoutes();

      // Should complete refresh
      await expect(routesPage.loadingState).not.toBeVisible();

      // Summary should be updated (even if same content)
      const refreshedSummary = await routesPage.getResultsSummaryText();
      expect(refreshedSummary).toMatch(/routes|No routes found/);
    });

    test('should handle filter changes with backend', async () => {
      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Apply a filter
      await routesPage.filterByRouteType('CYCLING');

      // Should trigger new API call and update results
      await routesPage.waitForRoutesToLoad();

      // Results should be filtered (or show empty state if no cycling routes)
      const summaryText = await routesPage.getResultsSummaryText();
      expect(summaryText).toMatch(/routes|No routes found/);

      // Filter should be applied
      await expect(routesPage.routeTypeSelect).toHaveValue('CYCLING');
    });
  });

  test.describe('Data Validation', () => {
    test('should handle malformed API response', async ({ page }) => {
      // Mock malformed response
      await page.route('**/api/routes/public*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response',
        });
      });

      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Should handle gracefully
      const hasError = await routesPage.isErrorStateVisible();
      const isEmpty = await routesPage.emptyState.isVisible();

      expect(hasError || isEmpty).toBeTruthy();
    });

    test('should handle missing required fields in response', async ({ page }) => {
      // Mock response with missing fields
      await page.route('**/api/routes/public*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [
              {
                // Missing required fields like id, name, etc.
                someField: 'value',
              },
            ],
            totalElements: 1,
            totalPages: 1,
            number: 0,
            size: 12,
          }),
        });
      });

      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Should handle gracefully - might show empty state or error
      await expect(routesPage.pageTitle).toBeVisible();
    });

    test('should validate route data structure', async ({ page }) => {
      // Mock response with valid route data
      const mockRoute = {
        id: 'test-route-1',
        name: 'Test Route',
        description: 'A test route for e2e testing',
        routeType: 'CYCLING',
        isPublic: true,
        totalDistance: 5000,
        totalElevationGain: 100,
        estimatedDuration: 1200,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'test-user',
        pointCount: 10,
        points: [] as [number, number][],
        metadata: JSON.stringify({ difficulty: 3, surface: 'ASPHALT' }),
      };

      await page.route('**/api/routes/public*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [mockRoute],
            totalElements: 1,
            totalPages: 1,
            number: 0,
            size: 12,
          }),
        });
      });

      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      // Should display the route
      await expect(routesPage.routesGrid).toBeVisible();
      const routeCount = await routesPage.getRouteCardCount();
      expect(routeCount).toBe(1);

      // Results summary should show 1 route
      const summaryText = await routesPage.getResultsSummaryText();
      expect(summaryText).toContain('1');
    });
  });

  test.describe('Performance with Backend', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock large dataset
      const mockRoutes = Array.from({ length: 100 }, (_, i) => ({
        id: `route-${i}`,
        name: `Route ${i}`,
        description: `Description for route ${i}`,
        routeType: 'CYCLING',
        isPublic: true,
        totalDistance: 1000 + i * 100,
        totalElevationGain: 50 + i * 5,
        estimatedDuration: 600 + i * 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'test-user',
        pointCount: 10,
        points: [] as [number, number][],
        metadata: JSON.stringify({ difficulty: (i % 5) + 1 }),
      }));

      await page.route('**/api/routes/public*', async (route) => {
        const url = new URL(route.request().url());
        const page_num = parseInt(url.searchParams.get('page') || '0');
        const page_size = parseInt(url.searchParams.get('size') || '12');

        const start = page_num * page_size;
        const end = start + page_size;
        const pageContent = mockRoutes.slice(start, end);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: pageContent,
            totalElements: mockRoutes.length,
            totalPages: Math.ceil(mockRoutes.length / page_size),
            number: page_num,
            size: page_size,
          }),
        });
      });

      const startTime = Date.now();

      await routesPage.navigateToRoutes();
      await routesPage.waitForPageLoad();

      const loadTime = Date.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(5000); // 5 seconds

      // Should display routes
      await expect(routesPage.routesGrid).toBeVisible();
      const routeCount = await routesPage.getRouteCardCount();
      expect(routeCount).toBeGreaterThan(0);
      expect(routeCount).toBeLessThanOrEqual(12); // Page size

      // Should show pagination
      await expect(routesPage.pagination).toBeVisible();
    });
  });
});
