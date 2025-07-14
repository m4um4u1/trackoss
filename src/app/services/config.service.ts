import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface AppConfig {
  mapTileProxyBaseUrl: string;
  valhallaUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config: AppConfig | null = null;

  constructor(private http: HttpClient) {}

  loadConfig(): Observable<AppConfig> {
    if (this.config) {
      return of(this.config);
    }

    return this.http.get<AppConfig>('/assets/config.json').pipe(
      map((config) => {
        this.config = config;
        return config;
      }),
      catchError((error) => {
        console.error('Failed to load configuration, using defaults:', error);
        // Fallback to environment values if config.json fails to load
        this.config = {
          mapTileProxyBaseUrl: '/api/map-proxy',
          valhallaUrl: '/api/valhalla',
        };
        return of(this.config);
      }),
    );
  }
}
