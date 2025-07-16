import { expect, test, testWithCustomMocks } from '../fixtures/test-fixtures';
// Import the createApiMocks function for the delayed test
import { createApiMocks, mockResponses } from '../fixtures/api-mocks';
import { MapPage } from '../pages/map-page';

test.describe('API Mocking Tests', () => {
  test('should load map with mocked tile API', async ({ mapPage, apiMocks }) => {
    await mapPage.navigateToMap();

    // Verify map loads with mocked data
    await expect(mapPage.mapCanvasLocator).toBeVisible();
    await expect(mapPage.geolocateControlLocator).toBeVisible();

    // Verify the mock was used
    expect(apiMocks.getMock('mapStyle')).toBeDefined();
    expect(apiMocks.getMock('config')).toBeDefined();
  });

  test('should handle route calculation with mocked API', async ({ mapPage, apiMocks }) => {
    await mapPage.navigateToMap();

    // Ensure we're not in waypoint mode
    if (await mapPage.isWaypointModeEnabled()) {
      await mapPage.disableWaypointMode();
    }

    // Verify route calculator is visible
    await expect(mapPage.routeCalculatorLocator).toBeVisible();

    // Enter route points
    await mapPage.enterStartPoint('Berlin');
    await mapPage.enterEndPoint('Brandenburg');

    // Verify button is enabled
    await expect(mapPage.calculateRouteButtonLocator).toBeEnabled();

    // Calculate route (will use mocked response)
    await mapPage.clickCalculateRoute();
    await mapPage.waitForRouteCalculation();

    // Verify the app handled the mocked response gracefully
    // (The exact UI response may vary, but the app should remain functional)
    await expect(mapPage.mapCanvasLocator).toBeVisible();
    await expect(mapPage.calculateRouteButtonLocator).toBeEnabled();

    // Verify mocks are in place
    expect(apiMocks.getMock('routing')).toBeDefined();
    expect(apiMocks.getMock('config')).toBeDefined();
    expect(apiMocks.getMock('mapStyle')).toBeDefined();
  });

  test('should handle route calculation errors with mocked API', async ({ page, apiMocks }) => {
    // Set up error mock
    await apiMocks.mockRoutingApiError();

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Ensure we're not in waypoint mode
    if (await mapPage.isWaypointModeEnabled()) {
      await mapPage.disableWaypointMode();
    }

    // Enter route points
    await mapPage.enterStartPoint('Berlin');
    await mapPage.enterEndPoint('Very Far Location');

    // Calculate route (will use mocked error response)
    await mapPage.clickCalculateRoute();
    await mapPage.waitForRouteCalculation();

    // Verify error handling (error message may vary based on which API fails first)
    const errorMessage = await mapPage.getRouteErrorMessage();
    expect(errorMessage).toBeTruthy(); // Should show some error message

    // Verify app remains functional after error
    await expect(mapPage.mapCanvasLocator).toBeVisible();
    await expect(mapPage.calculateRouteButtonLocator).toBeEnabled();
  });

  test('should handle multi-waypoint routing with mocked API', async ({ mapPage, apiMocks }) => {
    // Set up multi-waypoint mock
    await apiMocks.mockMultiWaypointRoutingApi();

    await mapPage.navigateToMap();
    await mapPage.enableWaypointMode();

    // Add multiple waypoints
    await mapPage.clickOnMap(250, 250);
    await mapPage.waitForWaypointUpdate(1);

    await mapPage.clickOnMap(350, 350);
    await mapPage.waitForWaypointUpdate(2);

    await mapPage.clickOnMap(450, 450);
    await mapPage.waitForWaypointUpdate(3);

    // Verify waypoints were added
    expect(await mapPage.getWaypointCount()).toBe(3);

    // Wait for route calculation to complete (multi-waypoint routes are calculated automatically)
    await mapPage.waitForWaypointRoutePolyline(10000);

    // Verify route information is displayed (indicates successful route calculation)
    const routeDistance = await mapPage.getRouteDistance();
    const routeDuration = await mapPage.getRouteDuration();

    // The mocked response should provide route information
    expect(routeDistance || routeDuration).toBeTruthy();
  });

  test('should handle loading states with delayed API responses', async ({ page }) => {
    const apiMocks = createApiMocks(page);

    // Mock with delay to test loading states
    await apiMocks.mockWithDelay('**/api/valhalla/route**', 2000, mockResponses.routeSuccess);
    await apiMocks.mockConfigApi();
    await apiMocks.mockMapTileApi();

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Ensure we're not in waypoint mode
    if (await mapPage.isWaypointModeEnabled()) {
      await mapPage.disableWaypointMode();
    }

    // Enter route points
    await mapPage.enterStartPoint('Berlin');
    await mapPage.enterEndPoint('Brandenburg');

    // Start route calculation
    await mapPage.clickCalculateRoute();

    // Verify calculating state is shown
    await expect(mapPage.calculatingButtonLocator).toBeVisible();

    // Wait for calculation to complete
    await mapPage.waitForRouteCalculation();

    // Verify final state
    await expect(mapPage.calculatingButtonLocator).not.toBeVisible();
    await expect(mapPage.calculateRouteButtonLocator).toBeEnabled();
  });

  test('should handle network failures gracefully', async ({ page }) => {
    const apiMocks = createApiMocks(page);

    // Mock successful geocoding first
    await page.route('**/nominatim.openstreetmap.org/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ lat: '52.520008', lon: '13.404954' }]),
      });
    });

    // Mock network failure for routing API (development URL pattern)
    await apiMocks.mockNetworkFailure('**/route**');
    await apiMocks.mockConfigApi();
    await apiMocks.mockMapTileApi();

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Ensure we're not in waypoint mode
    if (await mapPage.isWaypointModeEnabled()) {
      await mapPage.disableWaypointMode();
    }

    // Enter route points
    await mapPage.enterStartPoint('Berlin');
    await mapPage.enterEndPoint('Brandenburg');

    // Try to calculate route (will fail due to network mock)
    await mapPage.clickCalculateRoute();
    await mapPage.waitForRouteCalculation();

    // Verify error handling
    const errorMessage = await mapPage.getRouteErrorMessage();
    expect(errorMessage).toBeTruthy(); // Should show some error message

    // Verify app remains functional
    await expect(mapPage.mapCanvasLocator).toBeVisible();
    await expect(mapPage.calculateRouteButtonLocator).toBeEnabled();
  });
});

