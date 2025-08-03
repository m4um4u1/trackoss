import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environments';
import { ConfigService } from './config.service';
import {
  NearbyRoutesRequest,
  PageResponse,
  RouteCreateRequest,
  RouteResponse,
  RouteSearchRequest,
} from '../models/backend-api';

@Injectable({
  providedIn: 'root',
})
export class BackendApiService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  /**
   * Create a new route in the backend
   */
  createRoute(routeRequest: RouteCreateRequest): Observable<RouteResponse> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes`;
        return this.http.post<RouteResponse>(url, routeRequest);
      }),
      catchError((error) => {
        console.error('Error creating route:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Get a route by ID
   */
  getRoute(id: string): Observable<RouteResponse> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes/${id}`;
        return this.http.get<RouteResponse>(url);
      }),
      catchError((error) => {
        console.error('Error getting route:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Update an existing route
   */
  updateRoute(id: string, routeRequest: RouteCreateRequest): Observable<RouteResponse> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes/${id}`;
        return this.http.put<RouteResponse>(url, routeRequest);
      }),
      catchError((error) => {
        console.error('Error updating route:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Delete a route
   */
  deleteRoute(id: string): Observable<void> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes/${id}`;
        return this.http.delete<void>(url);
      }),
      catchError((error) => {
        console.error('Error deleting route:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Search routes with pagination and filtering
   */
  searchRoutes(searchRequest: RouteSearchRequest): Observable<PageResponse<RouteResponse>> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes`;
        let params = new HttpParams()
          .set('page', searchRequest.pageable.page.toString())
          .set('size', searchRequest.pageable.size.toString());

        if (searchRequest.search) {
          params = params.set('search', searchRequest.search);
        }
        if (searchRequest.userId) {
          params = params.set('userId', searchRequest.userId);
        }
        if (searchRequest.publicOnly !== undefined) {
          params = params.set('publicOnly', searchRequest.publicOnly.toString());
        }
        if (searchRequest.pageable.sort) {
          searchRequest.pageable.sort.forEach((sort) => {
            params = params.append('sort', sort);
          });
        }

        return this.http.get<PageResponse<RouteResponse>>(url, { params });
      }),
      catchError((error) => {
        console.error('Error searching routes:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Get public routes
   */
  getPublicRoutes(page: number = 0, size: number = 20): Observable<PageResponse<RouteResponse>> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes/public`;
        const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

        return this.http.get<PageResponse<RouteResponse>>(url, { params });
      }),
      catchError((error) => {
        console.error('Error getting public routes:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Get routes with optional filtering and pagination
   */
  getRoutes(params: any = {}): Observable<PageResponse<RouteResponse>> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes`;
        let httpParams = new HttpParams()
          .set('page', params.page?.toString() || '0')
          .set('size', params.size?.toString() || '20');

        // Add filter parameters if provided
        if (params.search) httpParams = httpParams.set('search', params.search);
        if (params.routeType) httpParams = httpParams.set('routeType', params.routeType);
        if (params.difficulty) httpParams = httpParams.set('difficulty', params.difficulty);
        if (params.minDistance) httpParams = httpParams.set('minDistance', params.minDistance);
        if (params.maxDistance) httpParams = httpParams.set('maxDistance', params.maxDistance);
        if (params.surfaceType) httpParams = httpParams.set('surfaceType', params.surfaceType);

        if (params.sort) httpParams = httpParams.set('sort', params.sort);

        return this.http.get<PageResponse<RouteResponse>>(url, { params: httpParams });
      }),
      catchError((error) => {
        console.error('Error getting routes:', error);
        throw this.handleApiError(error);
      }),
    );
  }
  /**
   * Find routes near a location
   */
  findNearbyRoutes(nearbyRequest: NearbyRoutesRequest): Observable<PageResponse<RouteResponse>> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes/nearby`;
        let params = new HttpParams()
          .set('latitude', nearbyRequest.latitude.toString())
          .set('longitude', nearbyRequest.longitude.toString())
          .set('radiusKm', nearbyRequest.radiusKm.toString())
          .set('page', nearbyRequest.pageable.page.toString())
          .set('size', nearbyRequest.pageable.size.toString());

        if (nearbyRequest.pageable.sort) {
          nearbyRequest.pageable.sort.forEach((sort) => {
            params = params.append('sort', sort);
          });
        }

        return this.http.get<PageResponse<RouteResponse>>(url, { params });
      }),
      catchError((error) => {
        console.error('Error finding nearby routes:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Export route as GPX
   */
  exportRouteAsGpx(id: string): Observable<Blob> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes/${id}/export/gpx`;
        return this.http.get(url, { responseType: 'blob' });
      }),
      catchError((error) => {
        console.error('Error exporting route as GPX:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Export route as GeoJSON
   */
  exportRouteAsGeoJson(id: string): Observable<any> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/routes/${id}/export/geojson`;
        return this.http.get(url);
      }),
      catchError((error) => {
        console.error('Error exporting route as GeoJSON:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Import route from raw GeoJSON data
   */
  importFromGeoJsonRaw(geoJsonData: string, routeName?: string): Observable<RouteResponse> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        let url = `${baseUrl}/api/routes/import/geojson/raw`;
        if (routeName) {
          const params = new HttpParams().set('routeName', routeName);
          url += `?${params.toString()}`;
        }
        return this.http.post<RouteResponse>(url, geoJsonData, {
          headers: { 'Content-Type': 'application/json' },
        });
      }),
      catchError((error) => {
        console.error('Error importing route from GeoJSON:', error);
        throw this.handleApiError(error);
      }),
    );
  }

  /**
   * Get the backend base URL based on environment configuration
   */
  private getBackendBaseUrl(): Observable<string> {
    if (environment.production && environment.useConfigService) {
      return this.configService.loadConfig().pipe(map((config) => config.baseUrl));
    } else {
      // In development, use the environment baseUrl directly
      return of(environment.baseUrl);
    }
  }

  /**
   * Get the map proxy URL for map tile requests
   * This centralizes the /api/map-proxy path in the service
   */
  getMapProxyUrl(): Observable<string> {
    if (environment.production && environment.useConfigService) {
      return this.configService.loadConfig().pipe(map((config) => config.baseUrl + '/api/map-proxy'));
    } else {
      // In development, use the environment baseUrl which includes
      return of(environment.baseUrl + '/api/map-proxy');
    }
  }

  /**
   * Handle API errors and convert to user-friendly messages
   */
  private handleApiError(error: any): Error {
    if (error.error && error.error.message) {
      return new Error(error.error.message);
    } else if (error.message) {
      return new Error(error.message);
    } else {
      return new Error('An unexpected error occurred while communicating with the server');
    }
  }
}
