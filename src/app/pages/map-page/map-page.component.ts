import { Component } from '@angular/core';
import { LibreMapComponent, Coordinates } from '../../libre-map/libre-map.component'; // Import Coordinates
import { MapSidepanelComponent } from '../../map-sidepanel/map-sidepanel.component';

@Component({
  selector: 'app-map-page',
  imports: [LibreMapComponent, MapSidepanelComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  standalone: true,
})
export class MapPageComponent {
  // Properties to hold the current start and end coordinates
  public currentStartPoint?: Coordinates;
  public currentEndPoint?: Coordinates;

  constructor() {} // Best practice to include a constructor

  // Event handler for when route points are updated from the side panel
  public onRoutePointsUpdated(points: { start?: Coordinates, end?: Coordinates }): void {
    console.log('MapPageComponent received points:', points); // For debugging
    this.currentStartPoint = points.start;
    this.currentEndPoint = points.end;
  }
}
