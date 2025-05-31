import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Coordinates } from '../models/coordinates';

@Component({
  selector: 'app-map-sidepanel',
  imports: [FormsModule],
  templateUrl: './map-sidepanel.component.html',
  standalone: true,
  styleUrls: ['./map-sidepanel.component.scss'],
})
export class MapSidepanelComponent {
  public startPoint: string = '';
  public endPoint: string = '';

  @Output() routePointsReady = new EventEmitter<{ start?: Coordinates, end?: Coordinates }>();

  constructor(private http: HttpClient) {}

  public getRoute(): void {
    if (!this.startPoint || !this.endPoint) {
      console.error('Start point and end point are required.');
      this.routePointsReady.emit({ start: undefined, end: undefined });
      return;
    }

    const baseUrl = 'https://nominatim.openstreetmap.org/search?q=';
    const format = '&format=json&limit=1';

    let geocodedStartCoords: Coordinates | undefined = undefined;
    let geocodedEndCoords: Coordinates | undefined = undefined;

    const startUrl = `${baseUrl}${encodeURIComponent(this.startPoint)}${format}`;
    this.http.get<any[]>(startUrl).pipe(
      map(response => {
        if (response && response.length > 0 && response[0].lat && response[0].lon) {
          return { lat: parseFloat(response[0].lat), lon: parseFloat(response[0].lon) };
        }
        throw new Error(`No results found for start point: ${this.startPoint}`);
      }),
      catchError(error => {
        console.error('Error geocoding start point:', error.message);
        return of(null);
      })
    ).subscribe(startCoords => {
      if (startCoords) {
        geocodedStartCoords = startCoords;
        console.log('Geocoded Start Point:', geocodedStartCoords);
      }

      const endUrl = `${baseUrl}${encodeURIComponent(this.endPoint)}${format}`;
      this.http.get<any[]>(endUrl).pipe(
        map(response => {
          if (response && response.length > 0 && response[0].lat && response[0].lon) {
            return { lat: parseFloat(response[0].lat), lon: parseFloat(response[0].lon) };
          }
          throw new Error(`No results found for end point: ${this.endPoint}`);
        }),
        catchError(error => {
          console.error('Error geocoding end point:', error.message);
          return of(null);
        })
      ).subscribe(endCoords => {
        if (endCoords) {
          geocodedEndCoords = endCoords;
          console.log('Geocoded End Point:', geocodedEndCoords);
        }

        this.routePointsReady.emit({ start: geocodedStartCoords, end: geocodedEndCoords });

        if (geocodedStartCoords && geocodedEndCoords) {
          console.log('Both points geocoded. Event emitted.');
        } else {
          console.log('One or both points failed to geocode. Event emitted with available data.');
        }
      });
    });
  }
}
