import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MapService } from './map.service';
import { MapTilerService } from './maptiler.service';
import { ConfigService } from './config.service';
import { of, throwError } from 'rxjs';
import { environment } from '../../environments/environments';

describe('MapService', () => {
  let service: MapService;
  let httpMock: HttpTestingController;
  let mapTilerService: jest.Mocked<MapTilerService>;
  let configService: jest.Mocked<ConfigService>;
  let originalConsoleError: jest.SpyInstance;

  const mockStyleResponse = {
    version: 8,
    name: 'Test Style',
    sources: {},
    layers: [] as any[],
  };

  beforeEach(() => {
    // Mock console.error once
    originalConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mapTilerServiceSpy = {
      getMapStyle: jest.fn().mockReturnValue(of(mockStyleResponse)),
      styles: {
        outdoor: 'outdoor-v2',
        streets: 'streets-v2',
        satellite: 'satellite',
      },
    };

    const configServiceSpy = {
      loadConfig: jest.fn().mockReturnValue(
        of({
          mapTilerUrl: 'https://api.maptiler.com/maps',
          mapTilerApiKey: 'test-fake-api-key-for-unit-tests-only',
        }),
      ),
    };

    // Set environment to use direct MapTiler URL
    (environment as any).mapTilerUrl = 'https://api.maptiler.com/maps';
    (environment as any).mapTilerApiKey = 'test-fake-api-key-for-unit-tests-only';

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MapService,
        { provide: MapTilerService, useValue: mapTilerServiceSpy },
        { provide: ConfigService, useValue: configServiceSpy },
      ],
    });
    service = TestBed.inject(MapService);
    httpMock = TestBed.inject(HttpTestingController);
    mapTilerService = TestBed.inject(MapTilerService) as jest.Mocked<MapTilerService>;
    configService = TestBed.inject(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    httpMock.verify();
    // Restore console.error after each test
    originalConsoleError.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('MapTiler Integration Tests', () => {
    it('should use MapTilerService to get map styles', () => {
      const style = 'outdoor';
      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);
    });

    it('should handle different map styles', () => {
      const style = 'satellite';

      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);
    });
  });

  it('should get map tiles for outdoor style', () => {
    const style = 'outdoor';

    service.getMapTiles(style).subscribe((response) => {
      expect(response).toEqual(mockStyleResponse);
    });

    expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);
  });

  it('should get map tiles for different styles', () => {
    const styles = ['outdoor', 'street', 'satellite'];

    styles.forEach((style) => {
      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);
    });
  });

  it('should handle HTTP error', () => {
    const style = 'outdoor';
    const mockError = new Error('Network error');
    mapTilerService.getMapStyle.mockReturnValue(throwError(() => mockError));

    service.getMapTiles(style).subscribe({
      next: () => {
        throw new Error('Should have failed');
      },
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);

    // Handle the fallback HTTP request
    const req = httpMock.expectOne((request) => request.url.includes(style));
    req.flush(mockStyleResponse);
  });

  it('should handle fallback to legacy method on error', () => {
    const style = 'test-style';
    // First call fails, triggers fallback
    mapTilerService.getMapStyle.mockReturnValueOnce(throwError(() => new Error('MapTiler error')));

    service.getMapTiles(style).subscribe();

    // Legacy method uses direct HTTP call
    const req = httpMock.expectOne((request) => request.url.includes(style));
    req.flush(mockStyleResponse);
  });

  it('should handle empty style parameter', () => {
    const style = '';

    service.getMapTiles(style).subscribe((response) => {
      expect(response).toEqual(mockStyleResponse);
    });

    expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);
  });

  it('should handle special characters in style name', () => {
    const style = 'test-style_with-special.chars';

    service.getMapTiles(style).subscribe((response) => {
      expect(response).toEqual(mockStyleResponse);
    });

    expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);
  });

  describe('Advanced Error Handling and Edge Cases', () => {
    it('should handle server error responses', () => {
      const style = 'outdoor';
      const mockError = { status: 500, message: 'Server error' };
      mapTilerService.getMapStyle.mockReturnValue(throwError(() => mockError));

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with server error');
        },
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      // Handle the fallback HTTP request
      const req = httpMock.expectOne((request) => request.url.includes(style));
      req.flush(mockStyleResponse);
    });

    it('should handle timeout errors', () => {
      const style = 'outdoor';
      const mockError = { name: 'TimeoutError', message: 'Request timeout' };
      mapTilerService.getMapStyle.mockReturnValue(throwError(() => mockError));

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with timeout');
        },
        error: (error) => {
          expect(error.name).toBe('TimeoutError');
        },
      });

      // Handle the fallback HTTP request
      const req = httpMock.expectOne((request) => request.url.includes(style));
      req.flush(mockStyleResponse);
    });

    it('should handle malformed JSON response', () => {
      const style = 'outdoor';
      // Mock returns invalid response, but service handles it
      mapTilerService.getMapStyle.mockReturnValue(of('invalid json'));

      service.getMapTiles(style).subscribe({
        next: (response) => {
          expect(response).toEqual('invalid json');
        },
        error: () => {
          throw new Error('Should not error with malformed JSON');
        },
      });
    });

    it('should handle null response', () => {
      const style = 'outdoor';
      mapTilerService.getMapStyle.mockReturnValue(of(null));

      service.getMapTiles(style).subscribe({
        next: (response) => {
          expect(response).toBeNull();
        },
        error: () => {
          throw new Error('Should not error with null response');
        },
      });
    });

    it('should handle empty response', () => {
      const style = 'outdoor';
      mapTilerService.getMapStyle.mockReturnValue(of({}));

      service.getMapTiles(style).subscribe({
        next: (response) => {
          expect(response).toEqual({});
        },
        error: () => {
          throw new Error('Should not error with empty response');
        },
      });
    });

    it('should handle very long style names', () => {
      const style = 'a'.repeat(1000); // Very long style name

      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);
    });

    it('should handle style names with unicode characters', () => {
      const style = 'style-with-unicode-🗺️-characters';

      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);
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

      // Should call the service 3 times
      expect(mapTilerService.getMapStyle).toHaveBeenCalledTimes(3);
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
        expect(mapTilerService.getMapStyle).toHaveBeenCalledWith(style);
      });
    });

    it('should handle network connectivity issues', () => {
      const style = 'outdoor';
      const mockError = { type: 'error', message: 'Network connectivity issue' };
      mapTilerService.getMapStyle.mockReturnValue(throwError(() => mockError));

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with network error');
        },
        error: (error) => {
          expect(error.type).toBe('error');
        },
      });

      // Handle the fallback HTTP request
      const req = httpMock.expectOne((request) => request.url.includes(style));
      req.flush(mockStyleResponse);
    });

    it('should handle 404 not found errors', () => {
      const style = 'non-existent-style';
      const mockError = { status: 404, message: 'Not found' };
      mapTilerService.getMapStyle.mockReturnValue(throwError(() => mockError));

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with 404');
        },
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      // Handle the fallback HTTP request
      const req = httpMock.expectOne((request) => request.url.includes(style));
      req.flush(mockStyleResponse);
    });

    it('should handle 403 forbidden errors', () => {
      const style = 'restricted-style';
      const mockError = { status: 403, message: 'Forbidden' };
      mapTilerService.getMapStyle.mockReturnValue(throwError(() => mockError));

      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with 403');
        },
        error: (error) => {
          expect(error.status).toBe(403);
        },
      });

      // Handle the fallback HTTP request
      const req = httpMock.expectOne((request) => request.url.includes(style));
      req.flush(mockStyleResponse);
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
      mapTilerService.getMapStyle.mockReturnValue(of(complexStyleResponse));

      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(complexStyleResponse);
        expect(response.version).toBe(8);
        expect(response.sources).toBeDefined();
        expect(response.layers).toBeDefined();
        expect(response.terrain).toBeDefined();
        expect(response.fog).toBeDefined();
      });
    });

    it('should handle service instantiation correctly', () => {
      expect(service).toBeDefined();
      expect(typeof service.getMapTiles).toBe('function');
    });

    it('should handle multiple error scenarios in sequence', () => {
      const style = 'test-style';

      // First request - network error
      mapTilerService.getMapStyle.mockReturnValueOnce(throwError(() => ({ type: 'error', message: 'Network error' })));
      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with network error');
        },
        error: (error) => {
          expect(error.type).toBe('error');
        },
      });

      // Handle the first fallback HTTP request
      const req1 = httpMock.expectOne((request) => request.url.includes(style));
      req1.flush(mockStyleResponse);

      // Second request - server error
      mapTilerService.getMapStyle.mockReturnValueOnce(throwError(() => ({ status: 500, message: 'Server error' })));
      service.getMapTiles(style).subscribe({
        next: () => {
          throw new Error('Should have failed with server error');
        },
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      // Handle the second fallback HTTP request
      const req2 = httpMock.expectOne((request) => request.url.includes(style));
      req2.flush(mockStyleResponse);

      // Third request - success
      mapTilerService.getMapStyle.mockReturnValueOnce(of(mockStyleResponse));
      service.getMapTiles(style).subscribe((response) => {
        expect(response).toEqual(mockStyleResponse);
      });

      expect(mapTilerService.getMapStyle).toHaveBeenCalledTimes(3);
    });
  });
});
