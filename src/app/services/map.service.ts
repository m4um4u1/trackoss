import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private mapTileBaseUrl: string = environment.mapTileProxyBaseUrl;

  constructor(private http: HttpClient) {}

  getMapTiles(style: string): Observable<any> {
    return this.http.get(`${this.mapTileBaseUrl}/${style}/style.json`);
  }
}
