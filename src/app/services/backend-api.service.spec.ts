import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { BackendApiService } from './backend-api.service';
import { ConfigService } from './config.service';
import { environment } from '../../environments/environments';
import { PageResponse, PointType, RouteCreateRequest, RouteResponse, RouteType } from '../models/backend-api';

describe('BackendApiService', () => {
  let service: BackendApiService;
  let httpMock: HttpTestingController;
  let configService: jest.Mocked<ConfigService>;

  const mockRouteCreateRequest: RouteCreateRequest = {
    name: 'Test Route',
    description: 'A test cycling route',
    routeType: RouteType.CYCLING,
    isPublic: true,
    points: [
      {
        latitude: 52.520008,
        longitude: 13.404954,
        pointType: PointType.START_POINT,
        name: 'Start',
      },
      {
        latitude: 52.516275,
        longitude: 13.377704,
        pointType: PointType.END_POINT,
        name: 'End',
      },
    ],
    totalDistance: 5000,
    estimatedDuration: 1200,
    metadata: '{"surface":"asphalt","difficulty":3}',
  };

  const mockRouteResponse: RouteResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Route',
    description: 'A test cycling route',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    userId: 'user123',
    totalDistance: 5000,
    totalElevationGain: 100,
    estimatedDuration: 1200,
    routeType: RouteType.CYCLING,
    isPublic: true,
    metadata: '{"surface":"asphalt","difficulty":3}',
    points: [
      {
        id: '456e7890-e89b-12d3-a456-426614174001',
        sequenceOrder: 0,
        latitude: 52.520008,
        longitude: 13.404954,
        pointType: PointType.START_POINT,
        name: 'Start',
      },
      {
        id: '456e7890-e89b-12d3-a456-426614174002',
        sequenceOrder: 1,
        latitude: 52.516275,
        longitude: 13.377704,
        pointType: PointType.END_POINT,
        name: 'End',
      },
    ],
    pointCount: 2,
  };

  beforeEach(() => {
    const configServiceSpy = {
      loadConfig: jest.fn().mockReturnValue(
        of({
          mapTileProxyBaseUrl: 'http://test-config.com/api/map-proxy',
          valhallaUrl: 'http://test-config.com/valhalla',
        }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BackendApiService,
        { provide: ConfigService, useValue: configServiceSpy },
      ],
    });
    service = TestBed.inject(BackendApiService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createRoute', () => {
    it('should create a route successfully', () => {
      service.createRoute(mockRouteCreateRequest).subscribe((response) => {
        expect(response).toEqual(mockRouteResponse);
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockRouteCreateRequest);
      req.flush(mockRouteResponse);
    });

    it('should handle create route error', () => {
      const errorMessage = 'Invalid route data';

      service.createRoute(mockRouteCreateRequest).subscribe({
        next: () => {
          throw new Error('Should have failed');
        },
        error: (error) => {
          expect(error.message).toBe(errorMessage);
        },
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes`);
      req.error(new ErrorEvent('Network error'), {
        status: 400,
        statusText: 'Bad Request',
        error: { message: errorMessage },
      });
    });
  });

  describe('getRoute', () => {
    it('should get a route by ID', () => {
      const routeId = '123e4567-e89b-12d3-a456-426614174000';

      service.getRoute(routeId).subscribe((response) => {
        expect(response).toEqual(mockRouteResponse);
      });

      const req = httpMock.expectOne(
        `${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes/${routeId}`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockRouteResponse);
    });

    it('should handle route not found error', () => {
      const routeId = 'non-existent-id';

      service.getRoute(routeId).subscribe({
        next: () => {
          throw new Error('Should have failed');
        },
        error: (error) => {
          expect(error.message).toBe('Route not found');
        },
      });

      const req = httpMock.expectOne(
        `${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes/${routeId}`,
      );
      req.error(new ErrorEvent('Network error'), {
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Route not found' },
      });
    });
  });

  describe('updateRoute', () => {
    it('should update a route successfully', () => {
      const routeId = '123e4567-e89b-12d3-a456-426614174000';
      const updatedResponse = { ...mockRouteResponse, name: 'Updated Route' };

      service.updateRoute(routeId, mockRouteCreateRequest).subscribe((response) => {
        expect(response).toEqual(updatedResponse);
      });

      const req = httpMock.expectOne(
        `${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes/${routeId}`,
      );
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockRouteCreateRequest);
      req.flush(updatedResponse);
    });
  });

  describe('deleteRoute', () => {
    it('should delete a route successfully', () => {
      const routeId = '123e4567-e89b-12d3-a456-426614174000';

      service.deleteRoute(routeId).subscribe((response) => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(
        `${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes/${routeId}`,
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('searchRoutes', () => {
    it('should search routes with pagination', () => {
      const searchRequest = {
        search: 'test',
        publicOnly: true,
        pageable: { page: 0, size: 10 },
      };

      const mockPageResponse: PageResponse<RouteResponse> = {
        totalPages: 1,
        totalElements: 1,
        first: true,
        size: 10,
        content: [mockRouteResponse],
        number: 0,
        numberOfElements: 1,
        last: true,
        empty: false,
      };

      service.searchRoutes(searchRequest).subscribe((response) => {
        expect(response).toEqual(mockPageResponse);
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url.includes('/api/routes') &&
          request.params.get('search') === 'test' &&
          request.params.get('publicOnly') === 'true'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockPageResponse);
    });
  });

  describe('getPublicRoutes', () => {
    it('should get public routes', () => {
      const mockPageResponse: PageResponse<RouteResponse> = {
        totalPages: 1,
        totalElements: 1,
        first: true,
        size: 20,
        content: [mockRouteResponse],
        number: 0,
        numberOfElements: 1,
        last: true,
        empty: false,
      };

      service.getPublicRoutes().subscribe((response) => {
        expect(response).toEqual(mockPageResponse);
      });

      const req = httpMock.expectOne(
        `${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes/public?page=0&size=20`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPageResponse);
    });
  });

  describe('findNearbyRoutes', () => {
    it('should find nearby routes', () => {
      const nearbyRequest = {
        latitude: 52.520008,
        longitude: 13.404954,
        radiusKm: 10,
        pageable: { page: 0, size: 10 },
      };

      const mockPageResponse: PageResponse<RouteResponse> = {
        totalPages: 1,
        totalElements: 1,
        first: true,
        size: 10,
        content: [mockRouteResponse],
        number: 0,
        numberOfElements: 1,
        last: true,
        empty: false,
      };

      service.findNearbyRoutes(nearbyRequest).subscribe((response) => {
        expect(response).toEqual(mockPageResponse);
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url.includes('/api/routes/nearby') &&
          request.params.get('latitude') === '52.520008' &&
          request.params.get('longitude') === '13.404954' &&
          request.params.get('radiusKm') === '10'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockPageResponse);
    });
  });

  describe('exportRouteAsGpx', () => {
    it('should export route as GPX', () => {
      const routeId = '123e4567-e89b-12d3-a456-426614174000';
      const mockBlob = new Blob(['<gpx>...</gpx>'], { type: 'application/xml' });

      service.exportRouteAsGpx(routeId).subscribe((response) => {
        expect(response).toEqual(mockBlob);
      });

      const req = httpMock.expectOne(
        `${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes/${routeId}/export/gpx`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockBlob);
    });
  });

  describe('exportRouteAsGeoJson', () => {
    it('should export route as GeoJSON', () => {
      const routeId = '123e4567-e89b-12d3-a456-426614174000';
      const mockGeoJson = { type: 'FeatureCollection', features: [] };

      service.exportRouteAsGeoJson(routeId).subscribe((response) => {
        expect(response).toEqual(mockGeoJson);
      });

      const req = httpMock.expectOne(
        `${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes/${routeId}/export/geojson`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockGeoJson);
    });
  });

  describe('importFromGeoJsonRaw', () => {
    it('should import route from raw GeoJSON', () => {
      const geoJsonData = '{"type":"FeatureCollection","features":[]}';
      const routeName = 'Imported Route';

      service.importFromGeoJsonRaw(geoJsonData, routeName).subscribe((response) => {
        expect(response).toEqual(mockRouteResponse);
      });

      const req = httpMock.expectOne(
        `${environment.mapTileProxyBaseUrl.replace('/api/map-proxy', '')}/api/routes/import/geojson/raw?routeName=${encodeURIComponent(routeName)}`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBe(geoJsonData);
      req.flush(mockRouteResponse);
    });
  });
});