testWithCustomMocks.describe('Custom Mock Tests', () => {
  testWithCustomMocks('should allow custom mock configuration', async ({ mapPage, apiMocks }) => {
    // Set up custom mocks
    const customRouteResponse = {
      trip: {
        status: 0,
        status_message: 'Custom route found',
        legs: [
          {
            summary: {
              time: 3600, // 1 hour
              length: 25.0, // 25 km
              cost: 3600,
            },
            shape: 'custom_shape_data',
          },
        ],
        summary: {
          time: 3600,
          length: 25.0,
          cost: 3600,
        },
      },
    };

    await apiMocks.mockConfigApi();
    await apiMocks.mockMapTileApi();
    await apiMocks.mockRoutingApi(customRouteResponse);

    await mapPage.navigateToMap();

    // Ensure we're not in waypoint mode
    if (await mapPage.isWaypointModeEnabled()) {
      await mapPage.disableWaypointMode();
    }

    // Calculate route with custom mock
    await mapPage.enterStartPoint('Start');
    await mapPage.enterEndPoint('End');
    await mapPage.clickCalculateRoute();
    await mapPage.waitForRouteCalculation();

    // Verify custom mock data is used
    const distance = await mapPage.getRouteDistance();
    const duration = await mapPage.getRouteDuration();

    expect(distance).toContain('25 km'); // Custom distance (formatted)
    expect(duration).toContain('1h 0m'); // Custom duration (3600 seconds = 1 hour)
  });
});
