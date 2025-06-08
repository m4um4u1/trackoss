import { Component, OnInit, Input, OnChanges, SimpleChanges, AfterViewInit, OnDestroy } from '@angular/core';
import { Map as MapLibreMap, Marker, LngLatBounds } from 'maplibre-gl';
import { MapService } from '../services/map.service';
import { RouteService } from '../services/route.service';
import {
  MapComponent,
  ControlComponent,
  GeolocateControlDirective,
  NavigationControlDirective,
  ScaleControlDirective,
} from '@maplibre/ngx-maplibre-gl';
import { Coordinates } from '../models/coordinates';
import { RouteResult, RouteOptions } from '../models/route';
import { Subscription } from 'rxjs';

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
    ScaleControlDirective,
  ],
})
export class LibreMapComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  public map?: MapLibreMap;
  public mapStyleUrl: string = ''; // Declare and initialize the mapStyleUrl property
  startPosition: [number, number] = [13.404954, 52.520008];

  @Input() startPoint?: Coordinates;
  @Input() endPoint?: Coordinates;
  @Input() routeOptions?: RouteOptions;
  @Input() showRoute: boolean = true;

  private startMarker?: Marker;
  private endMarker?: Marker;
  private routeSubscription?: Subscription;

  constructor(
    private mapService: MapService,
    private routeService: RouteService,
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

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private loadMapTiles(): void {
    this.mapService.getMapTiles('outdoor').subscribe((style: string) => {
      // Explicitly define the type of the style parameter
      this.mapStyleUrl = style; // Assign the fetched style URL to mapStyleUrl
    });
  }

  private initializeMap(): void {
    const mapContainer: HTMLElement = document.getElementById('map');

    // Initialize the map with the loaded style
    this.map = new MapLibreMap({
      container: mapContainer,
      style: this.mapStyleUrl,
      center: this.startPosition,
      zoom: 10,
    });

    this.map.on('load', () => {
      this.updateMarkersAndBounds();
    });
  }

  public onMapLoad(mapInstance: MapLibreMap): void {
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

        // Calculate and display route if enabled
        if (this.showRoute) {
          this.calculateAndDisplayRoute();
        }
      } else if (this.startPoint) {
        this.map.setCenter([this.startPoint.lon, this.startPoint.lat]);
        this.map.setZoom(12);
      } else if (this.endPoint) {
        this.map.setCenter([this.endPoint.lon, this.endPoint.lat]);
        this.map.setZoom(12);
      } else {
        this.map.setCenter(this.startPosition);
        this.map.setZoom(10);
        // Clear route if no points are set
        if (this.map.getSource('route')) {
          this.routeService.removeRouteFromMap(this.map);
        }
      }
    }
  }

  private calculateAndDisplayRoute(): void {
    if (!this.map || !this.startPoint || !this.endPoint) return;

    // Unsubscribe from previous route calculation if any
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }

    this.routeSubscription = this.routeService
      .calculateRoute(this.startPoint, this.endPoint, this.routeOptions)
      .subscribe({
        next: (routeResult: RouteResult) => {
          if (this.map) {
            this.routeService.updateRouteOnMap(this.map, routeResult);
          }
        },
        error: (error) => {
          console.error('Error calculating route:', error);
        },
      });
  }

  /**
   * Public method to manually trigger route calculation
   */
  public calculateRoute(): void {
    this.calculateAndDisplayRoute();
  }

  /**
   * Public method to clear the route from the map
   */
  public clearRoute(): void {
    if (this.map) {
      this.routeService.removeRouteFromMap(this.map);
    }
  }

  /**
   * Public method to get the current route result
   */
  public getCurrentRoute(): RouteResult | null {
    let currentRoute: RouteResult | null = null;
    this.routeService
      .getCurrentRoute()
      .subscribe((route) => {
        currentRoute = route;
      })
      .unsubscribe();
    return currentRoute;
  }
}
