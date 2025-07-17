import { Page } from '@playwright/test';

/**
 * Mock responses for API endpoints
 */
export const mockResponses = {
  // Map tile style configuration
  mapStyle: {
    version: 8,
    name: 'Test Style',
    sources: {
      'test-source': {
        type: 'raster',
        tiles: ['http://localhost:3000/tiles/{z}/{x}/{y}.png'],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#f0f0f0',
        },
      },
      {
        id: 'test-layer',
        type: 'raster',
        source: 'test-source',
        paint: {
          'raster-opacity': 1,
        },
      },
    ],
  },

  // Application configuration
  config: {
    mapTileProxyBaseUrl: '/api/map-proxy',
    valhallaUrl: '/api/valhalla',
  },

  // Successful route calculation response
  routeSuccess: {
    trip: {
      status: 0,
      status_message: 'Found route between points',
      legs: [
        {
          summary: {
            time: 1800, // 30 minutes
            length: 15.5, // 15.5 km
            cost: 1800,
          },
          shape: 'u{~_I__@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@',
        },
      ],
      summary: {
        time: 1800,
        length: 15.5,
        cost: 1800,
      },
    },
  },

  // Route calculation error response
  routeError: {
    error_code: 442,
    error: 'Path distance exceeds the max distance limit',
    status_code: 400,
  },

  // Multi-waypoint route response
  multiWaypointRoute: {
    trip: {
      status: 0,
      status_message: 'Found route between points',
      legs: [
        {
          summary: {
            time: 900,
            length: 7.5,
            cost: 900,
          },
          shape: 'u{~_I__@_@_@_@_@_@_@_@_@_@_@_@_@_@_@',
        },
        {
          summary: {
            time: 1200,
            length: 10.2,
            cost: 1200,
          },
          shape: '_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@_@',
        },
      ],
      summary: {
        time: 2100,
        length: 17.7,
        cost: 2100,
      },
    },
  },

  // Geocoding responses for different locations
  geocoding: {
    'Berlin, Germany': [{ lat: '52.520008', lon: '13.404954' }],
    'Munich, Germany': [{ lat: '48.137154', lon: '11.576124' }],
    'Hamburg, Germany': [{ lat: '53.551086', lon: '9.993682' }],
    'Frankfurt, Germany': [{ lat: '50.110924', lon: '8.682127' }],
    'Test Location': [{ lat: '50.0', lon: '10.0' }],
    Berlin: [{ lat: '52.520008', lon: '13.404954' }],
    Munich: [{ lat: '48.137154', lon: '11.576124' }],
  },
};

/**
 * API Mock Manager for Playwright tests
 */
export class ApiMockManager {
  private page: Page;
  private mocks: Map<string, any> = new Map();

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Set up all default API mocks
   */
  async setupDefaultMocks(): Promise<void> {
    await this.mockConfigApi();
    await this.mockMapTileApi();
    await this.mockRoutingApi();
    await this.mockGeocodingApi();
  }

  /**
   * Mock the configuration API
   */
  async mockConfigApi(response = mockResponses.config): Promise<void> {
    await this.page.route('**/assets/config.json', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
    this.mocks.set('config', response);
  }

  /**
   * Mock the map tile style API
   */
  async mockMapTileApi(response = mockResponses.mapStyle): Promise<void> {
    await this.page.route('**/api/map-proxy/**/style.json', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
    this.mocks.set('mapStyle', response);
  }

  /**
   * Mock the routing API with success response
   */
  async mockRoutingApi(response = mockResponses.routeSuccess): Promise<void> {
    await this.page.route('**/route**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
    this.mocks.set('routing', response);
  }

  /**
   * Mock routing API to return an error
   */
  async mockRoutingApiError(errorResponse = mockResponses.routeError): Promise<void> {
    await this.page.route('**/route**', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify(errorResponse),
      });
    });
    this.mocks.set('routing', errorResponse);
  }

  /**
   * Mock routing API for multi-waypoint routes
   */
  async mockMultiWaypointRoutingApi(response = mockResponses.multiWaypointRoute): Promise<void> {
    await this.page.route('**/api/valhalla/route**', (route) => {
      const url = route.request().url();
      // Check if this is a multi-waypoint request (more than 2 locations)
      if (url.includes('locations') && url.match(/lat.*lon.*lat.*lon.*lat.*lon/)) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.routeSuccess),
        });
      }
    });
    this.mocks.set('multiWaypointRouting', response);
  }

  /**
   * Mock the geocoding API (Nominatim OpenStreetMap)
   */
  async mockGeocodingApi(): Promise<void> {
    // Mock Nominatim OpenStreetMap geocoding API
    await this.page.route('**/nominatim.openstreetmap.org/**', (route) => {
      const url = route.request().url();
      const searchParams = new URL(url).searchParams;
      const query = searchParams.get('q') || '';

      // Find matching geocoding response
      const geocodingResponses = mockResponses.geocoding as Record<string, any>;
      const response = geocodingResponses[query] || geocodingResponses['Test Location'];

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    this.mocks.set('geocoding', mockResponses.geocoding);
  }

  /**
   * Mock network delay for testing loading states
   */
  async mockWithDelay(endpoint: string, delayMs: number, response: any): Promise<void> {
    await this.page.route(endpoint, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock network failure
   */
  async mockNetworkFailure(endpoint: string): Promise<void> {
    await this.page.route(endpoint, (route) => {
      route.abort('failed');
    });
  }

  /**
   * Clear all mocks
   */
  async clearAllMocks(): Promise<void> {
    await this.page.unrouteAll();
    this.mocks.clear();
  }

  /**
   * Get current mock for endpoint
   */
  getMock(key: string): any {
    return this.mocks.get(key);
  }

  /**
   * Verify that specific API was called
   */
  async waitForApiCall(urlPattern: string, timeout = 5000): Promise<void> {
    await this.page.waitForRequest(urlPattern, { timeout });
  }

  /**
   * Count API calls to specific endpoint
   */
  async countApiCalls(urlPattern: string): Promise<number> {
    const requests: string[] = [];

    this.page.on('request', (request) => {
      if (request.url().match(urlPattern)) {
        requests.push(request.url());
      }
    });

    // Wait a bit for requests to be captured
    await this.page.waitForTimeout(100);
    return requests.length;
  }
}

/**
 * Helper function to create API mock manager
 */
export function createApiMocks(page: Page): ApiMockManager {
  return new ApiMockManager(page);
}
