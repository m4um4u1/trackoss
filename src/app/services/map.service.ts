import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../environments/environments';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService,
  ) {}

  getMapTiles(style: string): Observable<any> {
    if (environment.production && environment.useConfigService) {
      // Use ConfigService for production
      return this.configService
        .loadConfig()
        .pipe(switchMap((config) => this.http.get(`${config.mapTileProxyBaseUrl}/${style}/style.json`)));
    } else {
      // Use environment directly for development
      return this.http.get(`${environment.mapTileProxyBaseUrl}/${style}/style.json`);
    }
  }
}
