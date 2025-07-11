import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouteCalculatorComponent } from '../components/route-calculator/route-calculator.component';
import { RouteDisplayComponent } from '../components/route-display/route-display.component';
import { WaypointManagerComponent } from '../components/waypoint-manager/waypoint-manager.component';
import { Coordinates } from '../models/coordinates';
import { RouteResult, RoutePoint, MultiWaypointRoute } from '../models/route';
import { RouteService } from '../services/route.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map-sidepanel',
  imports: [CommonModule, RouteCalculatorComponent, RouteDisplayComponent, WaypointManagerComponent],
  templateUrl: './map-sidepanel.component.html',
  standalone: true,
  styleUrls: ['./map-sidepanel.component.scss'],
})
export class MapSidepanelComponent implements OnInit, OnDestroy {
  @Input() waypoints: RoutePoint[] = [];
  @Input() enableWaypointMode: boolean = false;

  @Output() routePointsReady = new EventEmitter<{ start?: Coordinates; end?: Coordinates }>();
  @Output() routeCalculated = new EventEmitter<RouteResult>();
  @Output() waypointsChanged = new EventEmitter<RoutePoint[]>();
  @Output() waypointModeToggled = new EventEmitter<boolean>();
  @Output() multiWaypointRouteCalculated = new EventEmitter<MultiWaypointRoute>();

  currentMultiWaypointRoute: MultiWaypointRoute | null = null;
  private multiWaypointRouteSubscription?: Subscription;

  constructor(private routeService: RouteService) {}

  ngOnInit(): void {
    // Subscribe to multi-waypoint route updates
    this.multiWaypointRouteSubscription = this.routeService.getCurrentMultiWaypointRoute().subscribe(
      route => {
        this.currentMultiWaypointRoute = route;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.multiWaypointRouteSubscription) {
      this.multiWaypointRouteSubscription.unsubscribe();
    }
  }

  onCoordinatesReady(coordinates: { start?: Coordinates; end?: Coordinates }): void {
    this.routePointsReady.emit(coordinates);
  }

  onRouteCalculated(routeResult: RouteResult): void {
    this.routeCalculated.emit(routeResult);
  }

  onRouteCleared(): void {
    this.routePointsReady.emit({ start: undefined, end: undefined });
  }

  onRouteError(error: string): void {
    console.error('Route calculation error:', error);
  }

  onWaypointsChanged(waypoints: RoutePoint[]): void {
    this.waypointsChanged.emit(waypoints);
  }

  onWaypointModeToggled(enabled: boolean): void {
    this.waypointModeToggled.emit(enabled);

    if (!enabled) {
      this.waypointsChanged.emit([]);
    }
  }

  onWaypointRouteCalculated(): void {
    // This will be handled by the parent component
    // which will trigger the actual route calculation
    console.log('Waypoint route calculation requested');
  }

  onWaypointRouteCleared(): void {
    // Clear waypoints when clear button is pressed in waypoint mode
    this.waypointsChanged.emit([]);
    // Also ensure the route service clears multi-waypoint route data
    this.routeService.clearAllStoredRoutes();
  }

  onWaypointsCleared(): void {
    // Clear waypoints and route data when Clear All button is pressed
    this.waypointsChanged.emit([]);
    // Also ensure the route service clears multi-waypoint route data
    this.routeService.clearAllStoredRoutes();
  }
}
