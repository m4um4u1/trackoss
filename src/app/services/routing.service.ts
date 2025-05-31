import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Coordinates } from '../models/coordinates';
import { environment} from '../../environments/environments';


@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  private routingBaseUrl: string = environment.valhallaUrl + '/route'; // Replace with your Valhalla server URL

  constructor(private http: HttpClient) {}

  getRoute(start: Coordinates, end: Coordinates): Observable<any> {
    const url = `${this.routingBaseUrl}?json={
      "locations": [
        {"lat": ${start.lat}, "lon": ${start.lon}},
        {"lat": ${end.lat}, "lon": ${end.lon}}
      ],
      "costing": "bicycle"
    }`;
    return this.http.get(url);
  }
}
