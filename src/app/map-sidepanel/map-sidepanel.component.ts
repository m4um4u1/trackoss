import { Component, Output, EventEmitter } from '@angular/core';
import { RouteCalculatorComponent } from '../components/route-calculator/route-calculator.component';
import { RouteDisplayComponent } from '../components/route-display/route-display.component';
import { Coordinates } from '../models/coordinates';
import { RouteResult } from '../models/route';

@Component({
  selector: 'app-map-sidepanel',
  imports: [RouteCalculatorComponent, RouteDisplayComponent],
  templateUrl: './map-sidepanel.component.html',
  standalone: true,
  styleUrls: ['./map-sidepanel.component.scss'],
})
export class MapSidepanelComponent {
  @Output() routePointsReady = new EventEmitter<{ start?: Coordinates; end?: Coordinates }>();
  @Output() routeCalculated = new EventEmitter<RouteResult>();

  constructor() {}

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
}
