import { Component, ViewChild } from '@angular/core';
import { LibreMapComponent } from '../../libre-map/libre-map.component';
import { MapSidepanelComponent } from '../../map-sidepanel/map-sidepanel.component';
import { Coordinates } from '../../models/coordinates';
import { RoutePoint, RouteResult, MultiWaypointRoute } from '../../models/route';
import { RouteService } from '../../services/route.service';

@Component({
  selector: 'app-map-page',
  imports: [LibreMapComponent, MapSidepanelComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  standalone: true,
})
export class MapPageComponent {
  @ViewChild(LibreMapComponent) mapComponent?: LibreMapComponent;

  public currentStartPoint?: Coordinates;
  public currentEndPoint?: Coordinates;
  public currentWaypoints: RoutePoint[] = [];
  public enableWaypointMode: boolean = false;

  constructor(private routeService: RouteService) {}

  public onRoutePointsUpdated(points: { start?: Coordinates; end?: Coordinates }): void {
    this.currentStartPoint = points.start;
    this.currentEndPoint = points.end;
  }

  public onWaypointsChanged(waypoints: RoutePoint[]): void {
    this.currentWaypoints = waypoints;
  }

  public onWaypointModeToggled(enabled: boolean): void {
    this.enableWaypointMode = enabled;

    // Clear traditional route points when switching to waypoint mode
    if (enabled) {
      this.currentStartPoint = undefined;
      this.currentEndPoint = undefined;
      // Clear any existing normal routes
      this.routeService.clearAllStoredRoutes();
    } else {
      // Clear waypoints when switching to traditional mode
      this.currentWaypoints = [];
      // Clear any existing waypoint routes
      this.routeService.clearAllStoredRoutes();
    }
  }

  public onRouteCalculated(routeResult: RouteResult): void {
    // The route service will automatically update the map through the LibreMapComponent
    // which subscribes to route changes, but we can also manually trigger map updates if needed
    console.log('Route calculated:', routeResult);
  }

  public onMultiWaypointRouteCalculated(multiWaypointRoute: MultiWaypointRoute): void {
    // The route service will automatically update the map through the LibreMapComponent
    console.log('Multi-waypoint route calculated:', multiWaypointRoute);
  }
}
