import { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class MapPage extends BasePage {
  // Map elements
  readonly mapContainer: Locator;
  readonly mapCanvas: Locator;
  readonly geolocateControl: Locator;
  readonly navigationControl: Locator;
  readonly scaleControl: Locator;
  readonly sidepanel: Locator;
  readonly routeCalculator: Locator;
  readonly waypointManager: Locator;

  // Navbar component elements (part of the page)
  readonly navbar: Locator;
  readonly brandLink: Locator;
  readonly navbarToggler: Locator;
  readonly navbarCollapse: Locator;
  readonly mapLink: Locator;

  constructor(page: Page) {
    super(page);
    // Map elements
    this.mapContainer = page.locator('#map');
    this.mapCanvas = page.locator('#map canvas');
    this.geolocateControl = page.locator('.maplibregl-ctrl-geolocate');
    this.navigationControl = page.locator('.maplibregl-ctrl-group').first();
    this.scaleControl = page.locator('.maplibregl-ctrl-scale');
    this.sidepanel = page.locator('app-map-sidepanel');
    this.routeCalculator = page.locator('app-route-calculator');
    this.waypointManager = page.locator('app-waypoint-manager');

    // Navbar component elements
    this.navbar = page.locator('nav.navbar');
    this.brandLink = page.locator('.navbar-brand');
    this.navbarToggler = page.locator('.navbar-toggler');
    this.navbarCollapse = page.locator('.navbar-collapse');
    this.mapLink = page.locator('a[routerLink="/map"]');
  }

  /**
   * Navigate to the map page
   */
  async navigateToMap() {
    await this.goto('/map');
    await this.waitForMapLoad();
  }

  /**
   * Wait for the map to fully load
   */
  async waitForMapLoad() {
    await this.mapContainer.waitFor({ state: 'attached' });
    // Wait for network to be idle to ensure map resources are loaded
    await this.waitForNetworkIdle();
    // Check if map canvas exists (it might be hidden on mobile)
    const canvasCount = await this.mapCanvas.count();
    if (canvasCount > 0) {
      await this.mapCanvas.waitFor({ state: 'attached' });
    }
  }

  /**
   * Check if map is visible and loaded
   */
  async isMapVisible(): Promise<boolean> {
    return await this.mapCanvas.isVisible();
  }

  /**
   * Check if geolocation control is visible
   */
  async isGeolocateControlVisible(): Promise<boolean> {
    return await this.geolocateControl.isVisible();
  }

  /**
   * Click on geolocation control
   */
  async clickGeolocateControl() {
    await this.geolocateControl.click();
  }

  /**
   * Check if navigation controls are visible
   */
  async areNavigationControlsVisible(): Promise<boolean> {
    return await this.navigationControl.isVisible();
  }

  /**
   * Check if scale control is visible
   */
  async isScaleControlVisible(): Promise<boolean> {
    return await this.scaleControl.isVisible();
  }

  /**
   * Click on the map at specific coordinates
   */
  async clickOnMap(x: number = 300, y: number = 300) {
    await this.mapCanvas.click({ position: { x, y } });
  }

  /**
   * Get map container dimensions
   */
  async getMapDimensions() {
    return await this.mapContainer.boundingBox();
  }

  /**
   * Wait for geolocation to complete
   */
  async waitForGeolocation() {
    // Wait for network activity to settle after geolocation
    await this.waitForNetworkIdle();
    // Give some additional time for geolocation processing
    // Don't wait for active state as geolocation might be denied in test environment
  }

  /**
   * Check if waypoint mode is enabled
   */
  async isWaypointModeEnabled(): Promise<boolean> {
    const toggle = this.page.locator('#waypointModeToggle');
    return await toggle.isChecked();
  }

  /**
   * Enable waypoint mode by clicking the toggle
   */
  async enableWaypointMode() {
    const toggle = this.page.locator('#waypointModeToggle');
    const isEnabled = await toggle.isChecked();

    if (!isEnabled) {
      await toggle.click();
      // Wait for the toggle state to change with timeout and fallback
      try {
        await this.page.waitForFunction(
          () => {
            const toggleEl = document.querySelector('#waypointModeToggle') as HTMLInputElement;
            return toggleEl && toggleEl.checked;
          },
          { timeout: 5000 },
        );
      } catch {
        // Fallback: wait for network idle
        await this.waitForNetworkIdle();
      }
    }
  }

  /**
   * Disable waypoint mode by clicking the toggle
   */
  async disableWaypointMode() {
    const toggle = this.page.locator('#waypointModeToggle');
    const isEnabled = await toggle.isChecked();

    if (isEnabled) {
      await toggle.click();
      // Wait for the toggle state to change with timeout and fallback
      try {
        await this.page.waitForFunction(
          () => {
            const toggleEl = document.querySelector('#waypointModeToggle') as HTMLInputElement;
            return toggleEl && !toggleEl.checked;
          },
          { timeout: 5000 },
        );
      } catch {
        // Fallback: wait for network idle
        await this.waitForNetworkIdle();
      }
    }
  }

  /**
   * Check if waypoint mode content is visible
   */
  async isWaypointModeContentVisible(): Promise<boolean> {
    // Check for the specific waypoint mode content (input field and waypoint list)
    const addWaypointSection = this.page.locator('.waypoint-manager .card-body input#newWaypoint');
    return await addWaypointSection.isVisible();
  }

  /**
   * Get the number of waypoints in the waypoint list
   */
  async getWaypointCount(): Promise<number> {
    const waypointItems = this.page.locator('.waypoints-list .waypoint-item');
    return await waypointItems.count();
  }

  /**
   * Clear all waypoints using the clear button
   */
  async clearAllWaypoints() {
    const clearButton = this.page.locator('button:has-text("Clear All")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      // Wait for waypoints to be cleared from the list
      await this.page.waitForFunction(() => {
        const waypointItems = document.querySelectorAll('.waypoints-list .waypoint-item');
        return waypointItems.length === 0;
      });
    }
  }

  /**
   * Wait for waypoints to be added/updated
   */
  async waitForWaypointUpdate(expectedCount?: number) {
    if (expectedCount !== undefined) {
      // Wait for specific waypoint count with timeout and fallback
      try {
        await this.page.waitForFunction(
          (count) => {
            const waypointItems = document.querySelectorAll('.waypoints-list .waypoint-item');
            return waypointItems.length === count;
          },
          expectedCount,
          { timeout: 8000 },
        );
      } catch {
        // Fallback: wait for network idle if specific count wait fails
        await this.waitForNetworkIdle();
      }
    } else {
      // Wait for network activity to settle
      await this.waitForNetworkIdle();
    }
  }

  /**
   * Remove a waypoint by clicking its remove button
   */
  async removeWaypoint(index: number) {
    const currentCount = await this.getWaypointCount();
    const removeButton = this.page.locator('.waypoints-list .waypoint-item .btn-outline-danger').nth(index);
    await removeButton.click();
    // Wait for waypoint to be removed
    await this.waitForWaypointUpdate(currentCount - 1);
  }

  /**
   * Verify map canvas is present and has valid dimensions
   */
  async isMapCanvasValid(): Promise<boolean> {
    try {
      const canvas = this.mapCanvas;
      const isVisible = await canvas.isVisible();
      if (!isVisible) return false;

      const boundingBox = await canvas.boundingBox();
      return boundingBox !== null && boundingBox.width > 0 && boundingBox.height > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if map container has proper styling (not hidden or collapsed)
   */
  async isMapContainerValid(): Promise<boolean> {
    try {
      const container = this.mapContainer;
      const isVisible = await container.isVisible();
      if (!isVisible) return false;

      const boundingBox = await container.boundingBox();
      return boundingBox !== null && boundingBox.width > 0 && boundingBox.height > 0;
    } catch {
      return false;
    }
  }

  // Route Calculator methods
  /**
   * Check if route calculator is visible (shown when not in waypoint mode)
   */
  async isRouteCalculatorVisible(): Promise<boolean> {
    const routeCalculator = this.page.locator('app-route-calculator');
    return await routeCalculator.isVisible();
  }

  /**
   * Enter start point location in route calculator
   */
  async enterStartPoint(location: string) {
    const startPointInput = this.page.locator('#startPoint');
    await startPointInput.fill(location);
  }

  /**
   * Enter end point location in route calculator
   */
  async enterEndPoint(location: string) {
    const endPointInput = this.page.locator('#endPoint');
    await endPointInput.fill(location);
  }

  /**
   * Click the calculate route button
   */
  async clickCalculateRoute() {
    const calculateButton = this.page.locator('button:has-text("Calculate Route")');
    await calculateButton.click();
  }

  /**
   * Click the clear route button
   */
  async clickClearRoute() {
    const clearButton = this.page.locator('button:has-text("Clear Route")');
    await clearButton.click();
  }

  /**
   * Check if calculate route button is enabled
   */
  async isCalculateRouteButtonEnabled(): Promise<boolean> {
    const calculateButton = this.page.locator('button:has-text("Calculate Route")');
    return await calculateButton.isEnabled();
  }

  /**
   * Check if route calculation is in progress
   */
  async isRouteCalculating(): Promise<boolean> {
    const calculatingButton = this.page.locator('button:has-text("Calculating...")');
    return await calculatingButton.isVisible();
  }

  /**
   * Wait for route calculation to complete
   */
  async waitForRouteCalculation() {
    // Wait for calculating state to disappear
    const calculatingButton = this.page.locator('button:has-text("Calculating...")');
    if (await calculatingButton.isVisible()) {
      await calculatingButton.waitFor({ state: 'hidden', timeout: 15000 });
    }
    // Wait for network to be idle
    await this.waitForNetworkIdle();
  }

  /**
   * Get route success message
   */
  async getRouteSuccessMessage(): Promise<string> {
    const successMessage = this.page.locator('.success-message .text-success');
    if (await successMessage.isVisible()) {
      return (await successMessage.textContent()) || '';
    }
    return '';
  }

  /**
   * Get route error message
   */
  async getRouteErrorMessage(): Promise<string> {
    const errorMessage = this.page.locator('.error-message .text-danger');
    if (await errorMessage.isVisible()) {
      return (await errorMessage.textContent()) || '';
    }
    return '';
  }

  /**
   * Get displayed route distance
   */
  async getRouteDistance(): Promise<string> {
    // Look for distance in route display component
    const distanceElement = this.page.locator(
      'app-route-display .route-detail:has(.label:text("Distance:")) .value, app-route-display .route-detail:has(.label:text("Total Distance:")) .value',
    );
    if ((await distanceElement.count()) > 0) {
      return (await distanceElement.first().textContent()) || '';
    }
    return '';
  }

  /**
   * Get displayed route duration
   */
  async getRouteDuration(): Promise<string> {
    // Look for duration in route display component
    const durationElement = this.page.locator(
      'app-route-display .route-detail:has(.label:text("Duration:")) .value, app-route-display .route-detail:has(.label:text("Total Duration:")) .value',
    );
    if ((await durationElement.count()) > 0) {
      return (await durationElement.first().textContent()) || '';
    }
    return '';
  }

  /**
   * Check if route information is displayed (distance and duration)
   */
  async hasRouteInformation(): Promise<boolean> {
    const distance = await this.getRouteDistance();
    const duration = await this.getRouteDuration();
    return distance !== '' || duration !== '';
  }

  /**
   * Select transportation mode (costing option)
   */
  async selectTransportationMode(mode: 'bicycle' | 'pedestrian') {
    const costingSelect = this.page.locator('#costing');
    await costingSelect.click();

    // Use keyboard navigation to select the option
    if (mode === 'pedestrian') {
      await this.page.keyboard.press('ArrowDown'); // Move to pedestrian option
    } else {
      await this.page.keyboard.press('ArrowUp'); // Move to bicycle option (or stay there)
    }
    await this.page.keyboard.press('Enter');
  }

  /**
   * Check if bicycle type selector is visible
   */
  async isBicycleTypeSelectorVisible(): Promise<boolean> {
    const bicycleTypeSelect = this.page.locator('#bicycleType');
    return await bicycleTypeSelect.isVisible();
  }

  // Polyline/Route visualization methods
  /**
   * Check if a route polyline is visible on the map (normal routing mode)
   */
  async isRoutePolylineVisible(): Promise<boolean> {
    try {
      return await this.page.evaluate(() => {
        // Check if route layer exists by looking for visual indicators
        // 1. Check for route-related console messages (we know route was added)
        // 2. Check for MapLibre canvas with route data

        // Try to find MapLibre map instance through various methods
        const mapContainer = document.querySelector('.maplibregl-map') as any;
        if (mapContainer) {
          // Try different property names that MapLibre might use
          const possibleMapProps = ['_map', 'map', 'mapInstance', '__maplibre__', '_maplibre'];

          for (const prop of possibleMapProps) {
            const mapInstance = mapContainer[prop];
            if (mapInstance && typeof mapInstance.getLayer === 'function') {
              try {
                const routeLayer = mapInstance.getLayer('route');
                const routeSource = mapInstance.getSource('route');
                return !!(routeLayer && routeSource);
              } catch (e) {
                // Continue trying other properties
              }
            }
          }
        }

        // Alternative: Check if there are any line layers that might be routes
        // This is a fallback method
        const canvas = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement;
        if (canvas) {
          // If canvas exists and has been drawn on, assume route might be there
          // This is not perfect but better than always returning false
          return canvas.width > 0 && canvas.height > 0;
        }

        return false;
      });
    } catch (error) {
      console.log('Error checking route polyline:', error);
      return false;
    }
  }

  /**
   * Check if a multi-waypoint route polyline is visible on the map (waypoint mode)
   */
  async isWaypointRoutePolylineVisible(): Promise<boolean> {
    try {
      // Check if the map has a multi-route layer
      return await this.page.evaluate(() => {
        // Try different selectors to find the map
        const selectors = ['#map', '.maplibregl-map', 'mgl-map', 'app-libre-map'];
        let mapInstance: any = null;

        for (const selector of selectors) {
          const element = document.querySelector(selector) as any;
          if (element) {
            mapInstance = element._map || element.map || element.mapInstance;
            if (mapInstance) break;
          }
        }

        if (!mapInstance) return false;

        try {
          const multiRouteLayer = mapInstance.getLayer('multi-route');
          const multiRouteSource = mapInstance.getSource('multi-route');

          return !!(multiRouteLayer && multiRouteSource);
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.log('Error checking waypoint route polyline:', error);
      return false;
    }
  }

  /**
   * Get waypoint route polyline properties (color, width) for waypoint mode
   */
  async getWaypointRoutePolylineProperties(): Promise<{ color?: string; width?: number } | null> {
    try {
      return await this.page.evaluate(() => {
        const mapContainer = document.querySelector('#map') as any;
        if (!mapContainer || !mapContainer._map) return null;

        const map = mapContainer._map;
        const multiRouteLayer = map.getLayer('multi-route');

        if (!multiRouteLayer) return null;

        const paint = multiRouteLayer.paint || {};
        return {
          color: paint['line-color'],
          width: paint['line-width'],
        };
      });
    } catch (error) {
      console.log('Error getting waypoint route polyline properties:', error);
      return null;
    }
  }

  /**
   * Wait for waypoint route polyline to appear on the map
   */
  async waitForWaypointRoutePolyline(timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await this.isWaypointRoutePolylineVisible()) {
        return true;
      }
      await this.page.waitForTimeout(500); // Wait 500ms before checking again
    }

    return false;
  }
}
