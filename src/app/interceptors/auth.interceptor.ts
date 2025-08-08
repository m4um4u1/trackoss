import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Check if it's our backend API (localhost:8080, relative URLs, or 127.0.0.1)
  const isOurBackendApi =
    req.url.includes('localhost:8080') || req.url.includes('127.0.0.1:8080') || req.url.startsWith('/api/');

  // Skip adding token for public endpoints
  const isPublicEndpoint =
    req.url.includes('/api/auth/') ||
    req.url.includes('/api/map-proxy/') ||
    req.url.includes('/api/routes/public') ||
    req.url.includes('/api/health');

  // Check for external APIs that should not get auth headers
  const isMapTilerApi = req.url.includes('api.maptiler.com') || req.url.includes('maptiler.com');

  const isValhallaApi = req.url.includes('valhalla') || req.url.includes('openstreetmap.de');

  const isExternalApi = isMapTilerApi || isValhallaApi || (req.url.startsWith('http') && !isOurBackendApi);

  // Don't add authorization header for external APIs or public endpoints
  if (isExternalApi || isPublicEndpoint) {
    return next(req);
  }

  // Add authorization header for our backend API calls that need authentication
  if (token && (isOurBackendApi || !req.url.startsWith('http'))) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(authReq);
  }

  return next(req);
};
