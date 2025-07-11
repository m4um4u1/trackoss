import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { Coordinates } from '../models/coordinates';
import { RouteData, RouteResult, RouteOptions, MultiWaypointRoute, RoutePoint, RouteLeg } from '../models/route';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root',
})
export class RouteService {
  private routingBaseUrl: string = environment.valhallaUrl + '/route';
  private currentRoute$ = new BehaviorSubject<RouteResult | null>(null);
  private currentMultiWaypointRoute$ = new BehaviorSubject<MultiWaypointRoute | null>(null);
  private activeRoutes = new Map<string, RouteResult>();
  private activeMultiWaypointRoutes = new Map<string, MultiWaypointRoute>();

  constructor(private http: HttpClient) {}

  /**
   * Get the current active route as an observable
   */
  getCurrentRoute(): Observable<RouteResult | null> {
    return this.currentRoute$.asObservable();
  }

  /**
   * Get the current active multi-waypoint route as an observable
   */
  getCurrentMultiWaypointRoute(): Observable<MultiWaypointRoute | null> {
    return this.currentMultiWaypointRoute$.asObservable();
  }

  /**
   * Calculate a route between two points
   */
  calculateRoute(start: Coordinates, end: Coordinates, options: RouteOptions = {}): Observable<RouteResult> {
    const costing = options.costing || 'bicycle';
    const bicycleType = options.bicycleType || 'hybrid';

    const requestBody = {
      locations: [
        { lat: start.lat, lon: start.lon },
        { lat: end.lat, lon: end.lon }
      ],
      costing: costing,
      bicycle_type: bicycleType
    };

    const url = `${this.routingBaseUrl}?json=${encodeURIComponent(JSON.stringify(requestBody))}`;

    return this.http.get(url).pipe(
      map((response: any) => {
        const routeResult = this.processRouteResponse(start, end, response, options);
        this.currentRoute$.next(routeResult);
        return routeResult;
      }),
      catchError((error) => {
        console.error('Error calculating route:', error);
        throw error;
      }),
    );
  }

  /**
   * Calculate a route through multiple waypoints
   */
  calculateMultiWaypointRoute(waypoints: RoutePoint[], options: RouteOptions = {}): Observable<MultiWaypointRoute> {
    if (waypoints.length < 2) {
      throw new Error('At least 2 waypoints are required for route calculation');
    }

    const costing = options.costing || 'bicycle';
    const bicycleType = options.bicycleType || 'hybrid';
    const locations = waypoints.map(wp => ({
      lat: wp.coordinates.lat,
      lon: wp.coordinates.lon
    }));

    const requestBody = {
      locations: locations,
      costing: costing,
      bicycle_type: bicycleType
    };

    const url = `${this.routingBaseUrl}?json=${encodeURIComponent(JSON.stringify(requestBody))}`;

    return this.http.get(url).pipe(
      map((response: any) => {
        const multiWaypointRoute = this.processMultiWaypointRouteResponse(waypoints, response, options);
        this.currentMultiWaypointRoute$.next(multiWaypointRoute);
        return multiWaypointRoute;
      }),
      catchError((error) => {
        console.error('Error calculating multi-waypoint route:', error);
        throw error;
      }),
    );
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

    console.log(response);

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

    console.log('Multi-waypoint route response:', response);

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
  updateMultiWaypointRouteOnMap(map: MapLibreMap, multiWaypointRoute: MultiWaypointRoute, sourceId: string = 'multi-route'): void {
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
   * Store a route with a custom identifier
   */
  storeRoute(routeId: string, routeResult: RouteResult): void {
    this.activeRoutes.set(routeId, routeResult);
  }

  /**
   * Retrieve a stored route by identifier
   */
  getStoredRoute(routeId: string): RouteResult | undefined {
    return this.activeRoutes.get(routeId);
  }

  /**
   * Get all stored routes
   */
  getAllStoredRoutes(): Map<string, RouteResult> {
    return new Map(this.activeRoutes);
  }

  /**
   * Clear a stored route
   */
  clearStoredRoute(routeId: string): void {
    this.activeRoutes.delete(routeId);
  }

  /**
   * Clear all stored routes
   */
  clearAllStoredRoutes(): void {
    this.activeRoutes.clear();
    this.activeMultiWaypointRoutes.clear();
    this.currentRoute$.next(null);
    this.currentMultiWaypointRoute$.next(null);
  }

  /**
   * Store a multi-waypoint route with a custom identifier
   */
  storeMultiWaypointRoute(routeId: string, multiWaypointRoute: MultiWaypointRoute): void {
    this.activeMultiWaypointRoutes.set(routeId, multiWaypointRoute);
  }

  /**
   * Retrieve a stored multi-waypoint route by identifier
   */
  getStoredMultiWaypointRoute(routeId: string): MultiWaypointRoute | undefined {
    return this.activeMultiWaypointRoutes.get(routeId);
  }

  /**
   * Get all stored multi-waypoint routes
   */
  getAllStoredMultiWaypointRoutes(): Map<string, MultiWaypointRoute> {
    return new Map(this.activeMultiWaypointRoutes);
  }

  /**
   * Clear a stored multi-waypoint route
   */
  clearStoredMultiWaypointRoute(routeId: string): void {
    this.activeMultiWaypointRoutes.delete(routeId);
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
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLon = this.toRadians(coord2.lon - coord1.lon);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) *
        Math.cos(this.toRadians(coord2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
