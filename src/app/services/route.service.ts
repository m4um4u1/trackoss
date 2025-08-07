import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { Coordinates } from '../models/coordinates';
import { MultiWaypointRoute, RouteData, RouteLeg, RouteOptions, RoutePoint, RouteResult } from '../models/route';
import { environment } from '../../environments/environments';
import { ConfigService } from './config.service';
import { BackendApiService } from './backend-api.service';
import { PointType, RouteCreateRequest, RoutePointRequest, RouteResponse, RouteType } from '../models/backend-api';
import { RouteMetadata, serializeRouteMetadata } from '../models/route-metadata';

@Injectable({
  providedIn: 'root',
})
export class RouteService {
  // Modern Angular 20 dependency injection
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  private readonly backendApiService = inject(BackendApiService);

  // Signal-based state management
  private readonly _currentRoute = signal<RouteResult | null>(null);
  private readonly _currentMultiWaypointRoute = signal<MultiWaypointRoute | null>(null);
  private readonly _isCalculating = signal(false);
  private readonly _lastError = signal<string | null>(null);

  // Public readonly signals
  readonly currentRoute = this._currentRoute.asReadonly();
  readonly currentMultiWaypointRoute = this._currentMultiWaypointRoute.asReadonly();
  readonly isCalculating = this._isCalculating.asReadonly();
  readonly lastError = this._lastError.asReadonly();

  // Computed signals for derived state
  readonly hasRoute = computed(() => this._currentRoute() !== null);
  readonly hasMultiWaypointRoute = computed(() => this._currentMultiWaypointRoute() !== null);
  readonly routeDistance = computed(() => this._currentRoute()?.distance ?? 0);
  readonly routeDuration = computed(() => this._currentRoute()?.duration ?? 0);
  readonly multiRouteDistance = computed(() => this._currentMultiWaypointRoute()?.totalDistance ?? 0);
  readonly multiRouteDuration = computed(() => this._currentMultiWaypointRoute()?.totalDuration ?? 0);

  // Legacy BehaviorSubject support for backward compatibility
  private currentRoute$ = new BehaviorSubject<RouteResult | null>(null);
  private currentMultiWaypointRoute$ = new BehaviorSubject<MultiWaypointRoute | null>(null);

