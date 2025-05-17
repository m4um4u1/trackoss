import { Component } from '@angular/core';
import { LibreMapComponent } from '../../libre-map/libre-map.component';
import { MapSidepanelComponent } from '../../map-sidepanel/map-sidepanel.component';

@Component({
  selector: 'app-map-page',
  imports: [LibreMapComponent, MapSidepanelComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  standalone: true,
})
export class MapPageComponent {}
