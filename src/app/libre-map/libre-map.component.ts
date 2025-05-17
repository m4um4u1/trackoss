import { Component, OnInit } from '@angular/core';
import {
  ControlComponent,
  GeolocateControlDirective,
  MapComponent,
  NavigationControlDirective, ScaleControlDirective,
} from '@maplibre/ngx-maplibre-gl';
import { Map } from 'maplibre-gl';
import { environment } from '../../environments/environments';


@Component({
  selector: 'app-libre-map',
  imports: [MapComponent, ControlComponent, GeolocateControlDirective, NavigationControlDirective, ScaleControlDirective],
  templateUrl: './libre-map.component.html',
  styleUrl: './libre-map.component.scss',
  standalone: true,
})
export class LibreMapComponent implements OnInit {
  mapStyleUrl: string = `https://api.maptiler.com/maps/outdoor/style.json?key=${environment.maptileApiKey}`;
  map: Map;
  startPosition: [number, number] = [13.404954, 52.520008];

  ngOnInit(): void {

  }

}
