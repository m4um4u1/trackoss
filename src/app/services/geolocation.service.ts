import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Coordinates } from '../models/coordinates';

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  constructor() {}

  /**
   * Get the user's current position using the browser's geolocation API
   * @returns Observable<Coordinates> - Emits user coordinates or completes empty on error
   */
  getCurrentPosition(): Observable<Coordinates> {
    return new Observable<Coordinates>((observer) => {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
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
          observer.next(coordinates);
          observer.complete();
        },
        () => {
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
        observer.complete();
        return;
      }

      // First, check if we already have permission
      if ('permissions' in navigator) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((result) => {
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
}
