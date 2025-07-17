import { computed, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Coordinates } from '../models/coordinates';

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  // Signal-based state management
  private readonly _currentPosition = signal<Coordinates | null>(null);
  private readonly _isLocating = signal(false);
  private readonly _locationError = signal<string | null>(null);
  private readonly _permissionStatus = signal<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // Public readonly signals
  readonly currentPosition = this._currentPosition.asReadonly();
  readonly isLocating = this._isLocating.asReadonly();
  readonly locationError = this._locationError.asReadonly();
  readonly permissionStatus = this._permissionStatus.asReadonly();

  // Computed signals
  readonly hasLocation = computed(() => this._currentPosition() !== null);
  readonly canRequestLocation = computed(() => this._permissionStatus() !== 'denied' && !this._isLocating());
  readonly locationAvailable = computed(() => this.isGeolocationSupported());

  /**
   * Get the user's current position using the browser's geolocation API
   * @returns Observable<Coordinates> - Emits user coordinates or completes empty on error
   */
  getCurrentPosition(): Observable<Coordinates> {
    return new Observable<Coordinates>((observer) => {
      // Set loading state
      this._isLocating.set(true);
      this._locationError.set(null);

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        this._isLocating.set(false);
        this._locationError.set('Geolocation is not supported by this browser');
        observer.complete();
        return;
      }

      // Set up geolocation options
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds timeout
        maximumAge: 300000, // Accept cached position up to 5 minutes old
      };

      // Get current position
      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          const coordinates: Coordinates = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };

          // Update signals
          this._currentPosition.set(coordinates);
          this._isLocating.set(false);
          this._locationError.set(null);

          observer.next(coordinates);
          observer.complete();
        },
        (error) => {
          // Update error state
          this._isLocating.set(false);
          this._locationError.set(this.getLocationErrorMessage(error));

          observer.complete();
        },
        options,
      );
    });
  }

  /**
   * Request user consent for location access and get position if granted
   * @returns Observable<Coordinates> - Emits coordinates only if user consents
   */
  requestLocationWithConsent(): Observable<Coordinates> {
    return new Observable<Coordinates>((observer) => {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        this._locationError.set('Geolocation is not supported by this browser');
        observer.complete();
        return;
      }

      // First, check if we already have permission
      if ('permissions' in navigator) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((result) => {
            this._permissionStatus.set(result.state as 'granted' | 'denied' | 'prompt');

            if (result.state === 'granted') {
              // Permission already granted, get location
              this.getCurrentPosition().subscribe({
                next: (coords) => observer.next(coords),
                complete: () => observer.complete(),
              });
            } else if (result.state === 'prompt') {
              // Need to request permission
              this.getCurrentPosition().subscribe({
                next: (coords) => observer.next(coords),
                complete: () => observer.complete(),
              });
            } else {
              // Permission denied
              this._permissionStatus.set('denied');
              this._locationError.set('Location access denied by user');
              observer.complete();
            }
          })
          .catch(() => {
            // Fallback if permissions API not supported
            this.getCurrentPosition().subscribe({
              next: (coords) => observer.next(coords),
              complete: () => observer.complete(),
            });
          });
      } else {
        // Permissions API not supported, try direct request
        this.getCurrentPosition().subscribe({
          next: (coords) => observer.next(coords),
          complete: () => observer.complete(),
        });
      }
    });
  }

  /**
   * Check if geolocation is supported by the browser
   * @returns boolean
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Clear the current position and reset state
   */
  clearPosition(): void {
    this._currentPosition.set(null);
    this._locationError.set(null);
  }

  /**
   * Get a user-friendly error message from GeolocationPositionError
   */
  private getLocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied by user';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable';
      case error.TIMEOUT:
        return 'Location request timed out';
      default:
        return 'An unknown error occurred while retrieving location';
    }
  }
}
