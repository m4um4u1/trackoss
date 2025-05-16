import { Component } from '@angular/core';
import {
  ControlComponent,
  GeolocateControlDirective,
  MapComponent,
  NavigationControlDirective,
} from '@maplibre/ngx-maplibre-gl';
import { Map } from 'maplibre-gl';

@Component({
  selector: 'app-libre-map',
  imports: [MapComponent, ControlComponent, GeolocateControlDirective, NavigationControlDirective],
  templateUrl: './libre-map.component.html',
  styleUrl: './libre-map.component.scss',
})
export class LibreMapComponent {
  mapStyleUrl: string = `https://api.maptiler.com/maps/streets/style.json?key=1lm1yVfqIb88hvtSkptP`;
  map: Map;
}
