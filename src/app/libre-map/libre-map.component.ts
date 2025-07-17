import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { LngLatBounds, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { MapService } from '../services/map.service';
import { RouteService } from '../services/route.service';
import { GeolocationService } from '../services/geolocation.service';
import {
  ControlComponent,
  GeolocateControlDirective,
  MapComponent,
  NavigationControlDirective,
  ScaleControlDirective,
} from '@maplibre/ngx-maplibre-gl';
import { Coordinates } from '../models/coordinates';
import { MultiWaypointRoute, RouteOptions, RoutePoint, RouteResult } from '../models/route';
import { combineLatest, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibreMapComponent implements OnInit, OnChanges, OnDestroy {
  // Modern Angular 20 dependency injection
  private readonly mapService = inject(MapService);
  private readonly routeService = inject(RouteService);
  private readonly geolocationService = inject(GeolocationService);

  // Signal-based state management
  private readonly _map = signal<MapLibreMap | undefined>(undefined);
  private readonly _mapStyleUrl = signal('');
  private readonly _startPosition = signal<[number, number]>([13.404954, 52.520008]);

  // Public readonly signals
  readonly map = this._map.asReadonly();
  readonly mapStyleUrl = this._mapStyleUrl.asReadonly();
  readonly startPosition = this._startPosition.asReadonly();

  // Input properties (keeping as @Input for parent communication)
  @Input() startPoint?: Coordinates;
  @Input() endPoint?: Coordinates;
  @Input() waypoints?: RoutePoint[];
  @Input() routeOptions?: RouteOptions;
  @Input() showRoute: boolean = true;

  // Output events
  @Output() waypointsChanged = new EventEmitter<RoutePoint[]>();
  @Output() waypointAdded = new EventEmitter<RoutePoint>();
  @Output() startPointChanged = new EventEmitter<Coordinates>();
  @Output() endPointChanged = new EventEmitter<Coordinates>();

  // Computed signals for derived state
  readonly hasStartPoint = computed(() => !!this.startPoint);
  readonly hasEndPoint = computed(() => !!this.endPoint);
  readonly hasWaypoints = computed(() => !!this.waypoints && this.waypoints.length > 0);
  readonly hasRoute = computed(() => (this.hasStartPoint() && this.hasEndPoint()) || this.hasWaypoints());
  readonly isMapReady = computed(() => !!this._map());

  // Private state
  private startMarker?: Marker;
  private endMarker?: Marker;
  private waypointMarkers: Marker[] = [];
  private routeSubscription?: Subscription;
  private multiWaypointRouteSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadMapTiles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.multiWaypointRouteSubscription) {
      this.multiWaypointRouteSubscription.unsubscribe();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map) {
      this.updateMarkersAndBounds(changes);
    }
  }

  private loadMapTiles(): void {
    this.mapService.getMapTiles('outdoor').subscribe({
      next: (style) => {
        this._mapStyleUrl.set(style);
      },
      error: (error) => {
        console.error('Error loading map tiles:', error);
      },
    });
  }

  private setupRouteSubscriptions(): void {
    if (!this._map()) return;

    // Subscribe to route updates
    combineLatest([this.routeService.getCurrentRoute(), this.routeService.getCurrentMultiWaypointRoute()])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([routeResult, multiWaypointRoute]) => {
        this.handleRouteUpdates(routeResult, multiWaypointRoute);
      });
  }

  /**
   * Handle route updates for unified routing
   */
  private handleRouteUpdates(routeResult: RouteResult | null, multiWaypointRoute: MultiWaypointRoute | null): void {
    if (!this._map()) return;

    // Prioritize multi-waypoint route if waypoints exist
    if (this.waypoints && this.waypoints.length >= 2) {
      if (multiWaypointRoute) {
        this.routeService.updateMultiWaypointRouteOnMap(this._map(), multiWaypointRoute);
      } else {
        this.routeService.removeRouteFromMap(this._map(), 'multi-route', 'multi-route');
      }
      // Clear simple route when using waypoints
      this.routeService.removeRouteFromMap(this._map(), 'route', 'route');
    } else {
      // Use simple routing for start/end points only
      if (routeResult) {
        this.routeService.updateRouteOnMap(this._map(), routeResult);
      } else {
        this.routeService.removeRouteFromMap(this._map(), 'route', 'route');
      }
      // Clear waypoint route when using simple routing
      this.routeService.removeRouteFromMap(this._map(), 'multi-route', 'multi-route');
    }
  }

  public onMapLoad(mapInstance: MapLibreMap): void {
    this._map.set(mapInstance);
    this.updateMarkersAndBounds();
    this.setupMapClickHandler();
    this.setupRouteSubscriptions();
    this.focusOnUserLocationIfNeeded();
  }

  public resizeMap(): void {
    const mapInstance = this._map();
    if (mapInstance) {
      setTimeout(() => {
        const currentMap = this._map();
        if (currentMap) {
          currentMap.resize();
        }
      }, 100);
    }
  }

  private updateMarkersAndBounds(changes?: SimpleChanges): void {
    const mapInstance = this._map();
    if (!mapInstance) return;

    let needsViewUpdate = false;

    // Handle waypoints changes
    if ((changes && changes['waypoints']) || (!changes && this.waypoints)) {
      this.clearWaypointMarkers();
      if (this.waypoints && this.waypoints.length > 0) {
        this.waypoints.forEach((waypoint) => {
          const color = this.getWaypointColor(waypoint.type);
          const marker = new Marker({ color })
            .setLngLat([waypoint.coordinates.lon, waypoint.coordinates.lat])
            .addTo(mapInstance);
          this.waypointMarkers.push(marker);
        });
        needsViewUpdate = true;
      } else {
        needsViewUpdate = true;
      }
    }

    // Handle start/end point changes
    if (changes && (changes['startPoint'] || changes['endPoint'])) {
      needsViewUpdate = true;
    }

    // Update the view if needed
    if (needsViewUpdate) {
      if (this.waypoints && this.waypoints.length > 0) {
        // Handle waypoint routing
        this.updateMapViewForWaypoints();

        // Calculate and display multi-waypoint route if we have at least 2 waypoints
        if (this.waypoints.length >= 2) {
          this.calculateAndDisplayMultiWaypointRoute();
        }
      } else if (this.startPoint && this.endPoint) {
        // Handle simple start/end point routing
        this.clearStartEndMarkers();

        // Create start marker (green)
        this.startMarker = new Marker({ color: '#22c55e' })
          .setLngLat([this.startPoint.lon, this.startPoint.lat])
          .addTo(mapInstance);

        // Create end marker (red)
        this.endMarker = new Marker({ color: '#ef4444' })
          .setLngLat([this.endPoint.lon, this.endPoint.lat])
          .addTo(mapInstance);

        const bounds = new LngLatBounds();
        bounds.extend([this.startPoint.lon, this.startPoint.lat]);
        bounds.extend([this.endPoint.lon, this.endPoint.lat]);
        mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 15 });

        // Calculate and display route if enabled
        if (this.showRoute) {
          this.calculateAndDisplayRoute();
        }
      } else if (this.startPoint) {
        // Handle single start point
        this.clearStartEndMarkers();
        this.startMarker = new Marker({ color: '#22c55e' })
          .setLngLat([this.startPoint.lon, this.startPoint.lat])
          .addTo(mapInstance);
        mapInstance.setCenter([this.startPoint.lon, this.startPoint.lat]);
        mapInstance.setZoom(12);
      } else if (this.endPoint) {
        // Handle single end point
        this.clearStartEndMarkers();
        this.endMarker = new Marker({ color: '#ef4444' })
          .setLngLat([this.endPoint.lon, this.endPoint.lat])
          .addTo(mapInstance);
        mapInstance.setCenter([this.endPoint.lon, this.endPoint.lat]);
        mapInstance.setZoom(12);
      } else {
        // Handle cleared state - no points or waypoints
        this.clearStartEndMarkers();
        this.clearWaypointMarkers();
        if (mapInstance.getSource('route')) {
          this.routeService.removeRouteFromMap(mapInstance);
        }
        if (mapInstance.getSource('multi-route')) {
          this.routeService.removeRouteFromMap(mapInstance, 'multi-route', 'multi-route');
        }
      }
    }
  }

  private calculateAndDisplayRoute(): void {
    const mapInstance = this._map();
    if (!mapInstance || !this.startPoint || !this.endPoint) return;

    // Unsubscribe from previous route calculation if any
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }

    this.routeSubscription = this.routeService
      .calculateRoute(this.startPoint, this.endPoint, this.routeOptions)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (routeResult: RouteResult) => {
          // Route will be automatically displayed via setupRouteSubscriptions
        },
        error: (error) => {
          console.error('Error calculating route:', error);
        },
      });
  }

  /**
   * Update map view to show all waypoints with proper bounds checking
   */
  private updateMapViewForWaypoints(): void {
    const mapInstance = this._map();
    if (!mapInstance || !this.waypoints || this.waypoints.length === 0) return;

    try {
      if (this.waypoints.length === 1) {
        // Single waypoint - center on it
        const waypoint = this.waypoints[0];
        mapInstance.setCenter([waypoint.coordinates.lon, waypoint.coordinates.lat]);
        mapInstance.setZoom(14);
      } else {
        // Multiple waypoints - fit bounds to show all
        const bounds = new LngLatBounds();
        this.waypoints.forEach((waypoint) => {
          bounds.extend([waypoint.coordinates.lon, waypoint.coordinates.lat]);
        });

        // Check if bounds are valid before fitting
        if (bounds.getNorthEast() && bounds.getSouthWest()) {
          // Fit bounds with padding and max zoom
          mapInstance.fitBounds(bounds, {
            padding: 60,
            maxZoom: 15,
          });
        } else {
          // Fallback: center on first waypoint
          const firstWaypoint = this.waypoints![0];
          mapInstance.setCenter([firstWaypoint.coordinates.lon, firstWaypoint.coordinates.lat]);
          mapInstance.setZoom(12);
        }
      }
    } catch (error) {
      console.error('Error updating map view for waypoints:', error);
      // Fallback: center on first waypoint
      if (this.waypoints.length > 0) {
        const firstWaypoint = this.waypoints[0];
        mapInstance.setCenter([firstWaypoint.coordinates.lon, firstWaypoint.coordinates.lat]);
        mapInstance.setZoom(12);
      }
    }
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

    // Add a small delay to ensure map view has been updated
    setTimeout(() => {
      if (!this.map || !this.waypoints || this.waypoints.length < 2) return;

      this.multiWaypointRouteSubscription = this.routeService
        .calculateMultiWaypointRoute(this.waypoints, this.routeOptions)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (multiWaypointRoute: MultiWaypointRoute) => {
            // Route will be automatically displayed via setupRouteSubscriptions
          },
          error: (error) => {
            console.error('Error calculating multi-waypoint route:', error);
          },
        });
    }, 100);
  }

  /**
   * Setup map click handler for unified routing
   */
  private setupMapClickHandler(): void {
    const mapInstance = this._map();
    if (!mapInstance) return;

    mapInstance.on('click', (e) => {
      this.handleMapClick(e.lngLat.lng, e.lngLat.lat);
    });
  }

  /**
   * Handle map click for unified routing (start/end points and waypoints)
   */
  private handleMapClick(lon: number, lat: number): void {
    const coordinates: Coordinates = { lat, lon };

    // If we have waypoints, add to waypoints list
    if (this.waypoints && this.waypoints.length > 0) {
      this.addWaypointAtLocation(lon, lat);
      return;
    }

    // If no start point, set as start
    if (!this.startPoint) {
      this.startPointChanged.emit(coordinates);
      return;
    }

    // If start point exists but no end point, set as end
    if (!this.endPoint) {
      this.endPointChanged.emit(coordinates);
      return;
    }

    // If both start and end exist, convert to waypoint mode and add the new point
    this.convertTraditionalRouteToWaypoints(lon, lat);
  }

  /**
   * Convert traditional route (start/end points) to waypoint mode and add new waypoint
   */
  private convertTraditionalRouteToWaypoints(lon: number, lat: number): void {
    if (!this.startPoint || !this.endPoint) {
      return;
    }

    // Create waypoints array from existing start/end points
    const waypoints: RoutePoint[] = [
      {
        coordinates: this.startPoint,
        type: 'start',
        id: `waypoint-${Date.now()}-start`,
        order: 0,
      },
      {
        coordinates: this.endPoint,
        type: 'waypoint',
        id: `waypoint-${Date.now()}-middle`,
        order: 1,
      },
      {
        coordinates: { lat, lon },
        type: 'end',
        id: `waypoint-${Date.now()}-end`,
        order: 2,
      },
    ];

    // Clear traditional route points
    this.startPointChanged.emit(undefined as any);
    this.endPointChanged.emit(undefined as any);

    // Set waypoints and emit change
    this.waypoints = waypoints;
    this.waypointsChanged.emit([...waypoints]);

    // Use setTimeout to avoid conflicts with rapid clicks
    setTimeout(() => {
      this.updateMarkersAndBounds();
    }, 10);
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

    // Use setTimeout to avoid conflicts with rapid clicks
    setTimeout(() => {
      this.updateMarkersAndBounds();
    }, 10);
  }

  /**
   * Get color for waypoint marker based on type and index
   */
  private getWaypointColor(type: string): string {
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
    if (this.waypointMarkers) {
      this.waypointMarkers.forEach((marker) => marker?.remove?.());
      this.waypointMarkers = [];
    }
  }

  /**
   * Clear start and end markers only
   */
  private clearStartEndMarkers(): void {
    if (this.startMarker) {
      this.startMarker.remove();
      this.startMarker = undefined;
    }
    if (this.endMarker) {
      this.endMarker.remove();
      this.endMarker = undefined;
    }
  }

  /**
   * Clear all markers (traditional and waypoint)
   */
  private clearAllMarkers(): void {
    if (this.startMarker) {
      this.startMarker.remove?.();
      this.startMarker = undefined;
    }
    if (this.endMarker) {
      this.endMarker.remove?.();
      this.endMarker = undefined;
    }
    this.clearWaypointMarkers();
  }

  /**
   * Focus the map on user location if no specific points are set
   * Requests user consent first and only zooms if consent is granted
   */
  private focusOnUserLocationIfNeeded(): void {
    if (!this.map) return;

    // Only focus on user location if no specific points are already set
    const hasPoints = this.startPoint || this.endPoint || (this.waypoints && this.waypoints.length > 0);

    if (!hasPoints) {
      this.geolocationService.requestLocationWithConsent().subscribe({
        next: (userLocation: Coordinates) => {
          const mapInstance = this._map();
          if (mapInstance) {
            // Use flyTo for smooth animation to user location
            mapInstance.flyTo({
              center: [userLocation.lon, userLocation.lat],
              zoom: 14,
              duration: 2000, // 2 second animation
            });
          }
        },
        // Note: If consent is denied or location unavailable, the observable completes
        // without emitting, so the map stays at the default location
      });
    }
  }

  /**
   * Request user location with browser consent and focus map on their location
   * This will trigger the browser's permission dialog
   * Call this method when user explicitly wants to use their location
   */
  public requestUserLocationConsent(): void {
    if (!this.map) return;

    this.geolocationService.requestLocationWithConsent().subscribe({
      next: (userLocation: Coordinates) => {
        const mapInstance = this._map();
        if (mapInstance) {
          // Use flyTo for smooth animation to user location
          mapInstance.flyTo({
            center: [userLocation.lon, userLocation.lat],
            zoom: 14,
            duration: 2000, // 2 second animation
          });
        }
      },
    });
  }
}
