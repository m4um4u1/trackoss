import { Component, computed, EventEmitter, inject, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { firstValueFrom, of, Subject, Subscription } from 'rxjs';
import { RouteService } from '../../services/route.service';
import { Coordinates } from '../../models/coordinates';
import { RouteOptions, RouteResult } from '../../models/route';

@Component({
  selector: 'app-route-calculator',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './route-calculator.component.html',
  styleUrls: ['./route-calculator.component.scss'],
})
export class RouteCalculatorComponent implements OnInit, OnDestroy {
  // Input properties converted to signals for reactivity
  private readonly _showRouteOptions = signal(true);
  private readonly _showClearButton = signal(true);
  private readonly _autoEmitCoordinates = signal(true);
  private readonly _showLocationInputs = signal(true);
  private readonly _showCalculateButton = signal(true);

  // Input setters to update signals
  @Input() set showRouteOptions(value: boolean) {
    this._showRouteOptions.set(value);
  }
  get showRouteOptions(): boolean {
    return this._showRouteOptions();
  }

  @Input() set showClearButton(value: boolean) {
    this._showClearButton.set(value);
  }
  get showClearButton(): boolean {
    return this._showClearButton();
  }

  @Input() set autoEmitCoordinates(value: boolean) {
    this._autoEmitCoordinates.set(value);
  }
  get autoEmitCoordinates(): boolean {
    return this._autoEmitCoordinates();
  }

  @Input() set showLocationInputs(value: boolean) {
    this._showLocationInputs.set(value);
  }
  get showLocationInputs(): boolean {
    return this._showLocationInputs();
  }

  @Input() set showCalculateButton(value: boolean) {
    this._showCalculateButton.set(value);
  }
  get showCalculateButton(): boolean {
    return this._showCalculateButton();
  }

  @Output() routeCalculated = new EventEmitter<RouteResult>();
  @Output() routeCleared = new EventEmitter<void>();
  @Output() coordinatesReady = new EventEmitter<{ start?: Coordinates; end?: Coordinates }>();
  @Output() error = new EventEmitter<string>();

  // Modern Angular 20 dependency injection
  private readonly routeService = inject(RouteService);
  private readonly http = inject(HttpClient);

  // Signal-based state management
  private readonly _startPointText = signal('');
  private readonly _endPointText = signal('');
  private readonly _isCalculating = signal(false);
  private readonly _errorMessage = signal('');
  private readonly _successMessage = signal('');
  private readonly _routeOptions = signal<RouteOptions>({
    costing: 'bicycle',
    color: '#007cbf',
    width: 4,
  });

  // Public readonly signals
  readonly startPointText = this._startPointText.asReadonly();
  readonly endPointText = this._endPointText.asReadonly();
  readonly isCalculating = this._isCalculating.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly successMessage = this._successMessage.asReadonly();
  readonly routeOptions = this._routeOptions.asReadonly();

  // Computed signals for derived state
  readonly hasStartPoint = computed(() => this._startPointText().trim().length > 0);
  readonly hasEndPoint = computed(() => this._endPointText().trim().length > 0);
  readonly canCalculateRoute = computed(() => {
    if (!this._showLocationInputs()) {
      return true; // When used for route options only, always allow "calculation"
    }
    return this.hasStartPoint() && this.hasEndPoint() && !this._isCalculating();
  });
  readonly hasError = computed(() => this._errorMessage().length > 0);
  readonly hasSuccess = computed(() => this._successMessage().length > 0);

  // Static options (no need for signals)
  readonly costingOptions: Map<string, string> = new Map<string, string>();
  readonly bicycleTypesOptions: string[] = ['road', 'hybrid', 'city', 'cross', 'mountain'];

  private routeSubscription?: Subscription;
  private destroy$ = new Subject<void>();

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

  // Methods to update signals from template
  updateStartPointText(value: string): void {
    this._startPointText.set(value);
  }

  updateEndPointText(value: string): void {
    this._endPointText.set(value);
  }

  updateRouteOptions(options: Partial<RouteOptions>): void {
    this._routeOptions.update((current) => ({ ...current, ...options }));
  }

  calculateRoute(): void {
    if (!this.canCalculateRoute() || this._isCalculating()) return;

    this._isCalculating.set(true);
    this._errorMessage.set('');
    this._successMessage.set('');

    this.geocodePoints().then(({ startCoords, endCoords }) => {
      if (!startCoords || !endCoords) {
        this._isCalculating.set(false);
        return;
      }

      // Emit coordinates if auto-emit is enabled
      if (this._autoEmitCoordinates()) {
        this.coordinatesReady.emit({ start: startCoords, end: endCoords });
      }

      // Calculate the route
      this.routeSubscription = this.routeService
        .calculateRoute(startCoords, endCoords, this._routeOptions())
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (routeResult: RouteResult) => {
            this._isCalculating.set(false);
            this._successMessage.set('Route calculated successfully!');
            this.routeCalculated.emit(routeResult);

            // Clear success message after 5 seconds (extended for better test reliability)
            setTimeout(() => {
              this._successMessage.set('');
            }, 5000);
          },
          error: (error) => {
            this._isCalculating.set(false);
            this._errorMessage.set('Failed to calculate route. Please try again.');
            this.error.emit(error.message || 'Route calculation failed');
            console.error('Route calculation error:', error);
          },
        });
    });
  }

  clearRoute(): void {
    this._startPointText.set('');
    this._endPointText.set('');
    this._errorMessage.set('');
    this._successMessage.set('');
    this.routeService.clearAllRoutes();
    this.routeCleared.emit();

    if (this._autoEmitCoordinates()) {
      this.coordinatesReady.emit({ start: undefined, end: undefined });
    }
  }

  private async geocodePoints(): Promise<{ startCoords?: Coordinates; endCoords?: Coordinates }> {
    const baseUrl = 'https://nominatim.openstreetmap.org/search?q=';
    const format = '&format=json&limit=1';

    try {
      // Geocode start point
      const startUrl = `${baseUrl}${encodeURIComponent(this._startPointText())}${format}`;
      const startResponse = await firstValueFrom(
        this.http.get<any[]>(startUrl).pipe(
          map((response) => {
            if (response && response.length > 0 && response[0].lat && response[0].lon) {
              return { lat: parseFloat(response[0].lat), lon: parseFloat(response[0].lon) };
            }
            throw new Error(`No results found for start point: ${this._startPointText()}`);
          }),
          catchError((error) => {
            console.error('Error geocoding start point:', error.message);
            this._errorMessage.set(`Could not find start location: ${this._startPointText()}`);
            return of(null);
          }),
        ),
      );

      if (!startResponse) {
        return {};
      }

      // Geocode end point
      const endUrl = `${baseUrl}${encodeURIComponent(this._endPointText())}${format}`;
      const endResponse = await firstValueFrom(
        this.http.get<any[]>(endUrl).pipe(
          map((response) => {
            if (response && response.length > 0 && response[0].lat && response[0].lon) {
              return { lat: parseFloat(response[0].lat), lon: parseFloat(response[0].lon) };
            }
            throw new Error(`No results found for end point: ${this._endPointText()}`);
          }),
          catchError((error) => {
            console.error('Error geocoding end point:', error.message);
            this._errorMessage.set(`Could not find end location: ${this._endPointText()}`);
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
      this._errorMessage.set('Error finding locations. Please check your input.');
      return {};
    }
  }
}
