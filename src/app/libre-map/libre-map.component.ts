import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
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
})
export class LibreMapComponent implements OnInit, OnChanges, OnDestroy {
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
  private destroy$ = new Subject<void>();

  constructor(
    private mapService: MapService,
    private routeService: RouteService,
    private geolocationService: GeolocationService,
  ) {}

  ngOnInit(): void {
    this.loadMapTiles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map) {
      this.updateMarkersAndBounds(changes);
    }
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
    this.clearAllMarkers();
  }

  private loadMapTiles(): void {
    this.mapService.getMapTiles('outdoor').subscribe((style: string) => {
      // Explicitly define the type of the style parameter
      this.mapStyleUrl = style; // Assign the fetched style URL to mapStyleUrl
    });
  }

  /**
   * Setup subscriptions to route service observables to automatically display routes
   */
  private setupRouteSubscriptions(): void {
    if (!this.map) return;

    // Combine both route observables into a single subscription
    combineLatest([this.routeService.getCurrentRoute(), this.routeService.getCurrentMultiWaypointRoute()])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([routeResult, multiWaypointRoute]) => {
          this.handleRouteUpdates(routeResult, multiWaypointRoute);
        },
        error: (error) => {
          console.error('Error in route subscriptions:', error);
        },
      });
  }

  /**
   * Handle route updates based on current mode
   */
  private handleRouteUpdates(routeResult: RouteResult | null, multiWaypointRoute: MultiWaypointRoute | null): void {
    if (!this.map) return;

    if (this.enableWaypointMode) {
      // Handle waypoint mode
      if (multiWaypointRoute) {
        this.routeService.updateMultiWaypointRouteOnMap(this.map, multiWaypointRoute);
      } else {
        this.routeService.removeRouteFromMap(this.map, 'multi-route', 'multi-route');
      }
      // Clear normal route when in waypoint mode
      this.routeService.removeRouteFromMap(this.map, 'route', 'route');
    } else {
      // Handle normal routing mode
      if (routeResult) {
        this.routeService.updateRouteOnMap(this.map, routeResult);
      } else {
        this.routeService.removeRouteFromMap(this.map, 'route', 'route');
      }
      // Clear waypoint route when in normal mode
      this.routeService.removeRouteFromMap(this.map, 'multi-route', 'multi-route');
    }
  }

  public onMapLoad(mapInstance: MapLibreMap): void {
    this.map = mapInstance;
    this.updateMarkersAndBounds();
    this.setupMapClickHandler();
    this.setupRouteSubscriptions();

    // Automatically request user location consent and focus on their location
    this.focusOnUserLocationIfNeeded();
  }

  public resizeMap(): void {
    if (this.map) {
      // Use setTimeout to ensure the container has finished resizing
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
        }
      }, 100);
    }
  }

  private updateMarkersAndBounds(changes?: SimpleChanges): void {
    if (!this.map) return;

    let needsViewUpdate = false;

    // Handle waypoint mode changes
    if (changes && changes['enableWaypointMode']) {
      if (!this.enableWaypointMode) {
        // Waypoint mode turned off - clear waypoint markers and routes
        this.clearWaypointMarkers();
        if (this.map && this.map.getSource('multi-route')) {
          this.routeService.removeRouteFromMap(this.map, 'multi-route', 'multi-route');
        }
        // Recreate start/end markers if we have start/end points
        needsViewUpdate = true;
      } else {
        // Waypoint mode turned on - clear normal route markers and routes
        this.clearStartEndMarkers();
        if (this.map && this.map.getSource('route')) {
          this.routeService.removeRouteFromMap(this.map, 'route', 'route');
        }
        needsViewUpdate = true;
      }
    }

    // Handle waypoints mode
    if (
      this.enableWaypointMode &&
      ((changes && (changes['waypoints'] || changes['enableWaypointMode'])) || (!changes && this.waypoints))
    ) {
      this.clearWaypointMarkers();
      if (this.waypoints && this.waypoints.length > 0) {
        this.waypoints.forEach((waypoint) => {
          const color = this.getWaypointColor(waypoint.type);
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
    }

    // Handle start/end point changes
    if (changes && (changes['startPoint'] || changes['endPoint'])) {
      needsViewUpdate = true;
    }

    // Update the view if needed
    if (needsViewUpdate) {
      if (this.enableWaypointMode && this.waypoints && this.waypoints.length > 0) {
        // Handle waypoints mode with waypoints
        this.updateMapViewForWaypoints();

        // Calculate and display multi-waypoint route if we have at least 2 waypoints
        if (this.waypoints.length >= 2) {
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

        // Create start and end markers
        this.clearStartEndMarkers(); // Clear existing markers first

        // Create start marker (green)
        this.startMarker = new Marker({ color: '#22c55e' })
          .setLngLat([this.startPoint.lon, this.startPoint.lat])
          .addTo(this.map!);

        // Create end marker (red)
        this.endMarker = new Marker({ color: '#ef4444' })
          .setLngLat([this.endPoint.lon, this.endPoint.lat])
          .addTo(this.map!);

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
      } else if (!this.enableWaypointMode && !this.startPoint && !this.endPoint) {
        // Handle traditional route mode with no points (cleared)
        // Clear start/end markers and routes
        this.clearStartEndMarkers();
        if (this.map.getSource('route')) {
          this.routeService.removeRouteFromMap(this.map);
        }
        if (this.map.getSource('multi-route')) {
          this.routeService.removeRouteFromMap(this.map, 'multi-route', 'multi-route');
        }
      } else if (!this.enableWaypointMode && (this.startPoint || this.endPoint)) {
        // Handle case where we have start or end point (but not both) in normal routing mode
        this.clearStartEndMarkers(); // Clear existing markers first

        if (this.startPoint) {
          // Create start marker (green)
          this.startMarker = new Marker({ color: '#22c55e' })
            .setLngLat([this.startPoint.lon, this.startPoint.lat])
            .addTo(this.map!);
        }

        if (this.endPoint) {
          // Create end marker (red)
          this.endMarker = new Marker({ color: '#ef4444' })
            .setLngLat([this.endPoint.lon, this.endPoint.lat])
            .addTo(this.map!);
        }
      } else {
        // Fallback: reset map position only when no specific mode is active
        this.clearStartEndMarkers();
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
    if (!this.map || !this.waypoints || this.waypoints.length === 0) return;

    try {
      if (this.waypoints.length === 1) {
        // For single waypoint, just center on it
        const waypoint = this.waypoints[0];
        this.map.setCenter([waypoint.coordinates.lon, waypoint.coordinates.lat]);
        this.map.setZoom(14);
      } else {
        // For multiple waypoints, calculate bounds
        const bounds = new LngLatBounds();
        this.waypoints.forEach((waypoint) => {
          bounds.extend([waypoint.coordinates.lon, waypoint.coordinates.lat]);
        });

        // Check if bounds are valid (not empty)
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        if (sw && ne && sw.lng !== ne.lng && sw.lat !== ne.lat) {
          // Use requestAnimationFrame to ensure map is ready
          requestAnimationFrame(() => {
            if (this.map) {
              try {
                this.map.fitBounds(bounds, {
                  padding: 60,
                  maxZoom: 16,
                  duration: 1000, // Add smooth animation
                });
              } catch (error) {
                console.warn('Error fitting bounds, falling back to center:', error);
                // Fallback: center on first waypoint
                const firstWaypoint = this.waypoints![0];
                this.map.setCenter([firstWaypoint.coordinates.lon, firstWaypoint.coordinates.lat]);
                this.map.setZoom(12);
              }
            }
          });
        } else {
          // Bounds are too small or invalid, center on first waypoint
          const firstWaypoint = this.waypoints[0];
          this.map.setCenter([firstWaypoint.coordinates.lon, firstWaypoint.coordinates.lat]);
          this.map.setZoom(14);
        }
      }
    } catch (error) {
      console.error('Error updating map view for waypoints:', error);
      // Fallback: center on first waypoint
      if (this.waypoints.length > 0) {
        const firstWaypoint = this.waypoints[0];
        this.map.setCenter([firstWaypoint.coordinates.lon, firstWaypoint.coordinates.lat]);
        this.map.setZoom(12);
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
    this.waypointMarkers.forEach((marker) => marker.remove());
    this.waypointMarkers = [];
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
          if (this.map) {
            // Use flyTo for smooth animation to user location
            this.map.flyTo({
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
        if (this.map) {
          // Use flyTo for smooth animation to user location
          this.map.flyTo({
            center: [userLocation.lon, userLocation.lat],
            zoom: 14,
            duration: 2000, // 2 second animation
          });
        }
      },
    });
  }
}
