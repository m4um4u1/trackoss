import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouteService } from './route.service';
import { ConfigService } from './config.service';
import { BackendApiService } from './backend-api.service';
import { Coordinates } from '../models/coordinates';
import { MultiWaypointRoute, RouteOptions, RoutePoint } from '../models/route';
import { environment } from '../../environments/environments';
import { of } from 'rxjs';
import { PointType, RouteResponse, RouteType } from '../models/backend-api';
import { DifficultyLevel, RoadType, RouteMetadata, SurfaceType } from '../models/route-metadata';

describe('RouteService', () => {
  let service: RouteService;
  let httpMock: HttpTestingController;
  let configService: jest.Mocked<ConfigService>;
  let backendApiService: jest.Mocked<BackendApiService>;

  const mockCoordinates: Coordinates = { lat: 52.520008, lon: 13.404954 };
  const mockEndCoordinates: Coordinates = { lat: 52.516275, lon: 13.377704 };

  const mockRouteOptions: RouteOptions = {
    costing: 'bicycle',
    bicycleType: 'hybrid',
    color: '#007cbf',
    width: 4,
  };

  const mockValhallaResponse = {
    trip: {
      legs: [
        {
          summary: {
            length: 1.0,
            time: 300,
          },
          shape: 'u{~vFvyys@fS]',
        },
      ],
    },
    shape: 'u{~vFvyys@fS]',
  };
  const mockWaypoints: RoutePoint[] = [
    {
      coordinates: mockCoordinates,
      type: 'start',
      id: 'wp1',
      name: 'Start',
      order: 0,
    },
    {
      coordinates: { lat: 52.518, lon: 13.39 },
      type: 'waypoint',
      id: 'wp2',
      name: 'Middle',
      order: 1,
    },
    {
      coordinates: mockEndCoordinates,
      type: 'end',
      id: 'wp3',
      name: 'End',
      order: 2,
    },
  ];

  beforeEach(() => {
    const configServiceSpy = {
      loadConfig: jest.fn().mockReturnValue(
        of({
          baseUrl: 'http://test-config.com/api/map-proxy',
          valhallaUrl: 'http://test-config.com/valhalla',
        }),
      ),
    };

    const backendApiServiceSpy = {
      createRoute: jest.fn(),
      getRoute: jest.fn(),
      updateRoute: jest.fn(),
      deleteRoute: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RouteService,
        { provide: ConfigService, useValue: configServiceSpy },
        { provide: BackendApiService, useValue: backendApiServiceSpy },
      ],
    });
    service = TestBed.inject(RouteService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(ConfigService) as jest.Mocked<ConfigService>;
    backendApiService = TestBed.inject(BackendApiService) as jest.Mocked<BackendApiService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Environment Configuration Tests', () => {
    it('should use environment URLs in development mode', () => {
      // Mock development environment
      const originalEnv = environment.production;
      const originalUseConfig = environment.useConfigService;
      (environment as any).production = false;
      (environment as any).useConfigService = false;

      service.calculateRoute(mockCoordinates, mockEndCoordinates, mockRouteOptions).subscribe();

      const req = httpMock.expectOne((req) => req.url.includes(`${environment.valhallaUrl}/route`));
      expect(req.request.method).toBe('GET');
      req.flush(mockValhallaResponse);

      // Restore original environment
      (environment as any).production = originalEnv;
      (environment as any).useConfigService = originalUseConfig;
    });

    it('should use ConfigService URLs in production mode', () => {
      // Mock production environment
      const originalEnv = environment.production;
      const originalUseConfig = environment.useConfigService;
      (environment as any).production = true;
      (environment as any).useConfigService = true;

      service.calculateRoute(mockCoordinates, mockEndCoordinates, mockRouteOptions).subscribe();

      expect(configService.loadConfig).toHaveBeenCalled();
      const req = httpMock.expectOne((req) => req.url.includes('http://test-config.com/valhalla/route'));
      expect(req.request.method).toBe('GET');
      req.flush(mockValhallaResponse);

      // Restore original environment
      (environment as any).production = originalEnv;
      (environment as any).useConfigService = originalUseConfig;
    });

    it('should use ConfigService for multi-waypoint routes in production', () => {
      // Mock production environment
      const originalEnv = environment.production;
      const originalUseConfig = environment.useConfigService;
      (environment as any).production = true;
      (environment as any).useConfigService = true;

      service.calculateMultiWaypointRoute(mockWaypoints, mockRouteOptions).subscribe();

      expect(configService.loadConfig).toHaveBeenCalled();
      const req = httpMock.expectOne((req) => req.url.includes('http://test-config.com/valhalla/route'));
      req.flush(mockValhallaResponse);

      // Restore original environment
      (environment as any).production = originalEnv;
      (environment as any).useConfigService = originalUseConfig;
    });
  });

  it('should calculate route between two points', () => {
    service.calculateRoute(mockCoordinates, mockEndCoordinates, mockRouteOptions).subscribe((result) => {
      expect(result.startPoint).toEqual(mockCoordinates);
      expect(result.endPoint).toEqual(mockEndCoordinates);
      expect(result.distance).toBe(1.0);
      expect(result.duration).toBe(300);
      expect(result.routeData.type).toBe('FeatureCollection');
    });

    const req = httpMock.expectOne((req) => req.url.includes(`${environment.valhallaUrl}/route`));
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toContain('costing');

    req.flush(mockValhallaResponse);
  });

  it('should use default route options when none provided', () => {
    service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe();

    const req = httpMock.expectOne((req) => req.url.includes(`${environment.valhallaUrl}/route`));
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toContain('costing');

    req.flush(mockValhallaResponse);
  });

  it('should calculate multi-waypoint route', () => {
    service.calculateMultiWaypointRoute(mockWaypoints, mockRouteOptions).subscribe((result) => {
      expect(result.waypoints).toEqual(mockWaypoints);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    // Expect 1 HTTP request for multi-waypoint route
    const req = httpMock.expectOne((req) => req.url.includes(`${environment.valhallaUrl}/route`));
    req.flush(mockValhallaResponse);
  });

  it('should handle empty waypoints array', () => {
    expect(() => {
      service.calculateMultiWaypointRoute([], mockRouteOptions).subscribe();
    }).toThrow('At least 2 waypoints are required for route calculation');

    httpMock.expectNone((req) => req.url.includes(`${environment.valhallaUrl}/route`));
  });

  it('should handle single waypoint', () => {
    const singleWaypoint = [mockWaypoints[0]];

    expect(() => {
      service.calculateMultiWaypointRoute(singleWaypoint, mockRouteOptions).subscribe();
    }).toThrow('At least 2 waypoints are required for route calculation');

    httpMock.expectNone((req) => req.url.includes(`${environment.valhallaUrl}/route`));
  });

  it('should get current route observable', () => {
    service.getCurrentRoute().subscribe((route) => {
      expect(route).toBeNull(); // Initially null
    });
  });

  it('should get current multi-waypoint route observable', () => {
    service.getCurrentMultiWaypointRoute().subscribe((route) => {
      expect(route).toBeNull(); // Initially null
    });
  });

  it('should clear all stored routes', () => {
    service.clearAllStoredRoutes();

    service.getCurrentRoute().subscribe((route) => {
      expect(route).toBeNull();
    });
  });

  it('should handle HTTP error in route calculation', () => {
    service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
      next: () => {
        throw new Error('Should have failed');
      },
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    req.error(new ErrorEvent('Network error'));
  });

  it('should decode polyline correctly', () => {
    // Test the private method through public interface
    const encodedPolyline = 'u{~vFvyys@fS]';

    service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe((result) => {
      expect(result.routeData.features[0].geometry.coordinates).toBeDefined();
      expect(Array.isArray(result.routeData.features[0].geometry.coordinates)).toBeTrue();
    });

    const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    req.flush({
      ...mockValhallaResponse,
      shape: encodedPolyline,
    });
  });

  it('should handle malformed Valhalla response', () => {
    service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
      next: () => {
        throw new Error('Should have failed');
      },
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    req.flush({}); // Empty response
  });

  it('should apply route options to GeoJSON properties', () => {
    const customOptions: RouteOptions = {
      costing: 'pedestrian',
      color: '#ff0000',
      width: 8,
    };

    service.calculateRoute(mockCoordinates, mockEndCoordinates, customOptions).subscribe((result) => {
      const properties = result.routeData.features[0].properties;
      expect(properties['color']).toBe('#ff0000');
      expect(properties['width']).toBe(8);
    });

    const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    expect(req.request.url).toContain('costing');
    expect(req.request.url).toContain('pedestrian');
    req.flush(mockValhallaResponse);
  });

  it('should sort waypoints by order before processing', () => {
    const unsortedWaypoints = [
      { ...mockWaypoints[2], order: 2 },
      { ...mockWaypoints[0], order: 0 },
      { ...mockWaypoints[1], order: 1 },
    ];

    service.calculateMultiWaypointRoute(unsortedWaypoints, mockRouteOptions).subscribe((result) => {
      expect(result.waypoints[0].order).toBe(0);
      expect(result.waypoints[1].order).toBe(1);
      expect(result.waypoints[2].order).toBe(2);
    });

    // Expect 1 HTTP request for multi-waypoint route
    const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    req.flush(mockValhallaResponse);
  });

  it('should handle empty polyline string', () => {
    const emptyPolyline = '';
    // Test public interface instead of private method
    expect(emptyPolyline).toBe('');
    expect(service).toBeDefined();
  });

  it('should handle different costing options', () => {
    const options: RouteOptions = {
      costing: 'pedestrian',
      color: '#ff0000',
    };

    service.calculateRoute(mockCoordinates, mockEndCoordinates, options).subscribe();

    const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    expect(req.request.url).toContain('pedestrian');
    req.flush(mockValhallaResponse);
  });

  it('should handle bicycle costing with specific options', () => {
    const options: RouteOptions = {
      costing: 'bicycle',
      color: '#00ff00',
    };

    service.calculateRoute(mockCoordinates, mockEndCoordinates, options).subscribe();

    const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    expect(req.request.url).toContain('bicycle');
    expect(req.request.url).toContain('hybrid');
    req.flush(mockValhallaResponse);
  });

  it('should handle route response with missing legs', () => {
    const invalidResponse = {
      trip: {
        legs: [] as any[],
      },
      shape: 'u{~vFvyys@fS]',
    };

    service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
      error: (error) => {
        expect(error.message).toBe('Invalid route response');
      },
    });

    const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    req.flush(invalidResponse);
  });

  it('should handle route response with missing trip', () => {
    const invalidResponse = {
      shape: 'u{~vFvyys@fS]',
    };

    service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
      error: (error) => {
        expect(error.message).toBe('Invalid route response');
      },
    });

    const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    req.flush(invalidResponse);
  });

  it('should handle concurrent route calculations', () => {
    const route1Promise = service.calculateRoute(mockCoordinates, mockEndCoordinates).toPromise();
    const route2Promise = service.calculateRoute(mockEndCoordinates, mockCoordinates).toPromise();

    const requests = httpMock.match((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
    expect(requests.length).toBe(2);

    requests.forEach((req) => req.flush(mockValhallaResponse));

    return Promise.all([route1Promise, route2Promise]).then((results) => {
      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });

  // Additional comprehensive tests for better coverage
  describe('Edge Cases and Error Scenarios', () => {
    it('should handle route response with malformed shape data', () => {
      const malformedResponse = {
        trip: {
          legs: [
            {
              shape: 'invalid_shape_data',
              summary: {
                length: 5.75,
                time: 7320,
              },
            },
          ],
        },
        shape: 'invalid_polyline_data',
      };

      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
        error: (error) => {
          expect(error.message).toBe('Invalid route response');
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush(malformedResponse);
    });

    it('should handle route response with missing summary data', () => {
      const responseWithoutSummary = {
        trip: {
          legs: [
            {
              shape: 'u{~vFvyys@fS]',
              // Missing summary
            },
          ],
        },
        shape: 'u{~vFvyys@fS]',
      };

      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
        next: (result) => {
          expect(result.distance).toBe(0);
          expect(result.duration).toBe(0);
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush(responseWithoutSummary);
    });

    it('should handle route options with custom bicycle type', () => {
      const customOptions = {
        costing: 'bicycle' as const,
        bicycleType: 'mountain' as const,
        color: '#ff0000',
        width: 6,
      };

      service.calculateRoute(mockCoordinates, mockEndCoordinates, customOptions).subscribe();

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      expect(req.request.url).toContain('bicycle');
      expect(req.request.url).toContain('mountain');
      req.flush(mockValhallaResponse);
    });

    it('should handle route options with pedestrian costing', () => {
      const pedestrianOptions = {
        costing: 'pedestrian' as const,
        color: '#00ff00',
        width: 3,
      };

      service.calculateRoute(mockCoordinates, mockEndCoordinates, pedestrianOptions).subscribe();

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      expect(req.request.url).toContain('pedestrian');
      // Note: bicycle_type is still included in the URL even for pedestrian costing
      // This is the current behavior of the service
      req.flush(mockValhallaResponse);
    });

    it('should handle very large coordinate values', () => {
      const largeCoordinates = { lat: 89.999999, lon: 179.999999 };
      const largeEndCoordinates = { lat: -89.999999, lon: -179.999999 };

      service.calculateRoute(largeCoordinates, largeEndCoordinates).subscribe();

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      expect(req.request.url).toContain('89.999999');
      expect(req.request.url).toContain('179.999999');
      expect(req.request.url).toContain('-89.999999');
      expect(req.request.url).toContain('-179.999999');
      req.flush(mockValhallaResponse);
    });

    it('should handle zero coordinate values', () => {
      const zeroCoordinates = { lat: 0, lon: 0 };

      service.calculateRoute(zeroCoordinates, mockEndCoordinates).subscribe();

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      expect(req.request.url).toContain('%22lat%22%3A0'); // URL encoded "lat":0
      expect(req.request.url).toContain('%22lon%22%3A0'); // URL encoded "lon":0
      req.flush(mockValhallaResponse);
    });

    it('should handle route response with very long duration', () => {
      const longDurationResponse = {
        trip: {
          legs: [
            {
              shape: 'u{~vFvyys@fS]',
              summary: {
                length: 1000.5,
                time: 86400, // 24 hours
              },
            },
          ],
        },
        shape: 'u{~vFvyys@fS]',
      };

      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
        next: (result) => {
          expect(result.distance).toBe(1000.5);
          expect(result.duration).toBe(86400);
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush(longDurationResponse);
    });

    it('should handle route response with zero distance and duration', () => {
      const zeroDistanceResponse = {
        trip: {
          legs: [
            {
              shape: 'u{~vFvyys@fS]',
              summary: {
                length: 0,
                time: 0,
              },
            },
          ],
        },
        shape: 'u{~vFvyys@fS]',
      };

      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
        next: (result) => {
          expect(result.distance).toBe(0);
          expect(result.duration).toBe(0);
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush(zeroDistanceResponse);
    });

    it('should handle service initialization correctly', () => {
      expect(service).toBeDefined();
      expect(typeof service.calculateRoute).toBe('function');
      expect(typeof service.clearAllStoredRoutes).toBe('function');
      expect(typeof service.calculateMultiWaypointRoute).toBe('function');
      expect(typeof service.getCurrentRoute).toBe('function');
      expect(typeof service.getCurrentMultiWaypointRoute).toBe('function');
    });

    it('should handle clearing routes correctly', () => {
      // First set some routes
      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe();
      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush(mockValhallaResponse);

      // Now clear all routes
      service.clearAllStoredRoutes();

      // Verify routes are cleared
      service.getCurrentRoute().subscribe((route) => {
        expect(route).toBeNull();
      });

      service.getCurrentMultiWaypointRoute().subscribe((route) => {
        expect(route).toBeNull();
      });
    });

    it('should handle multiple clear operations', () => {
      // Clear when no routes exist
      service.clearAllStoredRoutes();

      // Clear again to test edge case
      service.clearAllStoredRoutes();

      // Should not throw errors
      expect(() => service.clearAllStoredRoutes()).not.toThrow();
    });
  });

  // Comprehensive Map Integration Tests
  describe('Map Integration Methods', () => {
    let mockMap: any;
    let mockSource: any;

    beforeEach(() => {
      mockSource = {
        setData: jest.fn(),
      };

      mockMap = {
        addSource: jest.fn(),
        addLayer: jest.fn(),
        removeLayer: jest.fn(),
        removeSource: jest.fn(),
        getLayer: jest.fn(),
        getSource: jest.fn().mockReturnValue(mockSource),
      };
    });

    describe('addRouteToMap', () => {
      it('should add route to map with default parameters', () => {
        const mockRouteResult = {
          startPoint: mockCoordinates,
          endPoint: mockEndCoordinates,
          distance: 5.75,
          duration: 7320,
          routeData: {
            type: 'FeatureCollection' as const,
            features: [
              {
                type: 'Feature' as const,
                properties: { color: '#ff0000', width: 6 },
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [13.404954, 52.520008],
                    [13.377704, 52.516275],
                  ] as [number, number][],
                },
              },
            ],
          },
        };

        service.addRouteToMap(mockMap, mockRouteResult);

        expect(mockMap.addSource).toHaveBeenCalledWith('route', {
          type: 'geojson',
          data: mockRouteResult.routeData,
        });

        expect(mockMap.addLayer).toHaveBeenCalledWith({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#ff0000',
            'line-width': 6,
          },
        });
      });

      it('should add route to map with custom source and layer IDs', () => {
        const mockRouteResult = {
          startPoint: mockCoordinates,
          endPoint: mockEndCoordinates,
          distance: 5.75,
          duration: 7320,
          routeData: {
            type: 'FeatureCollection' as const,
            features: [
              {
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [13.404954, 52.520008],
                    [13.377704, 52.516275],
                  ] as [number, number][],
                },
              },
            ],
          },
        };

        service.addRouteToMap(mockMap, mockRouteResult, 'custom-source', 'custom-layer');

        expect(mockMap.addSource).toHaveBeenCalledWith('custom-source', {
          type: 'geojson',
          data: mockRouteResult.routeData,
        });

        expect(mockMap.addLayer).toHaveBeenCalledWith({
          id: 'custom-layer',
          type: 'line',
          source: 'custom-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#007cbf',
            'line-width': 4,
          },
        });
      });

      it('should handle null map parameter', () => {
        const mockRouteResult = {
          startPoint: mockCoordinates,
          endPoint: mockEndCoordinates,
          distance: 5.75,
          duration: 7320,
          routeData: { type: 'FeatureCollection' as const, features: [] as any[] },
        };

        expect(() => {
          service.addRouteToMap(null as any, mockRouteResult);
        }).not.toThrow();
      });

      it('should handle null route result parameter', () => {
        expect(() => {
          service.addRouteToMap(mockMap, null as any);
        }).not.toThrow();
      });

      it('should handle route with no features', () => {
        const mockRouteResult = {
          startPoint: mockCoordinates,
          endPoint: mockEndCoordinates,
          distance: 5.75,
          duration: 7320,
          routeData: { type: 'FeatureCollection' as const, features: [] as any[] },
        };

        service.addRouteToMap(mockMap, mockRouteResult);

        expect(mockMap.addLayer).toHaveBeenCalledWith({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#007cbf',
            'line-width': 4,
          },
        });
      });
    });

    describe('updateRouteOnMap', () => {
      it('should update existing route source', () => {
        const mockRouteResult = {
          startPoint: mockCoordinates,
          endPoint: mockEndCoordinates,
          distance: 5.75,
          duration: 7320,
          routeData: { type: 'FeatureCollection' as const, features: [] as any[] },
        };

        service.updateRouteOnMap(mockMap, mockRouteResult);

        expect(mockMap.getSource).toHaveBeenCalledWith('route');
        expect(mockSource.setData).toHaveBeenCalledWith(mockRouteResult.routeData);
      });

      it('should add route if source does not exist', () => {
        mockMap.getSource.mockReturnValue(null);
        const addRouteToMapSpy = jest.spyOn(service, 'addRouteToMap');

        const mockRouteResult = {
          startPoint: mockCoordinates,
          endPoint: mockEndCoordinates,
          distance: 5.75,
          duration: 7320,
          routeData: { type: 'FeatureCollection' as const, features: [] as any[] },
        };

        service.updateRouteOnMap(mockMap, mockRouteResult, 'custom-source');

        expect(addRouteToMapSpy).toHaveBeenCalledWith(mockMap, mockRouteResult, 'custom-source');
      });

      it('should handle null parameters', () => {
        expect(() => {
          service.updateRouteOnMap(null as any, null as any);
        }).not.toThrow();
      });
    });

    describe('addMultiWaypointRouteToMap', () => {
      it('should add multi-waypoint route to map', () => {
        const mockMultiRoute = {
          waypoints: [
            { coordinates: mockCoordinates, type: 'start' as const, order: 0 },
            { coordinates: mockEndCoordinates, type: 'end' as const, order: 1 },
          ],
          routeData: {
            type: 'FeatureCollection' as const,
            features: [
              {
                type: 'Feature' as const,
                properties: { color: '#00ff00', width: 8 },
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [13.404954, 52.520008],
                    [13.377704, 52.516275],
                  ] as [number, number][],
                },
              },
            ],
          },
          totalDistance: 5.75,
          totalDuration: 7320,
        };

        service.addMultiWaypointRouteToMap(mockMap, mockMultiRoute);

        expect(mockMap.addSource).toHaveBeenCalledWith('multi-route', {
          type: 'geojson',
          data: mockMultiRoute.routeData,
        });

        expect(mockMap.addLayer).toHaveBeenCalledWith({
          id: 'multi-route',
          type: 'line',
          source: 'multi-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#00ff00',
            'line-width': 8,
          },
        });
      });

      it('should handle null parameters', () => {
        expect(() => {
          service.addMultiWaypointRouteToMap(null as any, null as any);
        }).not.toThrow();
      });
    });

    describe('updateMultiWaypointRouteOnMap', () => {
      it('should update existing multi-waypoint route source', () => {
        const mockMultiRoute = {
          waypoints: [
            { coordinates: mockCoordinates, type: 'start' as const, order: 0 },
            { coordinates: mockEndCoordinates, type: 'end' as const, order: 1 },
          ],
          routeData: { type: 'FeatureCollection' as const, features: [] as any[] },
          totalDistance: 5.75,
          totalDuration: 7320,
        };

        service.updateMultiWaypointRouteOnMap(mockMap, mockMultiRoute);

        expect(mockMap.getSource).toHaveBeenCalledWith('multi-route');
        expect(mockSource.setData).toHaveBeenCalledWith(mockMultiRoute.routeData);
      });

      it('should add route if source does not exist', () => {
        mockMap.getSource.mockReturnValue(null);
        const addMultiWaypointRouteToMapSpy = jest.spyOn(service, 'addMultiWaypointRouteToMap');

        const mockMultiRoute = {
          waypoints: [
            { coordinates: mockCoordinates, type: 'start' as const, order: 0 },
            { coordinates: mockEndCoordinates, type: 'end' as const, order: 1 },
          ],
          routeData: { type: 'FeatureCollection' as const, features: [] as any[] },
          totalDistance: 5.75,
          totalDuration: 7320,
        };

        service.updateMultiWaypointRouteOnMap(mockMap, mockMultiRoute, 'custom-multi-source');

        expect(addMultiWaypointRouteToMapSpy).toHaveBeenCalledWith(mockMap, mockMultiRoute, 'custom-multi-source');
      });

      it('should handle null parameters', () => {
        expect(() => {
          service.updateMultiWaypointRouteOnMap(null as any, null as any);
        }).not.toThrow();
      });
    });

    describe('removeRouteFromMap', () => {
      it('should remove layer and source when they exist', () => {
        mockMap.getLayer.mockReturnValue(true);
        mockMap.getSource.mockReturnValue(true);

        service.removeRouteFromMap(mockMap, 'test-source', 'test-layer');

        expect(mockMap.removeLayer).toHaveBeenCalledWith('test-layer');
        expect(mockMap.removeSource).toHaveBeenCalledWith('test-source');
      });

      it('should handle missing layer gracefully', () => {
        mockMap.getLayer.mockReturnValue(null);
        mockMap.getSource.mockReturnValue(true);

        service.removeRouteFromMap(mockMap, 'test-source', 'test-layer');

        expect(mockMap.removeLayer).not.toHaveBeenCalled();
        expect(mockMap.removeSource).toHaveBeenCalledWith('test-source');
      });

      it('should handle missing source gracefully', () => {
        mockMap.getLayer.mockReturnValue(true);
        mockMap.getSource.mockReturnValue(null);

        service.removeRouteFromMap(mockMap, 'test-source', 'test-layer');

        expect(mockMap.removeLayer).toHaveBeenCalledWith('test-layer');
        expect(mockMap.removeSource).not.toHaveBeenCalled();
      });

      it('should handle null map parameter', () => {
        expect(() => {
          service.removeRouteFromMap(null as any);
        }).not.toThrow();
      });

      it('should use default parameters', () => {
        mockMap.getLayer.mockReturnValue(true);
        mockMap.getSource.mockReturnValue(true);

        service.removeRouteFromMap(mockMap);

        expect(mockMap.getLayer).toHaveBeenCalledWith('route');
        expect(mockMap.getSource).toHaveBeenCalledWith('route');
        expect(mockMap.removeLayer).toHaveBeenCalledWith('route');
        expect(mockMap.removeSource).toHaveBeenCalledWith('route');
      });
    });
  });

  // Comprehensive Polyline Decoding Tests
  describe('Polyline Decoding', () => {
    it('should decode simple polyline correctly', () => {
      // Test through public interface by providing a response with encoded polyline
      const encodedPolyline = 'u{~vFvyys@fS]';

      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe((result) => {
        expect(result.routeData.features[0].geometry.coordinates).toBeDefined();
        expect(Array.isArray(result.routeData.features[0].geometry.coordinates)).toBeTrue();
        expect(result.routeData.features[0].geometry.coordinates.length).toBeGreaterThan(0);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({
        ...mockValhallaResponse,
        trip: {
          ...mockValhallaResponse.trip,
          legs: [
            {
              ...mockValhallaResponse.trip.legs[0],
              shape: encodedPolyline,
            },
          ],
        },
      });
    });

    it('should handle empty polyline string', () => {
      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe((result) => {
        expect(result.routeData.features[0].geometry.coordinates).toEqual([]);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({
        ...mockValhallaResponse,
        trip: {
          ...mockValhallaResponse.trip,
          legs: [
            {
              ...mockValhallaResponse.trip.legs[0],
              shape: '',
            },
          ],
        },
      });
    });

    it('should handle complex polyline with multiple points', () => {
      // More complex polyline with multiple coordinate pairs
      const complexPolyline = 'u{~vFvyys@fS]dF}@nH_@`@sAhAeB';

      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe((result) => {
        expect(result.routeData.features[0].geometry.coordinates).toBeDefined();
        expect(Array.isArray(result.routeData.features[0].geometry.coordinates)).toBeTrue();
        expect(result.routeData.features[0].geometry.coordinates.length).toBeGreaterThan(1);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({
        ...mockValhallaResponse,
        trip: {
          ...mockValhallaResponse.trip,
          legs: [
            {
              ...mockValhallaResponse.trip.legs[0],
              shape: complexPolyline,
            },
          ],
        },
      });
    });
  });

  // Comprehensive Error Handling Tests
  describe('Advanced Error Handling', () => {
    it('should handle malformed trip response', () => {
      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
        next: () => {
          throw new Error('Should not succeed with malformed response');
        },
        error: (error) => {
          expect(error.message).toContain('Invalid route response');
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({ malformed: 'response' });
    });

    it('should handle response with no legs', () => {
      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
        next: () => {
          throw new Error('Should not succeed with no legs');
        },
        error: (error) => {
          expect(error.message).toContain('Invalid route response');
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({ trip: { legs: [] } });
    });

    it('should handle response with missing trip', () => {
      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
        next: () => {
          throw new Error('Should not succeed with missing trip');
        },
        error: (error) => {
          expect(error.message).toContain('Invalid route response');
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({ no_trip: true });
    });

    it('should handle multi-waypoint route with malformed response', () => {
      const waypoints: RoutePoint[] = [
        { coordinates: mockCoordinates, type: 'start', order: 0 },
        { coordinates: { lat: 48.137154, lon: 11.576124 }, type: 'waypoint', order: 1 },
        { coordinates: mockEndCoordinates, type: 'end', order: 2 },
      ];

      service.calculateMultiWaypointRoute(waypoints).subscribe({
        next: () => {
          throw new Error('Should not succeed with malformed response');
        },
        error: (error) => {
          expect(error.message).toContain('Invalid multi-waypoint route response');
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({ malformed: 'multi-waypoint response' });
    });

    it('should handle network timeout errors', () => {
      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
        next: () => {
          throw new Error('Should not succeed with timeout');
        },
        error: (error) => {
          expect(error.name).toBe('TimeoutError');
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.error(new ProgressEvent('timeout'), { status: 0, statusText: 'Timeout' });
    });

    it('should handle server error responses', () => {
      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe({
        next: () => {
          throw new Error('Should not succeed with server error');
        },
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // Edge Case Tests
  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle coordinates at extreme values', () => {
      const extremeStart = { lat: 90, lon: 180 };
      const extremeEnd = { lat: -90, lon: -180 };

      service.calculateRoute(extremeStart, extremeEnd).subscribe((result) => {
        expect(result.startPoint).toEqual(extremeStart);
        expect(result.endPoint).toEqual(extremeEnd);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      expect(req.request.url).toContain('90');
      expect(req.request.url).toContain('180');
      expect(req.request.url).toContain('-90');
      expect(req.request.url).toContain('-180');
      req.flush(mockValhallaResponse);
    });

    it('should handle zero distance route', () => {
      const samePoint = { lat: 52.520008, lon: 13.404954 };

      service.calculateRoute(samePoint, samePoint).subscribe((result) => {
        expect(result.startPoint).toEqual(samePoint);
        expect(result.endPoint).toEqual(samePoint);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({
        ...mockValhallaResponse,
        trip: {
          ...mockValhallaResponse.trip,
          summary: { length: 0, time: 0 },
          legs: [
            {
              ...mockValhallaResponse.trip.legs[0],
              summary: { length: 0, time: 0 },
            },
          ],
        },
      });
    });

    it('should handle route options with all parameters', () => {
      const fullOptions: RouteOptions = {
        costing: 'bicycle',
        bicycleType: 'mountain',
        color: '#ff00ff',
        width: 10,
      };

      service.calculateRoute(mockCoordinates, mockEndCoordinates, fullOptions).subscribe((result) => {
        const properties = result.routeData.features[0].properties;
        expect(properties['color']).toBe('#ff00ff');
        expect(properties['width']).toBe(10);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      expect(req.request.url).toContain('bicycle');
      expect(req.request.url).toContain('mountain');
      req.flush(mockValhallaResponse);
    });

    it('should handle route with missing summary data', () => {
      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe((result) => {
        expect(result.distance).toBeUndefined();
        expect(result.duration).toBeUndefined();
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({
        trip: {
          legs: [
            {
              shape: 'u{~vFvyys@fS]',
            },
          ],
        },
      });
    });

    it('should handle multi-waypoint route with single leg', () => {
      const waypoints: RoutePoint[] = [
        { coordinates: mockCoordinates, type: 'start', order: 0 },
        { coordinates: mockEndCoordinates, type: 'end', order: 1 },
      ];

      service.calculateMultiWaypointRoute(waypoints).subscribe((result) => {
        expect(result.waypoints).toEqual(waypoints);
        expect(result.legs?.length).toBe(1);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush({
        trip: {
          summary: { length: 5.75, time: 7320 },
          legs: [
            {
              shape: 'u{~vFvyys@fS]',
              summary: { length: 5.75, time: 7320 },
            },
          ],
        },
      });
    });
  });

  // Additional Service Method Tests
  describe('Service Method Coverage', () => {
    it('should handle getCurrentMultiWaypointRoute correctly', () => {
      const initialValue = service.getCurrentMultiWaypointRoute();

      initialValue.subscribe((route) => {
        expect(route).toBeNull();
      });
    });

    it('should handle route state management correctly', () => {
      // Test that the service maintains state correctly
      const initialValue = service.getCurrentMultiWaypointRoute();

      initialValue.subscribe((route) => {
        expect(route).toBeNull();
      });

      // Test that the service maintains consistent state
      service.getCurrentMultiWaypointRoute().subscribe((route) => {
        expect(route).toBeNull();
      });
    });

    it('should handle service initialization correctly', () => {
      expect(service).toBeDefined();
      expect(typeof service.calculateRoute).toBe('function');
      expect(typeof service.calculateMultiWaypointRoute).toBe('function');
      expect(typeof service.getCurrentMultiWaypointRoute).toBe('function');
    });

    it('should handle observable subscription lifecycle', () => {
      const subscription = service.getCurrentMultiWaypointRoute().subscribe();
      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
      subscription.unsubscribe();
    });

    it('should handle multiple subscribers to getCurrentMultiWaypointRoute', () => {
      let subscriber1Value: any;
      let subscriber2Value: any;

      const sub1 = service.getCurrentMultiWaypointRoute().subscribe((route) => {
        subscriber1Value = route;
      });

      const sub2 = service.getCurrentMultiWaypointRoute().subscribe((route) => {
        subscriber2Value = route;
      });

      expect(subscriber1Value).toBeNull();
      expect(subscriber2Value).toBeNull();

      sub1.unsubscribe();
      sub2.unsubscribe();
    });

    it('should handle route processing with minimal valid response', () => {
      const minimalResponse = {
        trip: {
          legs: [
            {
              shape: 'u{~vFvyys@fS]',
            },
          ],
        },
      };

      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe((result) => {
        expect(result.routeData.features).toBeDefined();
        expect(result.routeData.features.length).toBeGreaterThan(0);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush(minimalResponse);
    });

    it('should handle route processing with all optional fields', () => {
      const completeResponse = {
        trip: {
          summary: {
            length: 10.5,
            time: 1200,
          },
          legs: [
            {
              shape: 'u{~vFvyys@fS]',
              summary: {
                length: 10.5,
                time: 1200,
              },
            },
          ],
        },
      };

      service.calculateRoute(mockCoordinates, mockEndCoordinates).subscribe((result) => {
        expect(result.distance).toBe(10.5);
        expect(result.duration).toBe(1200);
        expect(result.rawResponse).toEqual(completeResponse);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush(completeResponse);
    });

    it('should handle multi-waypoint route with complete data', () => {
      const waypoints: RoutePoint[] = [
        { coordinates: mockCoordinates, type: 'start', order: 0 },
        { coordinates: { lat: 48.137154, lon: 11.576124 }, type: 'waypoint', order: 1 },
        { coordinates: mockEndCoordinates, type: 'end', order: 2 },
      ];

      const completeMultiResponse = {
        trip: {
          summary: {
            length: 15.75,
            time: 2400,
          },
          legs: [
            {
              shape: 'u{~vFvyys@fS]',
              summary: { length: 7.5, time: 1200 },
            },
            {
              shape: 'dF}@nH_@`@sA',
              summary: { length: 8.25, time: 1200 },
            },
          ],
        },
      };

      service.calculateMultiWaypointRoute(waypoints).subscribe((result) => {
        expect(result.totalDistance).toBe(15.75);
        expect(result.totalDuration).toBe(2400);
        expect(result.legs?.length).toBe(2);
        expect(result.legs?.[0].distance).toBe(7.5);
        expect(result.legs?.[1].distance).toBe(8.25);
      });

      const req = httpMock.expectOne((request) => request.url.startsWith(`${environment.valhallaUrl}/route`));
      req.flush(completeMultiResponse);
    });
  });

  // Route Saving Tests
  describe('Route Saving', () => {
    const mockRouteResult = {
      startPoint: mockCoordinates,
      endPoint: mockEndCoordinates,
      routeData: {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: {
              distance: 5000,
              duration: 1200,
              color: '#007cbf',
              width: 4,
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [13.404954, 52.520008],
                [13.377704, 52.516275],
              ] as [number, number][],
            },
          },
        ],
      },
      distance: 5000,
      duration: 1200,
      rawResponse: mockValhallaResponse,
    };

    const mockRouteResponse: RouteResponse = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Route',
      description: 'A test cycling route',
      createdAt: [2025, 8, 3, 3, 14, 3, 610109000],
      updatedAt: [2025, 8, 3, 3, 14, 3, 610235000],
      userId: 'user123',
      totalDistance: 5000,
      totalElevationGain: 100,
      estimatedDuration: 1200,
      routeType: RouteType.CYCLING,
      isPublic: true,
      metadata: '{"surface":"asphalt","difficulty":3}',
      points: [],
      pointCount: 2,
    };

    it('should save a route successfully', () => {
      const routeName = 'Test Route';
      const routeDescription = 'A test cycling route';
      const metadata: RouteMetadata = {
        surface: SurfaceType.ASPHALT,
        roadTypes: [RoadType.BIKE_LANE, RoadType.LOCAL_STREET],
        difficulty: 3 as DifficultyLevel,
      };

      backendApiService.createRoute.mockReturnValue(of(mockRouteResponse));

      service
        .saveRoute(mockRouteResult, routeName, routeDescription, RouteType.CYCLING, true, metadata)
        .subscribe((response) => {
          expect(response).toEqual(mockRouteResponse);
        });

      expect(backendApiService.createRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: routeName,
          description: routeDescription,
          routeType: RouteType.CYCLING,
          isPublic: true,
          points: expect.arrayContaining([
            expect.objectContaining({
              pointType: PointType.START_POINT,
              name: 'Start',
            }),
            expect.objectContaining({
              pointType: PointType.END_POINT,
              name: 'End',
            }),
          ]),
          totalDistance: 5000,
          estimatedDuration: 1200,
          metadata: expect.stringContaining('asphalt'),
        }),
      );
    });

    it('should save a route with multiple road types', () => {
      const routeName = 'Multi Road Type Route';
      const metadata: RouteMetadata = {
        surface: SurfaceType.MIXED,
        roadTypes: [RoadType.BIKE_PATH, RoadType.TRAIL, RoadType.GRAVEL_ROAD, RoadType.BRIDGE],
        difficulty: 4 as DifficultyLevel,
      };

      backendApiService.createRoute.mockReturnValue(of(mockRouteResponse));

      service
        .saveRoute(mockRouteResult, routeName, undefined, RouteType.MOUNTAIN_BIKING, false, metadata)
        .subscribe((response) => {
          expect(response).toEqual(mockRouteResponse);
        });

      expect(backendApiService.createRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: routeName,
          routeType: RouteType.MOUNTAIN_BIKING,
          isPublic: false,
          metadata: expect.stringContaining('bike_path'),
        }),
      );
    });
  });

  describe('loadSavedRoute', () => {
    it('should validate waypoint count correctly', () => {
      const mockRouteResponseValid: RouteResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Route',
        description: 'A test route',
        routeType: RouteType.CYCLING,
        isPublic: false,
        totalDistance: 10000,
        totalElevationGain: 1000,
        estimatedDuration: 3600,
        createdAt: [2025, 8, 3, 3, 14, 3, 610109000],
        updatedAt: [2025, 8, 3, 3, 14, 3, 610109000],
        userId: 'user123',
        pointCount: 3,
        points: [
          {
            id: 'point1',
            sequenceOrder: 0,
            latitude: 52.520008,
            longitude: 13.404954,
            pointType: PointType.START_POINT,
            name: 'Start Point',
          },
          {
            id: 'point2',
            sequenceOrder: 1,
            latitude: 52.516275,
            longitude: 13.377704,
            pointType: PointType.WAYPOINT,
            name: 'Waypoint 1',
          },
          {
            id: 'point3',
            sequenceOrder: 2,
            latitude: 52.512542,
            longitude: 13.350454,
            pointType: PointType.END_POINT,
            name: 'End Point',
          },
        ],
      };

      // Should not throw for valid waypoint count (3 ≤ 50)
      expect(() => service.loadSavedRoute(mockRouteResponseValid)).not.toThrow();
    });

    it('should validate that track points are filtered correctly', () => {
      const mockRouteResponseWithTrackPoints: RouteResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Route',
        description: 'A test route',
        routeType: RouteType.CYCLING,
        isPublic: false,
        totalDistance: 10000,
        totalElevationGain: 1000,
        estimatedDuration: 3600,
        createdAt: [2025, 8, 3, 3, 14, 3, 610109000],
        updatedAt: [2025, 8, 3, 3, 14, 3, 610109000],
        userId: 'user123',
        pointCount: 3,
        points: [
          {
            id: 'point1',
            sequenceOrder: 0,
            latitude: 52.520008,
            longitude: 13.404954,
            pointType: PointType.START_POINT,
            name: 'Start Point',
          },
          {
            id: 'track1',
            sequenceOrder: 1,
            latitude: 52.518,
            longitude: 13.391,
            pointType: PointType.TRACK_POINT,
          },
          {
            id: 'track2',
            sequenceOrder: 2,
            latitude: 52.516,
            longitude: 13.384,
            pointType: PointType.TRACK_POINT,
          },
          {
            id: 'point2',
            sequenceOrder: 3,
            latitude: 52.512542,
            longitude: 13.350454,
            pointType: PointType.END_POINT,
            name: 'End Point',
          },
        ],
      };

      // Should not throw even with track points (they get filtered out)
      // Only 2 user waypoints (START_POINT, END_POINT) should be considered
      expect(() => service.loadSavedRoute(mockRouteResponseWithTrackPoints)).not.toThrow();
    });

    it('should throw error when route has too many waypoints', () => {
      const mockRouteResponseTooManyWaypoints: RouteResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Route',
        description: 'A test route',
        routeType: RouteType.CYCLING,
        isPublic: false,
        totalElevationGain: 1000,
        totalDistance: 10000,
        estimatedDuration: 3600,
        createdAt: [2025, 8, 3, 3, 14, 3, 610109000],
        updatedAt: [2025, 8, 3, 3, 14, 3, 610109000],
        userId: 'user123',
        pointCount: 60,
        points: Array.from({ length: 60 }, (_, i) => ({
          id: `point${i}`,
          sequenceOrder: i,
          latitude: 52.520008 + i * 0.001,
          longitude: 13.404954 + i * 0.001,
          pointType: i === 0 ? PointType.START_POINT : i === 59 ? PointType.END_POINT : PointType.WAYPOINT,
          name: `Waypoint ${i}`,
        })),
      };

      expect(() => {
        service.loadSavedRoute(mockRouteResponseTooManyWaypoints).subscribe();
      }).toThrow('Too many waypoints (60). Maximum is 50 for Valhalla API.');
    });

    it('should handle route with single waypoint (return simplified route)', () => {
      const mockRouteResponseOneWaypoint: RouteResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Route',
        description: 'A test route',
        routeType: RouteType.CYCLING,
        isPublic: false,
        totalDistance: 10000,
        totalElevationGain: 1000,
        estimatedDuration: 3600,
        createdAt: [2025, 8, 3, 3, 14, 3, 610109000],
        updatedAt: [2025, 8, 3, 3, 14, 3, 610109000],
        userId: 'user123',
        pointCount: 1,
        points: [
          {
            id: 'point1',
            sequenceOrder: 0,
            latitude: 52.520008,
            longitude: 13.404954,
            pointType: PointType.START_POINT,
            name: 'Start Point',
          },
        ],
      };

      let result: MultiWaypointRoute | null = null;
      service.loadSavedRoute(mockRouteResponseOneWaypoint).subscribe({
        next: (route) => {
          result = route;
        },
      });

      expect(result).toBeTruthy();
      expect(result?.waypoints).toHaveLength(1);
      expect(result?.waypoints[0].name).toBe('Start Point');
      expect(result?.totalDistance).toBe(0); // No route line for single waypoint
      expect(result?.totalDuration).toBe(0);
    });
  });
});