  /**
   * Calculate a route between two points
   */
  calculateRoute(start: Coordinates, end: Coordinates, options: RouteOptions = {}): Observable<RouteResult> {
    // Set loading state
    this._isCalculating.set(true);
    this._lastError.set(null);

    const costing = options.costing || 'bicycle';
    const bicycleType = options.bicycleType || 'hybrid';

    const requestBody = {
      locations: [
        { lat: start.lat, lon: start.lon },
        { lat: end.lat, lon: end.lon },
      ],
      costing: costing,
      bicycle_type: bicycleType,
    };

    return this.getRoutingBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}?json=${encodeURIComponent(JSON.stringify(requestBody))}`;
        return this.http.get(url);
      }),
      map((response: any) => {
        const routeResult = this.processRouteResponse(start, end, response, options);

        // Update signals
        this._currentRoute.set(routeResult);
        this._isCalculating.set(false);

        // Update legacy BehaviorSubject for backward compatibility
        this.currentRoute$.next(routeResult);

        return routeResult;
      }),
      catchError((error) => {
        console.error('Error calculating route:', error);

        // Update error state
        this._isCalculating.set(false);
        this._lastError.set(error.message || 'Failed to calculate route');

        throw error;
      }),
    );
  }

  /**
   * Get the current active route as an observable (legacy support)
   * @deprecated Use the currentRoute signal instead
   */
  getCurrentRoute(): Observable<RouteResult | null> {
    return this.currentRoute$.asObservable();
  }

  /**
   * Get the current active multi-waypoint route as an observable (legacy support)
   * @deprecated Use the currentMultiWaypointRoute signal instead
   */
  getCurrentMultiWaypointRoute(): Observable<MultiWaypointRoute | null> {
    return this.currentMultiWaypointRoute$.asObservable();
  }

  /**
   * Clear the current route and reset state
   */
  clearRoute(): void {
    this._currentRoute.set(null);
    this._lastError.set(null);
    this.currentRoute$.next(null);
  }

  /**
   * Clear the current multi-waypoint route and reset state
   */
  clearMultiWaypointRoute(): void {
    this._currentMultiWaypointRoute.set(null);
    this._lastError.set(null);
    this.currentMultiWaypointRoute$.next(null);
  }

  /**
   * Clear all routes and reset state
   */
  clearAllRoutes(): void {
    this.clearRoute();
    this.clearMultiWaypointRoute();
  }

  /**
   * Calculate a route through multiple waypoints
   */
  calculateMultiWaypointRoute(waypoints: RoutePoint[], options: RouteOptions = {}): Observable<MultiWaypointRoute> {
    if (waypoints.length < 2) {
      throw new Error('At least 2 waypoints are required for route calculation');
    }

    // Set loading state
    this._isCalculating.set(true);
    this._lastError.set(null);

    const costing = options.costing || 'bicycle';
    const bicycleType = options.bicycleType || 'hybrid';
    const locations = waypoints.map((wp) => ({
      lat: wp.coordinates.lat,
      lon: wp.coordinates.lon,
    }));

    const requestBody = {
      locations: locations,
      costing: costing,
      bicycle_type: bicycleType,
    };

    return this.getRoutingBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}?json=${encodeURIComponent(JSON.stringify(requestBody))}`;
        return this.http.get(url);
      }),
      map((response: any) => {
        const multiWaypointRoute = this.processMultiWaypointRouteResponse(waypoints, response, options);

        // Update signals
        this._currentMultiWaypointRoute.set(multiWaypointRoute);
        this._isCalculating.set(false);

        // Update legacy BehaviorSubject for backward compatibility
        this.currentMultiWaypointRoute$.next(multiWaypointRoute);

        return multiWaypointRoute;
      }),
      catchError((error) => {
        console.error('Error calculating multi-waypoint route:', error);

        // Update error state
        this._isCalculating.set(false);
        this._lastError.set(error.message || 'Failed to calculate multi-waypoint route');

        throw error;
      }),
    );
  }

  /**
   * Get the routing base URL based on environment configuration
   */
  private getRoutingBaseUrl(): Observable<string> {
    if (environment.production && environment.useConfigService) {
      return this.configService.loadConfig().pipe(map((config) => `${config.valhallaUrl}/route`));
    } else {
      return of(`${environment.valhallaUrl}/route`);
    }
  }

  /**
   * Process the raw route response from the routing service
   */
  private processRouteResponse(
    start: Coordinates,
    end: Coordinates,
    response: any,
    options: RouteOptions,
  ): RouteResult {
    if (!response.trip || !response.trip.legs || response.trip.legs.length === 0) {
      throw new Error('Invalid route response');
    }

    const leg = response.trip.legs[0];
    const decodedGeometry = this.decodePolyline(leg.shape, 6);
    const coordinates: [number, number][] = decodedGeometry.map(
      (point: number[]) => [point[1], point[0]] as [number, number],
    );

    const routeData: RouteData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            distance: leg.summary?.length,
            duration: leg.summary?.time,
            color: options.color || '#007cbf',
            width: options.width || 4,
          },
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        },
      ],
    };

    return {
      startPoint: start,
      endPoint: end,
      routeData,
      distance: response.trip.summary?.length,
      duration: response.trip.summary?.time,
      rawResponse: response,
    };
  }

  /**
   * Process the raw multi-waypoint route response from the routing service
   */
  private processMultiWaypointRouteResponse(
    waypoints: RoutePoint[],
    response: any,
    options: RouteOptions,
  ): MultiWaypointRoute {
    if (!response.trip || !response.trip.legs || response.trip.legs.length === 0) {
      throw new Error('Invalid multi-waypoint route response');
    }

    const legs: RouteLeg[] = [];
    const allCoordinates: [number, number][] = [];

    // Process each leg of the route
    response.trip.legs.forEach((leg: any, index: number) => {
      const decodedGeometry = this.decodePolyline(leg.shape, 6);
      const legCoordinates: [number, number][] = decodedGeometry.map(
        (point: number[]) => [point[1], point[0]] as [number, number],
      );

      // Add coordinates to the overall route (avoid duplicating waypoint coordinates)
      if (index === 0) {
        allCoordinates.push(...legCoordinates);
      } else {
        allCoordinates.push(...legCoordinates.slice(1)); // Skip first coordinate to avoid duplication
      }

      legs.push({
        startPoint: waypoints[index].coordinates,
        endPoint: waypoints[index + 1].coordinates,
        distance: leg.summary?.length,
        duration: leg.summary?.time,
        geometry: {
          type: 'LineString',
          coordinates: legCoordinates,
        },
      });
    });

    const routeData: RouteData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            distance: response.trip.summary?.length,
            duration: response.trip.summary?.time,
            color: options.color || '#007cbf',
            width: options.width || 4,
          },
          geometry: {
            type: 'LineString',
            coordinates: allCoordinates,
          },
        },
      ],
    };

    return {
      waypoints,
      routeData,
      totalDistance: response.trip.summary?.length,
      totalDuration: response.trip.summary?.time,
      legs,
      rawResponse: response,
    };
  }

  /**
   * Add a route to a MapLibre map instance
   */
  addRouteToMap(
    map: MapLibreMap,
    routeResult: RouteResult,
    sourceId: string = 'route',
    layerId: string = 'route',
  ): void {
    if (!map || !routeResult) return;

    const routeData = routeResult.routeData;
    const properties = routeData.features[0]?.properties || {};

    // Remove existing route if it exists
    this.removeRouteFromMap(map, sourceId, layerId);

    // Add the route source
    map.addSource(sourceId, {
      type: 'geojson',
      data: routeData,
    });

    // Add the route layer
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': properties['color'] || '#007cbf',
        'line-width': properties['width'] || 4,
      },
    });
  }

  /**
   * Update an existing route on a map
   */
  updateRouteOnMap(map: MapLibreMap, routeResult: RouteResult, sourceId: string = 'route'): void {
    if (!map || !routeResult) return;

    const source = map.getSource(sourceId) as GeoJSONSource;
    if (source) {
      source.setData(routeResult.routeData);
    } else {
      this.addRouteToMap(map, routeResult, sourceId);
    }
  }

  /**
   * Add a multi-waypoint route to a MapLibre map instance
   */
  addMultiWaypointRouteToMap(
    map: MapLibreMap,
    multiWaypointRoute: MultiWaypointRoute,
    sourceId: string = 'multi-route',
    layerId: string = 'multi-route',
  ): void {
    if (!map || !multiWaypointRoute) return;

    const routeData = multiWaypointRoute.routeData;
    const properties = routeData.features[0]?.properties || {};

    // Remove existing route if it exists
    this.removeRouteFromMap(map, sourceId, layerId);

    // Add the route source
    map.addSource(sourceId, {
      type: 'geojson',
      data: routeData,
    });

    // Add the route layer
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': properties['color'] || '#007cbf',
        'line-width': properties['width'] || 4,
      },
    });
  }

  /**
   * Update an existing multi-waypoint route on a map
   */
  updateMultiWaypointRouteOnMap(
    map: MapLibreMap,
    multiWaypointRoute: MultiWaypointRoute,
    sourceId: string = 'multi-route',
  ): void {
    if (!map || !multiWaypointRoute) return;

    const source = map.getSource(sourceId) as GeoJSONSource;
    if (source) {
      source.setData(multiWaypointRoute.routeData);
    } else {
      this.addMultiWaypointRouteToMap(map, multiWaypointRoute, sourceId);
    }
  }

  /**
   * Remove a route from a map
   */
  removeRouteFromMap(map: MapLibreMap, sourceId: string = 'route', layerId: string = 'route'): void {
    if (!map) return;

    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  }

  /**
   * Clear all stored routes
   */
  clearAllStoredRoutes(): void {
    this.currentRoute$.next(null);
    this.currentMultiWaypointRoute$.next(null);
  }

  /**
   * Decode a polyline string into coordinates
   */
  private decodePolyline(str: string, precision: number = 6): number[][] {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates: number[][] = [];
    let shift = 0;
    let result = 0;
    let byte = null;
    let latitude_change;
    let longitude_change;
    const factor = Math.pow(10, precision);

    while (index < str.length) {
      // Reset shift, result, and byte
      byte = null;
      shift = 0;
      result = 0;

      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      latitude_change = result & 1 ? ~(result >> 1) : result >> 1;

      shift = result = 0;

      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      longitude_change = result & 1 ? ~(result >> 1) : result >> 1;

      lat += latitude_change;
      lng += longitude_change;

      coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
  }

  /**
   * Save a route result to the backend
   */
  saveRoute(
    routeResult: RouteResult,
    name: string,
    description?: string,
    routeType: RouteType = RouteType.CYCLING,
    isPublic: boolean = false,
    metadata?: RouteMetadata,
  ): Observable<RouteResponse> {
    const routeRequest = this.convertRouteResultToCreateRequest(
      routeResult,
      name,
      description,
      routeType,
      isPublic,
      metadata,
    );
    return this.backendApiService.createRoute(routeRequest);
  }

  /**
   * Save a multi-waypoint route to the backend
   */
  saveMultiWaypointRoute(
    multiWaypointRoute: MultiWaypointRoute,
    name: string,
    description?: string,
    routeType: RouteType = RouteType.CYCLING,
    isPublic: boolean = false,
    metadata?: RouteMetadata,
  ): Observable<RouteResponse> {
    const routeRequest = this.convertMultiWaypointRouteToCreateRequest(
      multiWaypointRoute,
      name,
      description,
      routeType,
      isPublic,
      metadata,
    );
    return this.backendApiService.createRoute(routeRequest);
  }

  /**
   * Convert RouteResult to RouteCreateRequest for backend API
   */
  private convertRouteResultToCreateRequest(
    routeResult: RouteResult,
    name: string,
    description?: string,
    routeType: RouteType = RouteType.CYCLING,
    isPublic: boolean = false,
    metadata?: RouteMetadata,
  ): RouteCreateRequest {
    const points: RoutePointRequest[] = [];

    // Only save start and end points - no track points
    // The route geometry is only used for drawing on the map
    points.push({
      latitude: routeResult.startPoint.lat,
      longitude: routeResult.startPoint.lon,
      pointType: PointType.START_POINT,
      name: 'Start',
    });

    points.push({
      latitude: routeResult.endPoint.lat,
      longitude: routeResult.endPoint.lon,
      pointType: PointType.END_POINT,
      name: 'End',
    });

    return {
      name,
      description,
      routeType,
      isPublic,
      points,
      totalDistance: routeResult.distance,
      estimatedDuration: routeResult.duration,
      metadata: metadata ? serializeRouteMetadata(metadata) : undefined,
    };
  }

  /**
   * Convert MultiWaypointRoute to RouteCreateRequest for backend API
   */
  private convertMultiWaypointRouteToCreateRequest(
    multiWaypointRoute: MultiWaypointRoute,
    name: string,
    description?: string,
    routeType: RouteType = RouteType.CYCLING,
    isPublic: boolean = false,
    metadata?: RouteMetadata,
  ): RouteCreateRequest {
    const points: RoutePointRequest[] = [];

    // Save ONLY user waypoints - no track points from Valhalla
    multiWaypointRoute.waypoints.forEach((waypoint, index) => {
      let pointType: PointType;
      if (index === 0) {
        pointType = PointType.START_POINT;
      } else if (index === multiWaypointRoute.waypoints.length - 1) {
        pointType = PointType.END_POINT;
      } else {
        pointType = PointType.WAYPOINT;
      }

      points.push({
        latitude: waypoint.coordinates.lat,
        longitude: waypoint.coordinates.lon,
        pointType,
        name: waypoint.name || `${pointType.toLowerCase().replace('_', ' ')}`,
      });
    });

    return {
      name,
      description,
      routeType,
      isPublic,
      points,
      totalDistance: multiWaypointRoute.totalDistance,
      estimatedDuration: multiWaypointRoute.totalDuration,
      metadata: metadata ? serializeRouteMetadata(metadata) : undefined,
    };
  }

  /**
   * Load a saved route and reconstruct it using Valhalla
   * Simple approach: extract user waypoints and recalculate for map display
   */
  loadSavedRoute(routeResponse: RouteResponse, options: RouteOptions = {}): Observable<MultiWaypointRoute> {
    // Extract user waypoints from saved route (no track points)
    const userWaypoints: RoutePoint[] = routeResponse.points
      .filter((point) => point.pointType !== PointType.TRACK_POINT)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map((point) => ({
        coordinates: { lat: point.latitude, lon: point.longitude },
        type:
          point.pointType === PointType.START_POINT
            ? 'start'
            : point.pointType === PointType.END_POINT
              ? 'end'
              : 'waypoint',
        id: point.id,
        name: point.name,
        order: point.sequenceOrder,
      }));

    // Allow routes with any number of waypoints - even single locations for display
    if (userWaypoints.length === 0) {
      throw new Error('No waypoints found in saved route');
    }

    // For routes with only 1 waypoint, we can't calculate a route but can still display the location
    if (userWaypoints.length === 1) {
      // Create a simple "route" with just the single waypoint for display
      const singlePointRoute: MultiWaypointRoute = {
        waypoints: userWaypoints,
        totalDistance: 0,
        totalDuration: 0,
        routeData: {
          type: 'FeatureCollection',
          features: [],
        },
        legs: [],
      };
      return of(singlePointRoute);
    }

    if (userWaypoints.length > 50) {
      throw new Error(`Too many waypoints (${userWaypoints.length}). Maximum is 50 for Valhalla API.`);
    }

    // Recalculate route using Valhalla for fresh polyline data
    return this.calculateMultiWaypointRoute(userWaypoints, options);
  }
}
