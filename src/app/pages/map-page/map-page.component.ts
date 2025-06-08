import { Component } from '@angular/core';
import { LibreMapComponent } from '../../libre-map/libre-map.component';
import { MapSidepanelComponent } from '../../map-sidepanel/map-sidepanel.component';
import { Coordinates } from '../../models/coordinates';

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

  constructor() {}

  public onRoutePointsUpdated(points: { start?: Coordinates; end?: Coordinates }): void {
    this.currentStartPoint = points.start;
    this.currentEndPoint = points.end;
  }
}
