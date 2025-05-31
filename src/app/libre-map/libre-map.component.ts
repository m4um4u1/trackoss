import { Component, OnInit, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { Map, Marker, LngLatBounds, GeoJSONSource } from 'maplibre-gl';
import { MapService } from '../services/map.service';
import { RoutingService } from '../services/routing.service';
import { MapComponent, ControlComponent, GeolocateControlDirective, NavigationControlDirective, ScaleControlDirective } from '@maplibre/ngx-maplibre-gl';
import { Coordinates } from '../models/coordinates';

@Component({
  selector: 'app-libre-map',
  templateUrl: './libre-map.component.html',
  styleUrls: ['./libre-map.component.scss'],
  standalone: true,
  imports: [
    MapComponent,
    ControlComponent,
    GeolocateControlDirective,
    NavigationControlDirective,
    ScaleControlDirective
  ]
})
export class LibreMapComponent implements OnInit, OnChanges, AfterViewInit {
  public map?: Map;
  public mapStyleUrl: string = ''; // Declare and initialize the mapStyleUrl property
  startPosition: [number, number] = [13.404954, 52.520008];

  @Input() startPoint?: Coordinates;
  @Input() endPoint?: Coordinates;

  private startMarker?: Marker;
  private endMarker?: Marker;

  constructor(
    private mapService: MapService,
    private routingService: RoutingService
  ) {}

  ngOnInit(): void {
    this.loadMapTiles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map) {
      this.updateMarkersAndBounds(changes);
    }
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  private loadMapTiles(): void {
    this.mapService.getMapTiles('outdoor').subscribe((style: string) => { // Explicitly define the type of the style parameter
      this.mapStyleUrl = style; // Assign the fetched style URL to mapStyleUrl
    });
  }

  private initializeMap(): void {
    const mapContainer: HTMLElement = document.getElementById('map');

    // Initialize the map with the loaded style
    this.map = new Map({
      container: mapContainer,
      style: this.mapStyleUrl,
      center: this.startPosition,
      zoom: 10,
    });

    this.map.on('load', () => {
      this.updateMarkersAndBounds();
    });
  }

  public onMapLoad(mapInstance: Map): void {
    this.map = mapInstance;
    this.updateMarkersAndBounds();
  }

  private updateMarkersAndBounds(changes?: SimpleChanges): void {
    if (!this.map) return;

    let needsViewUpdate = false;

    if ((changes && changes['startPoint']) || (!changes && this.startPoint)) {
      if (this.startMarker) {
        this.startMarker.remove();
        this.startMarker = undefined;
      }
      if (this.startPoint) {
        this.startMarker = new Marker({ color: '#00FF00' })
          .setLngLat([this.startPoint.lon, this.startPoint.lat])
          .addTo(this.map);
        needsViewUpdate = true;
      }
    }

    if ((changes && changes['endPoint']) || (!changes && this.endPoint)) {
      if (this.endMarker) {
        this.endMarker.remove();
        this.endMarker = undefined;
      }
      if (this.endPoint) {
        this.endMarker = new Marker({ color: '#FF0000' })
          .setLngLat([this.endPoint.lon, this.endPoint.lat])
          .addTo(this.map);
        needsViewUpdate = true;
      }
    }

    if (needsViewUpdate) {
      if (this.startPoint && this.endPoint) {
        const bounds = new LngLatBounds();
        bounds.extend([this.startPoint.lon, this.startPoint.lat]);
        bounds.extend([this.endPoint.lon, this.endPoint.lat]);
        this.map.fitBounds(bounds, { padding: 60, maxZoom: 15 });

        // Add line between start and end points
        this.addLineLayer();
      } else if (this.startPoint) {
        this.map.setCenter([this.startPoint.lon, this.startPoint.lat]);
        this.map.setZoom(12);
      } else if (this.endPoint) {
        this.map.setCenter([this.endPoint.lon, this.endPoint.lat]);
        this.map.setZoom(12);
      } else {
        this.map.setCenter(this.startPosition);
        this.map.setZoom(10);
      }
    }
  }

  private addLineLayer(): void {
    if (!this.map || !this.startPoint || !this.endPoint) return;

    this.routingService.getRoute(this.startPoint, this.endPoint).subscribe(route => {
      const decodedGeometry = this.decodePolyline(route.trip.legs[0].shape, 6); // Decode the polyline
      const coordinates = decodedGeometry.map((point: number[]) => [point[1], point[0]]); // Convert to [lon, lat]

      const lineData: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          },
        ],
      };

      if (this.map.getSource('route')) {
        (this.map.getSource('route') as GeoJSONSource).setData(lineData);
      } else {
        this.map.addSource('route', {
          type: 'geojson',
          data: lineData,
        });

        this.map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#007cbf',
            'line-width': 4,
          },
        });
      }
    });
  }

  private decodePolyline(str: string, precision: number) {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates = [];
    let shift = 0;
    let result = 0;
    let byte = null;
    let latitude_change;
    let longitude_change;
    const factor = Math.pow(10, precision || 6);

    while (index < str.length) {
      // Reset shift, result, and byte
      byte = null;
      shift = 0;
      result = 0;

      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

      shift = result = 0;

      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

      lat += latitude_change;
      lng += longitude_change;

      coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
  }
}
