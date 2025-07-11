import { Component, ViewChild } from '@angular/core';
import { LibreMapComponent } from '../../libre-map/libre-map.component';
import { MapSidepanelComponent } from '../../map-sidepanel/map-sidepanel.component';
import { Coordinates } from '../../models/coordinates';
import { RoutePoint } from '../../models/route';

@Component({
  selector: 'app-map-page',
  imports: [LibreMapComponent, MapSidepanelComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  standalone: true,
})
export class MapPageComponent {
  public currentStartPoint?: Coordinates;
  public currentEndPoint?: Coordinates;
  public currentWaypoints: RoutePoint[] = [];
  public enableWaypointMode: boolean = false;

  constructor() {}

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
    } else {
      // Clear waypoints when switching to traditional mode
      this.currentWaypoints = [];
    }
  }
}
