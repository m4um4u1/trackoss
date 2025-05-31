import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core'; // Added Input, OnChanges, SimpleChanges
import {
  ControlComponent,
  GeolocateControlDirective,
  MapComponent,
  NavigationControlDirective, ScaleControlDirective,
} from '@maplibre/ngx-maplibre-gl';
import { Map, Marker, LngLatBounds } from 'maplibre-gl'; // Added Marker, LngLatBounds
import { environment } from '../../environments/environments';

// Define Coordinates Interface
export interface Coordinates { // Exporting for potential use elsewhere
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-libre-map',
  imports: [MapComponent, ControlComponent, GeolocateControlDirective, NavigationControlDirective, ScaleControlDirective],
  templateUrl: './libre-map.component.html',
  styleUrl: './libre-map.component.scss',
  standalone: true,
})
export class LibreMapComponent implements OnInit, OnChanges { // Implement OnChanges
  mapStyleUrl: string = `${environment.mapTileProxyBaseUrl}/outdoor/style.json`;
  public map?: Map; // map property should be public if accessed from template, or use onMapLoad
  // startPosition is used for initial map center if no points are provided.
  startPosition: [number, number] = [13.404954, 52.520008]; // Berlin coordinates

  // Input properties for start and end points
  @Input() startPoint?: Coordinates;
  @Input() endPoint?: Coordinates;

  // Private properties for marker instances
  private startMarker?: Marker;
  private endMarker?: Marker;

  constructor() {}

  ngOnInit(): void {
    // ngOnInit is called before the first ngOnChanges if inputs are bound.
    // However, the map instance might not be available yet.
    // Map loading is asynchronous and handled by onMapLoad.
  }

  // mapLoaded event handler from HTML template
  public onMapLoad(mapInstance: Map): void {
    this.map = mapInstance;
    // Once map is loaded, process any initial inputs that might have already been set.
    this.updateMarkersAndBounds();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // This hook is called when any @Input() property changes.
    // We need to ensure the map is loaded before attempting to add markers.
    if (this.map) {
      this.updateMarkersAndBounds(changes);
    }
    // If map is not loaded yet, onMapLoad will call updateMarkersAndBounds later.
  }

  private updateMarkersAndBounds(changes?: SimpleChanges): void {
    if (!this.map) return; // Defensive check

    let needsViewUpdate = false;

    // Handle Start Point Marker
    // Process if 'startPoint' changed or if this is an initial call without 'changes' (from onMapLoad)
    if ((changes && changes['startPoint']) || (!changes && this.startPoint)) {
      if (this.startMarker) {
        this.startMarker.remove();
        this.startMarker = undefined;
      }
      if (this.startPoint) {
        this.startMarker = new Marker({ color: '#00FF00' }) // Green for start
          .setLngLat([this.startPoint.lon, this.startPoint.lat])
          .addTo(this.map);
        needsViewUpdate = true;
      }
    }

    // Handle End Point Marker
    // Process if 'endPoint' changed or if this is an initial call without 'changes' (from onMapLoad)
    if ((changes && changes['endPoint']) || (!changes && this.endPoint)) {
      if (this.endMarker) {
        this.endMarker.remove();
        this.endMarker = undefined;
      }
      if (this.endPoint) {
        this.endMarker = new Marker({ color: '#FF0000' }) // Red for end
          .setLngLat([this.endPoint.lon, this.endPoint.lat])
          .addTo(this.map);
        needsViewUpdate = true;
      }
    }

    // Adjust Map View only if a relevant change occurred or it's an initial call with points
    if (needsViewUpdate) {
      if (this.startPoint && this.endPoint) {
        const bounds = new LngLatBounds();
        bounds.extend([this.startPoint.lon, this.startPoint.lat]);
        bounds.extend([this.endPoint.lon, this.endPoint.lat]);
        this.map.fitBounds(bounds, { padding: 60, maxZoom: 15 }); // Added padding and maxZoom
      } else if (this.startPoint) {
        this.map.setCenter([this.startPoint.lon, this.startPoint.lat]);
        this.map.setZoom(12);
      } else if (this.endPoint) {
        this.map.setCenter([this.endPoint.lon, this.endPoint.lat]);
        this.map.setZoom(12);
      } else {
        // If all points are removed, reset to default view
        this.map.setCenter(this.startPosition);
        this.map.setZoom(10);
      }
    }
  }
}
