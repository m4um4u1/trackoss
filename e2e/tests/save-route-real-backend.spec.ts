import { expect, integrationTest } from '../fixtures/test-fixtures';
import { MapPage } from '../pages/map-page';
import { trackRouteCreation } from '../utils/route-cleanup';

/**
 * These tests actually create routes in the real backend to verify cleanup functionality
 * They should be run sparingly and only when testing the cleanup system
 */
integrationTest.describe('Save Route Real Backend Tests (Cleanup Verification)', () => {
  let mapPage: MapPage;

  integrationTest.beforeEach(async ({ page }) => {
    mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Track successful route creation responses for cleanup
    page.on('response', async (response) => {
      if (
        response.url().includes('/api/routes') &&
        response.request().method() === 'POST' &&
        response.status() === 201
      ) {
        try {
          const responseBody = await response.text();
          trackRouteCreation(responseBody);
        } catch (error) {
          console.warn('Failed to track route creation:', error);
        }
      }
    });
  });

  // Helper function to mock route calculation (still needed for frontend)
  async function mockRouteCalculation(page: any) {
    await page.route('**/8002/route**', (route: any) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          trip: {
            locations: [
              { type: 'break', lat: 52.520008, lon: 13.404954, original_index: 0 },
              { type: 'break', lat: 52.516275, lon: 13.377704, original_index: 1 },
            ],
            legs: [
              {
                summary: { length: 5.0, time: 1200 },
                shape: 'u{~vFvyys@fS]',
                maneuvers: [],
              },
            ],
            summary: { length: 5.0, time: 1200 },
          },
          shape: 'u{~vFvyys@fS]',
        }),
      });
    });

    await page.route('**/route?json=**', (route: any) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          trip: {
            locations: [
              { type: 'break', lat: 52.520008, lon: 13.404954, original_index: 0 },
              { type: 'break', lat: 52.516275, lon: 13.377704, original_index: 1 },
            ],
            legs: [
              {
                summary: { length: 5.0, time: 1200 },
                shape: 'u{~vFvyys@fS]',
                maneuvers: [],
              },
            ],
            summary: { length: 5.0, time: 1200 },
          },
          shape: 'u{~vFvyys@fS]',
        }),
      });
    });
  }

  integrationTest('should create real route', async ({ page }) => {
    // Set up network request monitoring
    const routeRequests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/routes') && request.method() === 'POST') {
        routeRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
        });
      }
    });

    // Mock route calculation but let the save route API call go through to real backend
    await mockRouteCalculation(page);

    // Calculate a route
    await mapPage.enterStartPoint('Berlin');
    await mapPage.enterEndPoint('Brandenburg');
    await mapPage.clickCalculateRoute();
    await mapPage.waitForRouteCalculation();
    await page.waitForTimeout(2000);

    // Open save route modal
    await mapPage.clickSaveRouteButton();
    await mapPage.waitForSaveRouteModal();

    // Fill in route data with cleanup test identifier
    const testRouteName = `Cleanup Test Route ${Date.now()}`;
    await mapPage.fillRouteName(testRouteName);
    await mapPage.fillRouteDescription('This route was created');
    await mapPage.fillNotes('This route should be automatically cleaned up after the test');
    await mapPage.fillTags('cleanup, test, e2e, automated');

    // Save the route (this will make a real API call)
    await mapPage.clickModalSaveButton();

    // Wait for the save operation to complete
    await page.waitForTimeout(3000);

    // Verify API was called
    expect(routeRequests.length).toBeGreaterThan(0);

    const requestData = JSON.parse(routeRequests[0].postData || '{}');
    expect(requestData.name).toBe(testRouteName);
    expect(requestData.description).toBe('This route was created');

    // The route should be tracked for cleanup by the global teardown
    console.log('Real route created for cleanup testing');
  });

  integrationTest('should demonstrate cleanup tracking without creating real routes', async ({ page }) => {
    // This test demonstrates the cleanup tracking without actually creating routes

    // Mock both route calculation and route saving
    await mockRouteCalculation(page);

    // Mock the route save API to return a realistic response
    await page.route('**/api/routes', (route) => {
      if (route.request().method() === 'POST') {
        const testRouteId = `test-route-${Date.now()}`;
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: testRouteId,
            name: 'Cleanup Demo Route',
            description: 'This demonstrates cleanup tracking',
            createdAt: new Date().toISOString(),
            routeType: 'CYCLING',
            isPublic: false,
          }),
        });
      }
    });

    // Calculate a route
    await mapPage.enterStartPoint('Berlin');
    await mapPage.enterEndPoint('Brandenburg');
    await mapPage.clickCalculateRoute();
    await mapPage.waitForRouteCalculation();
    await page.waitForTimeout(2000);

    // Open save route modal
    await mapPage.clickSaveRouteButton();
    await mapPage.waitForSaveRouteModal();

    // Fill in route data
    await mapPage.fillRouteName('Cleanup Demo Route');
    await mapPage.fillRouteDescription('This demonstrates cleanup tracking');

    // Save the route (this will be mocked)
    await mapPage.clickModalSaveButton();
    await page.waitForTimeout(2000);

    // The mocked route ID should be tracked for cleanup
    console.log('Mocked route creation tracked for cleanup demonstration');
  });
});
