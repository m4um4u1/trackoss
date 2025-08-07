import { Component, effect, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { LibreMapComponent } from '../../components/libre-map/libre-map.component';
import { SidepanelComponent } from '../../components/map-sidepanel/sidepanel.component';
import { MobileTouchScrollDirective } from '../../directives/mobile-touch-scroll.directive';
import { Coordinates } from '../../models/coordinates';
import { RoutePoint } from '../../models/route';
import { RouteService } from '../../services/route.service';
import { BackendApiService } from '../../services/backend-api.service';
import { ResponsiveService } from '../../services/responsive.service';
import { LayoutStateService } from '../../services/layout-state.service';
import { RouteResponse } from '../../models/backend-api';

@Component({
  selector: 'app-map-page',
  imports: [LibreMapComponent, SidepanelComponent, MobileTouchScrollDirective],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  standalone: true,
})
export class MapPageComponent implements OnInit, OnDestroy {
  @ViewChild(LibreMapComponent) mapComponent?: LibreMapComponent;

  // Route data
  public currentStartPoint?: Coordinates;
  public currentEndPoint?: Coordinates;
  public currentWaypoints: RoutePoint[] = [];

  constructor(
    private routeService: RouteService,
    private route: ActivatedRoute,
    private backendApiService: BackendApiService,
    private responsiveService: ResponsiveService,
    private layoutStateService: LayoutStateService,
  ) {
    this.setupEffects();
  }

  // Expose services for template
  get responsive() {
    return this.responsiveService;
  }

  get layout() {
    return this.layoutStateService;
  }

  ngOnInit(): void {
    this.loadRouteFromQueryParams();
  }

  private loadRouteFromQueryParams(): void {
    // Get routeId from query parameters
    const routeId = this.route.snapshot.queryParamMap.get('routeId');
    if (routeId) {
      // Load route from backend and reconstruct with Valhalla for map display
      this.backendApiService.getRoute(routeId).subscribe({
        next: (routeResponse) => {
          this.loadAndDisplayRoute(routeResponse);
        },
        error: (error) => {
          console.error('Error loading route:', error);
        },
      });
    }
  }

  private loadAndDisplayRoute(routeResponse: RouteResponse): void {
    // Use the simplified route loading method
    this.routeService.loadSavedRoute(routeResponse).subscribe({
      next: (multiWaypointRoute) => {
        // Set the reconstructed route for display
        this.routeService['_currentMultiWaypointRoute'].set(multiWaypointRoute);
        this.currentWaypoints = multiWaypointRoute.waypoints;
      },
      error: (error) => {
        console.error('Error reconstructing route:', error);
        // Fallback: just show the waypoints without the route line
        this.showWaypointsOnly(routeResponse);
      },
    });
  }

  private showWaypointsOnly(routeResponse: RouteResponse): void {
    // Extract and display just the user waypoints
    this.currentWaypoints = routeResponse.points
      .filter((point) => point.pointType !== 'TRACK_POINT')
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map((point) => ({
        coordinates: { lat: point.latitude, lon: point.longitude },
        type: point.pointType === 'START_POINT' ? 'start' : point.pointType === 'END_POINT' ? 'end' : 'waypoint',
        id: point.id,
        name: point.name || `Waypoint ${point.sequenceOrder + 1}`,
        order: point.sequenceOrder,
      }));
  }

  ngOnDestroy(): void {
    // Restore body scroll on component destroy
    this.layoutStateService.updateBodyScrollLock();
  }

  public toggleSidepanel(): void {
    this.layoutStateService.toggleSidepanel();
    this.resizeMapAfterToggle();
  }

  public onBackdropClick(): void {
    // Only close on backdrop click for mobile
    if (this.responsive.isMobile()) {
      this.layoutStateService.closeSidepanel();
    }
  }

  private setupEffects(): void {
    // Effect to handle body scroll lock when sidepanel state changes
    effect(() => {
      this.layout.isSidepanelOpen(); // Subscribe to changes
      this.layoutStateService.updateBodyScrollLock();
    });

    // Effect to resize map when layout changes
    effect(() => {
      this.layout.isSidepanelOpen(); // Subscribe to changes
      this.responsive.state(); // Subscribe to responsive changes

      // Use setTimeout to ensure DOM updates are complete
      setTimeout(() => {
        this.resizeMapAfterToggle();
      }, 300);
    });
  }

  private resizeMapAfterToggle(): void {
    if (this.mapComponent) {
      this.mapComponent.resizeMap();
    }
  }

  public onRoutePointsUpdated(points: { start?: Coordinates; end?: Coordinates }): void {
    this.currentStartPoint = points.start;
    this.currentEndPoint = points.end;
  }

  public onWaypointsChanged(waypoints: RoutePoint[]): void {
    this.currentWaypoints = waypoints;

    // Clear route line when fewer than 2 waypoints remain
    if (waypoints.length < 2) {
      this.routeService.clearMultiWaypointRoute();
    }
  }

  public onStartPointChanged(startPoint: Coordinates): void {
    this.currentStartPoint = startPoint;
  }

  public onEndPointChanged(endPoint: Coordinates): void {
    this.currentEndPoint = endPoint;
  }
}
