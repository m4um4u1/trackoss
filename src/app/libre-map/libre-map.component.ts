import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, AfterViewInit, OnDestroy } from '@angular/core';
import { Map as MapLibreMap, Marker, LngLatBounds } from 'maplibre-gl';
import { MapService } from '../services/map.service';
import { RouteService } from '../services/route.service';
import {
  MapComponent,
  ControlComponent,
  GeolocateControlDirective,
  NavigationControlDirective,
  ScaleControlDirective,
} from '@maplibre/ngx-maplibre-gl';
import { Coordinates } from '../models/coordinates';
import { RouteResult, RouteOptions, RoutePoint, MultiWaypointRoute } from '../models/route';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-libre-map',
  templateUrl: './libre-map.component.html',
  styleUrls: ['./libre-map.component.scss'],
  standalone: true,
  imports: [
    MapComponent,
    ControlComponent,
    GeolocateControlDirective,
    NavigationControlDirective,
    ScaleControlDirective,
  ],
})
export class LibreMapComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  public map?: MapLibreMap;
  public mapStyleUrl: string = ''; // Declare and initialize the mapStyleUrl property
  startPosition: [number, number] = [13.404954, 52.520008];

  @Input() startPoint?: Coordinates;
  @Input() endPoint?: Coordinates;
  @Input() waypoints?: RoutePoint[];
  @Input() routeOptions?: RouteOptions;
  @Input() showRoute: boolean = true;
  @Input() enableWaypointMode: boolean = false;

  @Output() waypointsChanged = new EventEmitter<RoutePoint[]>();
  @Output() waypointAdded = new EventEmitter<RoutePoint>();

  private startMarker?: Marker;
  private endMarker?: Marker;
  private waypointMarkers: Marker[] = [];
  private routeSubscription?: Subscription;
  private multiWaypointRouteSubscription?: Subscription;

  constructor(
    private mapService: MapService,
    private routeService: RouteService,
  ) {}

  ngOnInit(): void {
    this.loadMapTiles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map) {
      this.updateMarkersAndBounds(changes);
    }
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.multiWaypointRouteSubscription) {
      this.multiWaypointRouteSubscription.unsubscribe();
    }
    this.clearAllMarkers();
  }

  private loadMapTiles(): void {
    this.mapService.getMapTiles('outdoor').subscribe((style: string) => {
      // Explicitly define the type of the style parameter
      this.mapStyleUrl = style; // Assign the fetched style URL to mapStyleUrl
    });
  }

  private initializeMap(): void {
    // Map initialization is handled by the mgl-map component
    // We just need to wait for the mapLoad event
  }

  public onMapLoad(mapInstance: MapLibreMap): void {
    this.map = mapInstance;
    this.updateMarkersAndBounds();
    this.setupMapClickHandler();
  }

  private updateMarkersAndBounds(changes?: SimpleChanges): void {
    if (!this.map) return;

    let needsViewUpdate = false;

    // Handle waypoint mode being turned off - clear markers regardless of current state
    if (changes && changes['enableWaypointMode'] && !this.enableWaypointMode) {
      this.clearWaypointMarkers();
      // Also clear multi-waypoint routes when waypoint mode is disabled
      if (this.map && this.map.getSource('multi-route')) {
        this.routeService.removeRouteFromMap(this.map, 'multi-route', 'multi-route');
      }
      needsViewUpdate = true;
    }

    // Handle waypoints mode
    if (this.enableWaypointMode && ((changes && (changes['waypoints'] || changes['enableWaypointMode'])) || (!changes && this.waypoints))) {
      this.clearWaypointMarkers();
      if (this.waypoints && this.waypoints.length > 0) {
        this.waypoints.forEach((waypoint, index) => {
          const color = this.getWaypointColor(waypoint.type, index);
          const marker = new Marker({ color })
            .setLngLat([waypoint.coordinates.lon, waypoint.coordinates.lat])
            .addTo(this.map!);
          this.waypointMarkers.push(marker);
        });
        needsViewUpdate = true;
      } else {
        // Waypoints were cleared, need to update view to remove routes
        needsViewUpdate = true;
      }
    } else {
      // Handle traditional start/end point mode
      if ((changes && changes['startPoint']) || (!changes && this.startPoint)) {
        if (this.startMarker) {
          this.startMarker.remove();
          this.startMarker = undefined;
        }
        if (this.startPoint) {
          this.startMarker = new Marker({ color: '#00FF00' })
            .setLngLat([this.startPoint.lon, this.startPoint.lat])
            .addTo(this.map);
        }
        needsViewUpdate = true; // Always update when startPoint changes (including when cleared)
      }

      if ((changes && changes['endPoint']) || (!changes && this.endPoint)) {
        if (this.endMarker) {
          this.endMarker.remove();
          this.endMarker = undefined;
        }
        if (this.endPoint) {
          this.endMarker = new Marker({ color: '#FF0000' })
            .setLngLat([this.endPoint.lon, this.endPoint.lat])
            .addTo(this.map);
        }
        needsViewUpdate = true; // Always update when endPoint changes (including when cleared)
      }
    }

    if (needsViewUpdate) {
      if (this.enableWaypointMode && this.waypoints && this.waypoints.length > 0) {
        // Handle waypoints mode with waypoints
        const bounds = new LngLatBounds();
        this.waypoints.forEach(waypoint => {
          bounds.extend([waypoint.coordinates.lon, waypoint.coordinates.lat]);
        });
        this.map.fitBounds(bounds, { padding: 60, maxZoom: 15 });

        // Calculate and display multi-waypoint route if enabled
        if (this.showRoute && this.waypoints.length >= 2) {
          this.calculateAndDisplayMultiWaypointRoute();
        }
      } else if (this.enableWaypointMode && (!this.waypoints || this.waypoints.length === 0)) {
        // Handle waypoints mode with no waypoints (cleared)
        // Only clear routes, don't reset map position
        if (this.map.getSource('multi-route')) {
          this.routeService.removeRouteFromMap(this.map, 'multi-route', 'multi-route');
        }
      } else if (this.startPoint && this.endPoint) {
        // Handle traditional start/end point mode
        const bounds = new LngLatBounds();
        bounds.extend([this.startPoint.lon, this.startPoint.lat]);
        bounds.extend([this.endPoint.lon, this.endPoint.lat]);
        this.map.fitBounds(bounds, { padding: 60, maxZoom: 15 });

        // Calculate and display route if enabled
        if (this.showRoute) {
          this.calculateAndDisplayRoute();
        }
      } else if (this.startPoint) {
        this.map.setCenter([this.startPoint.lon, this.startPoint.lat]);
        this.map.setZoom(12);
      } else if (this.endPoint) {
        this.map.setCenter([this.endPoint.lon, this.endPoint.lat]);
        this.map.setZoom(12);
      } else if (!this.enableWaypointMode && (!this.startPoint && !this.endPoint)) {
        // Handle traditional route mode with no points (cleared)
        // Only clear routes, don't reset map position
        if (this.map.getSource('route')) {
          this.routeService.removeRouteFromMap(this.map);
        }
        if (this.map.getSource('multi-route')) {
          this.routeService.removeRouteFromMap(this.map, 'multi-route', 'multi-route');
        }
      } else {
        // Fallback: reset map position only when no specific mode is active
        this.map.setCenter(this.startPosition);
        this.map.setZoom(10);
        // Clear routes if no points are set
        if (this.map.getSource('route')) {
          this.routeService.removeRouteFromMap(this.map);
        }
        if (this.map.getSource('multi-route')) {
          this.routeService.removeRouteFromMap(this.map, 'multi-route', 'multi-route');
        }
      }
    }
  }

  private calculateAndDisplayRoute(): void {
    if (!this.map || !this.startPoint || !this.endPoint) return;

    // Unsubscribe from previous route calculation if any
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }

    this.routeSubscription = this.routeService
      .calculateRoute(this.startPoint, this.endPoint, this.routeOptions)
      .subscribe({
        next: (routeResult: RouteResult) => {
          if (this.map) {
            this.routeService.updateRouteOnMap(this.map, routeResult);
          }
        },
        error: (error) => {
          console.error('Error calculating route:', error);
        },
      });
  }

  /**
   * Public method to manually trigger route calculation
   */
  public calculateRoute(): void {
    if (this.enableWaypointMode && this.waypoints && this.waypoints.length >= 2) {
      this.calculateAndDisplayMultiWaypointRoute();
    } else {
      this.calculateAndDisplayRoute();
    }
  }

  /**
   * Public method to clear the route from the map
   */
  public clearRoute(): void {
    if (this.map) {
      this.routeService.removeRouteFromMap(this.map);
    }
  }

  /**
   * Public method to get the current route result
   */
  public getCurrentRoute(): RouteResult | null {
    let currentRoute: RouteResult | null = null;
    this.routeService
      .getCurrentRoute()
      .subscribe((route) => {
        currentRoute = route;
      })
      .unsubscribe();
    return currentRoute;
  }

  /**
   * Calculate and display multi-waypoint route
   */
  private calculateAndDisplayMultiWaypointRoute(): void {
    if (!this.map || !this.waypoints || this.waypoints.length < 2) return;

    // Unsubscribe from previous route calculation if any
    if (this.multiWaypointRouteSubscription) {
      this.multiWaypointRouteSubscription.unsubscribe();
    }

    this.multiWaypointRouteSubscription = this.routeService
      .calculateMultiWaypointRoute(this.waypoints, this.routeOptions)
      .subscribe({
        next: (multiWaypointRoute: MultiWaypointRoute) => {
          if (this.map) {
            this.routeService.updateMultiWaypointRouteOnMap(this.map, multiWaypointRoute);
          }
        },
        error: (error) => {
          console.error('Error calculating multi-waypoint route:', error);
        },
      });
  }

  /**
   * Setup map click handler for waypoint mode
   */
  private setupMapClickHandler(): void {
    if (!this.map) return;

    this.map.on('click', (e) => {
      if (this.enableWaypointMode) {
        this.addWaypointAtLocation(e.lngLat.lng, e.lngLat.lat);
      }
    });
  }

  /**
   * Add a waypoint at the specified location
   */
  private addWaypointAtLocation(lon: number, lat: number): void {
    if (!this.waypoints) {
      this.waypoints = [];
    }

    const newWaypoint: RoutePoint = {
      coordinates: { lat, lon },
      type: this.waypoints.length === 0 ? 'start' : 'waypoint',
      id: `waypoint-${Date.now()}`,
      order: this.waypoints.length,
    };

    // If this is the second waypoint, make it the end point
    if (this.waypoints.length === 1) {
      newWaypoint.type = 'end';
    } else if (this.waypoints.length > 1) {
      // Update the previous end point to be a waypoint
      const lastWaypoint = this.waypoints[this.waypoints.length - 1];
      if (lastWaypoint.type === 'end') {
        lastWaypoint.type = 'waypoint';
      }
      newWaypoint.type = 'end';
    }

    this.waypoints.push(newWaypoint);
    this.waypointsChanged.emit([...this.waypoints]);
    this.updateMarkersAndBounds();
  }

  /**
   * Get color for waypoint marker based on type and index
   */
  private getWaypointColor(type: string, index: number): string {
    switch (type) {
      case 'start':
        return '#00FF00'; // Green
      case 'end':
        return '#FF0000'; // Red
      case 'waypoint':
        return '#FFA500'; // Orange
      default:
        return '#0000FF'; // Blue
    }
  }

  /**
   * Clear all waypoint markers
   */
  private clearWaypointMarkers(): void {
    this.waypointMarkers.forEach(marker => marker.remove());
    this.waypointMarkers = [];
  }

  /**
   * Clear all markers (traditional and waypoint)
   */
  private clearAllMarkers(): void {
    if (this.startMarker) {
      this.startMarker.remove();
      this.startMarker = undefined;
    }
    if (this.endMarker) {
      this.endMarker.remove();
      this.endMarker = undefined;
    }
    this.clearWaypointMarkers();
  }

  /**
   * Public method to clear all waypoints
   */
  public clearWaypoints(): void {
    this.waypoints = [];
    this.clearWaypointMarkers();
    if (this.map && this.map.getSource('multi-route')) {
      this.routeService.removeRouteFromMap(this.map, 'multi-route', 'multi-route');
    }
  }



  /**
   * Public method to remove a specific waypoint
   */
  public removeWaypoint(waypointId: string): void {
    if (!this.waypoints) return;

    this.waypoints = this.waypoints.filter(wp => wp.id !== waypointId);

    // Reassign types and orders
    this.waypoints.forEach((wp, index) => {
      wp.order = index;
      if (index === 0) {
        wp.type = 'start';
      } else if (index === this.waypoints!.length - 1) {
        wp.type = 'end';
      } else {
        wp.type = 'waypoint';
      }
    });

    this.updateMarkersAndBounds();
  }
}
