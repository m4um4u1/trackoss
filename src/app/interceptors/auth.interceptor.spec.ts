import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jest.Mocked<AuthService>;

  const mockToken = 'test-token-123';

  beforeEach(() => {
    const authServiceSpy = {
      getToken: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Backend API requests', () => {
    it('should add authorization header for localhost:8080 requests', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.get('http://localhost:8080/api/routes').subscribe();

      const req = httpMock.expectOne('http://localhost:8080/api/routes');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });

    it('should add authorization header for relative API requests', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.get('/api/routes').subscribe();

      const req = httpMock.expectOne('/api/routes');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });

    it('should not add authorization header when no token', () => {
      authService.getToken.mockReturnValue(null);

      httpClient.get('/api/routes').subscribe();

      const req = httpMock.expectOne('/api/routes');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });
  });

  describe('Public endpoints', () => {
    it('should not add authorization header for auth endpoints', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.post('/api/auth/login', {}).subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });

    it('should not add authorization header for map-proxy endpoints', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.get('/api/map-proxy/tiles/1/2/3').subscribe();

      const req = httpMock.expectOne('/api/map-proxy/tiles/1/2/3');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });

    it('should not add authorization header for public routes', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.get('/api/routes/public').subscribe();

      const req = httpMock.expectOne('/api/routes/public');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });

    it('should not add authorization header for health endpoint', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.get('/api/health').subscribe();

      const req = httpMock.expectOne('/api/health');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });
  });

  describe('External APIs', () => {
    it('should not add authorization header for MapTiler API', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.get('https://api.maptiler.com/tiles/v3/1/2/3.png').subscribe();

      const req = httpMock.expectOne('https://api.maptiler.com/tiles/v3/1/2/3.png');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });

    it('should not add authorization header for Valhalla API', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.get('https://valhalla1.openstreetmap.de/route').subscribe();

      const req = httpMock.expectOne('https://valhalla1.openstreetmap.de/route');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });

    it('should not add authorization header for other external APIs', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.get('https://external-api.com/data').subscribe();

      const req = httpMock.expectOne('https://external-api.com/data');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle requests with existing headers', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient
        .get('/api/routes', {
          headers: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          },
        })
        .subscribe();

      const req = httpMock.expectOne('/api/routes');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.headers.get('X-Custom-Header')).toBe('custom-value');
    });

    it('should handle POST requests with body', () => {
      authService.getToken.mockReturnValue(mockToken);

      const body = { name: 'Test Route' };
      httpClient.post('/api/routes', body).subscribe();

      const req = httpMock.expectOne('/api/routes');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      expect(req.request.body).toEqual(body);
    });

    it('should handle PUT requests', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.put('/api/routes/123', {}).subscribe();

      const req = httpMock.expectOne('/api/routes/123');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });

    it('should handle DELETE requests', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.delete('/api/routes/123').subscribe();

      const req = httpMock.expectOne('/api/routes/123');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });

    it('should handle requests with query parameters', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.get('/api/routes?page=1&size=10').subscribe();

      const req = httpMock.expectOne('/api/routes?page=1&size=10');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });

    it('should not add header for auth register endpoint', () => {
      authService.getToken.mockReturnValue(mockToken);

      httpClient.post('/api/auth/register', {}).subscribe();

      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });

    it('should handle requests to production backend URL', () => {
      authService.getToken.mockReturnValue(mockToken);

      // Using a generic production URL pattern - the actual IP is filtered in the interceptor
      httpClient.get('http://backend.example.com:8080/api/routes').subscribe();

      const req = httpMock.expectOne('http://backend.example.com:8080/api/routes');
      // This should not add auth header as it's an external URL without matching patterns
      expect(req.request.headers.has('Authorization')).toBe(false);
    });

    it('should add authorization header for configured backend URL', () => {
      authService.getToken.mockReturnValue(mockToken);

      // Test with localhost which is explicitly checked in the interceptor
      httpClient.get('http://localhost:8080/api/routes').subscribe();

      const req = httpMock.expectOne('http://localhost:8080/api/routes');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });
  });
});
