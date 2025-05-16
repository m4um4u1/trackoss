import { Component } from '@angular/core';
import { LibreMapComponent } from '../../libre-map/libre-map.component';

@Component({
  selector: 'app-map-page',
  imports: [LibreMapComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
})
export class MapPageComponent {}
