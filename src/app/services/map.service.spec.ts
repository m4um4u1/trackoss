import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MapService } from './map.service';
import { ConfigService } from './config.service';
import { environment } from '../../environments/environments';
import { of } from 'rxjs';

describe('MapService', () => {
  let service: MapService;
  let httpMock: HttpTestingController;
  let configService: jest.Mocked<ConfigService>;

  const mockStyleResponse = {
    version: 8,
    name: 'Test Style',
    sources: {},
    layers: [] as any[],
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
        MapService,
        { provide: ConfigService, useValue: configServiceSpy },
      ],
    });
    service = TestBed.inject(MapService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(ConfigService) as jest.Mocked<ConfigService>;
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

      const style = 'outdoor';
      service.getMapTiles(style).subscribe();

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStyleResponse);

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

      const style = 'outdoor';
      service.getMapTiles(style).subscribe();

      expect(configService.loadConfig).toHaveBeenCalled();
      const req = httpMock.expectOne(`http://test-config.com/api/map-proxy/${style}/style.json`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStyleResponse);

      // Restore original environment
      (environment as any).production = originalEnv;
      (environment as any).useConfigService = originalUseConfig;
    });
  });

  it('should get map tiles for outdoor style', () => {
    const style = 'outdoor';

    service.getMapTiles(style).subscribe((response) => {
      expect(response).toEqual(mockStyleResponse);
    });

    const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStyleResponse);
  });

  it('should get map tiles for different styles', () => {
    const styles = ['outdoor', 'street', 'satellite'];

    styles.forEach((style) => {
      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStyleResponse);
    });
  });

  it('should handle HTTP error', () => {
    const style = 'outdoor';

    service.getMapTiles(style).subscribe({
      next: () => {
        throw new Error('Should have failed');
      },
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
    req.error(new ErrorEvent('Network error'));
  });

  it('should use correct base URL from environment', () => {
    const style = 'test-style';
    const expectedUrl = `${environment.mapTileProxyBaseUrl}/${style}/style.json`;

    service.getMapTiles(style).subscribe();

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.url).toBe(expectedUrl);
    req.flush(mockStyleResponse);
  });

  it('should handle empty style parameter', () => {
    const style = '';

    service.getMapTiles(style).subscribe((response) => {
      expect(response).toEqual(mockStyleResponse);
    });

    const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
    req.flush(mockStyleResponse);
  });

  it('should handle special characters in style name', () => {
    const style = 'test-style_with-special.chars';

    service.getMapTiles(style).subscribe((response) => {
      expect(response).toEqual(mockStyleResponse);
    });

    const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
    req.flush(mockStyleResponse);
  });

  describe('Advanced Error Handling and Edge Cases', () => {
    it('should handle server error responses', () => {
      const style = 'outdoor';

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with server error');
        },
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.error(new ErrorEvent('Server error'), { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle timeout errors', () => {
      const style = 'outdoor';

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with timeout');
        },
        error: (error) => {
          expect(error.name).toBe('TimeoutError');
        },
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.error(new ProgressEvent('timeout'), { status: 0, statusText: 'Timeout' });
    });

    it('should handle malformed JSON response', () => {
      const style = 'outdoor';

      service.getMapTiles(style).subscribe({
        next: (response) => {
          expect(response).toEqual('invalid json');
        },
        error: () => {
          throw new Error('Should not error with malformed JSON');
        },
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.flush('invalid json', { headers: { 'content-type': 'application/json' } });
    });

    it('should handle null response', () => {
      const style = 'outdoor';

      service.getMapTiles(style).subscribe({
        next: (response) => {
          expect(response).toBeNull();
        },
        error: () => {
          throw new Error('Should not error with null response');
        },
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.flush(null);
    });

    it('should handle empty response', () => {
      const style = 'outdoor';

      service.getMapTiles(style).subscribe({
        next: (response) => {
          expect(response).toEqual({});
        },
        error: () => {
          throw new Error('Should not error with empty response');
        },
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.flush({});
    });

    it('should handle very long style names', () => {
      const style = 'a'.repeat(1000); // Very long style name

      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.flush(mockStyleResponse);
    });

    it('should handle style names with unicode characters', () => {
      const style = 'style-with-unicode-🗺️-characters';

      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.flush(mockStyleResponse);
    });

    it('should handle concurrent requests for same style', () => {
      const style = 'outdoor';

      const request1 = service.getMapTiles(style);
      const request2 = service.getMapTiles(style);
      const request3 = service.getMapTiles(style);

      let responseCount = 0;
      const checkResponse = (response: any) => {
        expect(response).toEqual(mockStyleResponse);
        responseCount++;
      };

      request1.subscribe({ next: checkResponse });
      request2.subscribe({ next: checkResponse });
      request3.subscribe({ next: checkResponse });

      // Should make 3 separate requests
      const reqs = httpMock.match(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      expect(reqs.length).toBe(3);

      reqs.forEach((req) => req.flush(mockStyleResponse));
      expect(responseCount).toBe(3);
    });

    it('should handle concurrent requests for different styles', () => {
      const styles = ['outdoor', 'street', 'satellite'];

      styles.forEach((style) => {
        service.getMapTiles(style).subscribe((response) => {
          expect(response).toEqual(mockStyleResponse);
        });
      });

      styles.forEach((style) => {
        const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
        req.flush(mockStyleResponse);
      });
    });

    it('should handle network connectivity issues', () => {
      const style = 'outdoor';

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with network error');
        },
        error: (error) => {
          expect(error.type).toBe('error');
        },
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    });

    it('should handle 404 not found errors', () => {
      const style = 'non-existent-style';

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with 404');
        },
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.error(new ErrorEvent('Not found'), { status: 404, statusText: 'Not Found' });
    });

    it('should handle 403 forbidden errors', () => {
      const style = 'restricted-style';

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with 403');
        },
        error: (error) => {
          expect(error.status).toBe(403);
        },
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.error(new ErrorEvent('Forbidden'), { status: 403, statusText: 'Forbidden' });
    });

    it('should handle complex style response with all properties', () => {
      const complexStyleResponse = {
        version: 8,
        name: 'Complex Test Style',
        metadata: {
          'mapbox:autocomposite': true,
          'mapbox:type': 'template',
        },
        sources: {
          'mapbox-streets': {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-streets-v8',
          },
          'mapbox-terrain': {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          },
        },
        sprite: 'mapbox://sprites/mapbox/streets-v11',
        glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#f8f4f0',
            },
          },
          {
            id: 'water',
            type: 'fill',
            source: 'mapbox-streets',
            'source-layer': 'water',
            paint: {
              'fill-color': '#a0c8f0',
            },
          },
        ],
        terrain: {
          source: 'mapbox-terrain',
          exaggeration: 1.5,
        },
        fog: {
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6,
        },
      };

      const style = 'complex-style';

      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(complexStyleResponse);
        expect(response.version).toBe(8);
        expect(response.sources).toBeDefined();
        expect(response.layers).toBeDefined();
        expect(response.terrain).toBeDefined();
        expect(response.fog).toBeDefined();
      });

      const req = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req.flush(complexStyleResponse);
    });

    it('should handle service instantiation correctly', () => {
      expect(service).toBeDefined();
      expect(typeof service.getMapTiles).toBe('function');
    });

    it('should handle multiple error scenarios in sequence', () => {
      const style = 'test-style';

      // First request - network error
      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with network error');
        },
        error: (error) => {
          expect(error.type).toBe('error');
        },
      });

      const req1 = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req1.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

      // Second request - server error
      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with server error');
        },
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req2 = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req2.error(new ErrorEvent('Server error'), { status: 500, statusText: 'Internal Server Error' });

      // Third request - success
      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      const req3 = httpMock.expectOne(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
      req3.flush(mockStyleResponse);
    });
  });
});
