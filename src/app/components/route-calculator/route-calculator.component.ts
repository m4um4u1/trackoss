import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { of, Subscription, firstValueFrom, Subject } from 'rxjs';
import { RouteService } from '../../services/route.service';
import { Coordinates } from '../../models/coordinates';
import { RouteResult, RouteOptions } from '../../models/route';

@Component({
  selector: 'app-route-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './route-calculator.component.html',
  styleUrls: ['./route-calculator.component.scss'],
})
export class RouteCalculatorComponent implements OnInit, OnDestroy {
  @Input() showRouteOptions: boolean = true;
  @Input() showClearButton: boolean = true;
  @Input() autoEmitCoordinates: boolean = true;
  @Input() showLocationInputs: boolean = true;
  @Input() showCalculateButton: boolean = true;

  @Output() routeCalculated = new EventEmitter<RouteResult>();
  @Output() routeCleared = new EventEmitter<void>();
  @Output() coordinatesReady = new EventEmitter<{ start?: Coordinates; end?: Coordinates }>();
  @Output() error = new EventEmitter<string>();

  startPointText: string = '';
  endPointText: string = '';
  isCalculating: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  costingOptions: Map<string, string> = new Map<string, string>();
  bicycleTypesOptions: string[] = ['road', 'hybrid', 'city', 'cross', 'mountain'];

  routeOptions: RouteOptions = {
    costing: 'bicycle',
    color: '#007cbf',
    width: 4,
  };

  private routeSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    private routeService: RouteService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.costingOptions.set('Bicycle', 'bicycle');
    this.costingOptions.set('Hiking', 'pedestrian');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  canCalculateRoute(): boolean {
    if (!this.showLocationInputs) {
      return true; // When used for route options only, always allow "calculation"
    }
    return this.startPointText.trim() !== '' && this.endPointText.trim() !== '';
  }

  calculateRoute(): void {
    if (!this.canCalculateRoute() || this.isCalculating) return;

    this.isCalculating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.geocodePoints().then(({ startCoords, endCoords }) => {
      if (!startCoords || !endCoords) {
        this.isCalculating = false;
        return;
      }

      // Emit coordinates if auto-emit is enabled
      if (this.autoEmitCoordinates) {
        this.coordinatesReady.emit({ start: startCoords, end: endCoords });
      }

      // Calculate the route
      this.routeSubscription = this.routeService
        .calculateRoute(startCoords, endCoords, this.routeOptions)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (routeResult: RouteResult) => {
            this.isCalculating = false;
            this.successMessage = 'Route calculated successfully!';
            this.routeCalculated.emit(routeResult);

            // Clear success message after 3 seconds
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            this.isCalculating = false;
            this.errorMessage = 'Failed to calculate route. Please try again.';
            this.error.emit(error.message || 'Route calculation failed');
            console.error('Route calculation error:', error);
          },
        });
    });
  }

  clearRoute(): void {
    this.startPointText = '';
    this.endPointText = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.routeService.clearAllStoredRoutes();
    this.routeCleared.emit();

    if (this.autoEmitCoordinates) {
      this.coordinatesReady.emit({ start: undefined, end: undefined });
    }
  }

  private async geocodePoints(): Promise<{ startCoords?: Coordinates; endCoords?: Coordinates }> {
    const baseUrl = 'https://nominatim.openstreetmap.org/search?q=';
    const format = '&format=json&limit=1';

    try {
      // Geocode start point
      const startUrl = `${baseUrl}${encodeURIComponent(this.startPointText)}${format}`;
      const startResponse = await firstValueFrom(
        this.http.get<any[]>(startUrl).pipe(
          map((response) => {
            if (response && response.length > 0 && response[0].lat && response[0].lon) {
              return { lat: parseFloat(response[0].lat), lon: parseFloat(response[0].lon) };
            }
            throw new Error(`No results found for start point: ${this.startPointText}`);
          }),
          catchError((error) => {
            console.error('Error geocoding start point:', error.message);
            this.errorMessage = `Could not find start location: ${this.startPointText}`;
            return of(null);
          }),
        ),
      );

      if (!startResponse) {
        return {};
      }

      // Geocode end point
      const endUrl = `${baseUrl}${encodeURIComponent(this.endPointText)}${format}`;
      const endResponse = await firstValueFrom(
        this.http.get<any[]>(endUrl).pipe(
          map((response) => {
            if (response && response.length > 0 && response[0].lat && response[0].lon) {
              return { lat: parseFloat(response[0].lat), lon: parseFloat(response[0].lon) };
            }
            throw new Error(`No results found for end point: ${this.endPointText}`);
          }),
          catchError((error) => {
            console.error('Error geocoding end point:', error.message);
            this.errorMessage = `Could not find end location: ${this.endPointText}`;
            return of(null);
          }),
        ),
      );

      if (!endResponse) {
        return { startCoords: startResponse };
      }

      return { startCoords: startResponse, endCoords: endResponse };
    } catch (error) {
      console.error('Geocoding error:', error);
      this.errorMessage = 'Error finding locations. Please check your input.';
      return {};
    }
  }
}
