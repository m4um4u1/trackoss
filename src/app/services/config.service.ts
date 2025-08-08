import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface AppConfig {
  baseUrl: string;
  valhallaUrl: string;
  mapTilerApiKey?: string;
  mapTilerUrl?: string;
  mapTilerAllowedDomains?: string | string[];
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
          baseUrl: '',
          valhallaUrl: 'http://localhost:8002',
          mapTilerApiKey: '',
          mapTilerUrl: 'https://api.maptiler.com/maps',
        };
        return of(this.config);
      }),
    );
  }
}
