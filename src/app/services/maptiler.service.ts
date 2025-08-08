import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environments';
import { ConfigService } from './config.service';

export interface MapTilerConfig {
  apiKey: string;
  url: string;
  allowedDomains?: string[];
}

export interface MapTilerStyle {
  outdoor: string;
  streets: string;
  satellite: string;
  hybrid: string;
  basic: string;
  bright: string;
  topo: string;
  dataviz: string;
}

@Injectable({
  providedIn: 'root',
})
export class MapTilerService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  // Available MapTiler styles
  readonly styles: MapTilerStyle = {
    outdoor: 'outdoor-v2',
    streets: 'streets-v2',
    satellite: 'satellite',
    hybrid: 'hybrid',
    basic: 'basic-v2',
    bright: 'bright-v2',
    topo: 'topo-v2',
    dataviz: 'dataviz',
  };

  /**
   * Get MapTiler configuration
   */
  getConfig(): Observable<MapTilerConfig> {
    if (environment.production && environment.useConfigService) {
      return this.configService.loadConfig().pipe(
        map((config) => ({
          apiKey: config.mapTilerApiKey || '',
          url: config.mapTilerUrl || 'https://api.maptiler.com/maps',
          allowedDomains: this.parseAllowedDomains(config),
        })),
      );
    } else {
      return of({
        apiKey: environment.mapTilerApiKey || '',
        url: environment.mapTilerUrl || 'https://api.maptiler.com/maps',
        allowedDomains: ['localhost', '127.0.0.1', '*.localhost'],
      });
    }
  }

  /**
   * Parse allowed domains from config (if specified)
   */
  private parseAllowedDomains(config: any): string[] {
    // You can extend config.json to include allowedDomains
    if (config.mapTilerAllowedDomains) {
      if (typeof config.mapTilerAllowedDomains === 'string') {
        return config.mapTilerAllowedDomains.split(',').map((d: string) => d.trim());
      }
      if (Array.isArray(config.mapTilerAllowedDomains)) {
        return config.mapTilerAllowedDomains;
      }
    }
    return [];
  }

  /**
   * Get map style with proper API key configuration
   * @param styleName Name of the style (outdoor, streets, satellite, etc.)
   */
  getMapStyle(styleName: keyof MapTilerStyle = 'outdoor'): Observable<any> {
    return this.getConfig().pipe(
      switchMap((config) => {
        if (!config.apiKey) {
          console.warn('MapTiler API key not configured. Maps may not work properly.');
        }

        const style = this.styles[styleName] || this.styles.outdoor;
        const styleUrl = `${config.url}/${style}/style.json`;

        // Build URL with API key
        const fullUrl = config.apiKey ? `${styleUrl}?key=${config.apiKey}` : styleUrl;

        // Use minimal headers for MapTiler API - no custom headers that might cause CORS issues
        const httpOptions = {
          headers: new HttpHeaders({
            Accept: 'application/json',
          }),
          // Explicitly tell Angular not to send credentials
          withCredentials: false,
        };

        return this.http.get(fullUrl, httpOptions).pipe(
          map((styleConfig: any) => this.processStyleConfig(styleConfig, config.apiKey)),
          catchError((error) => {
            console.error(`Failed to load MapTiler style '${styleName}':`, error);

            // Provide detailed error information
            if (error.status === 401) {
              return throwError(() => new Error('Invalid MapTiler API key. Please check your configuration.'));
            } else if (error.status === 403) {
              return throwError(() => new Error('Access forbidden. Check domain restrictions in MapTiler dashboard.'));
            } else if (error.status === 404) {
              return throwError(() => new Error(`MapTiler style '${styleName}' not found.`));
            }

            return throwError(() => error);
          }),
        );
      }),
    );
  }

  /**
   * Process style configuration to ensure API keys are properly included
   */
  private processStyleConfig(styleConfig: any, apiKey: string): any {
    if (!apiKey || !styleConfig.sources) {
      return styleConfig;
    }

    // Create a deep copy to avoid modifying the original
    const processedConfig = JSON.parse(JSON.stringify(styleConfig));

    // Ensure all tile URLs have the API key
    Object.keys(processedConfig.sources).forEach((sourceKey) => {
      const source = processedConfig.sources[sourceKey];

      if (source.tiles && Array.isArray(source.tiles)) {
        source.tiles = source.tiles.map((tileUrl: string) => {
          return this.ensureApiKey(tileUrl, apiKey);
        });
      }

      if (source.url) {
        source.url = this.ensureApiKey(source.url, apiKey);
      }
    });

    // Process sprite URL if exists
    if (processedConfig.sprite) {
      processedConfig.sprite = this.ensureApiKey(processedConfig.sprite, apiKey);
    }

    // Process glyphs URL if exists
    if (processedConfig.glyphs) {
      processedConfig.glyphs = this.ensureApiKey(processedConfig.glyphs, apiKey);
    }

    return processedConfig;
  }

  /**
   * Ensure URL has API key parameter
   */
  private ensureApiKey(url: string, apiKey: string): string {
    if (!apiKey || url.includes('key=')) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}key=${apiKey}`;
  }

  /**
   * Get geocoding API URL with API key
   */
  getGeocodingUrl(): Observable<string> {
    return this.getConfig().pipe(
      map((config) => {
        const baseUrl = 'https://api.maptiler.com/geocoding';
        return config.apiKey ? `${baseUrl}/{query}.json?key=${config.apiKey}` : baseUrl;
      }),
    );
  }

  /**
   * Search for a location using MapTiler Geocoding API
   */
  searchLocation(query: string): Observable<any> {
    return this.getConfig().pipe(
      switchMap((config) => {
        if (!config.apiKey) {
          return throwError(() => new Error('MapTiler API key is required for geocoding'));
        }

        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${config.apiKey}`;

        const httpOptions = {
          headers: new HttpHeaders({
            Accept: 'application/json',
          }),
          withCredentials: false,
        };

        return this.http.get(url, httpOptions).pipe(
          catchError((error) => {
            console.error('Geocoding request failed:', error);
            return throwError(() => error);
          }),
        );
      }),
    );
  }

  /**
   * Reverse geocoding - get location details from coordinates
   */
  reverseGeocode(lon: number, lat: number): Observable<any> {
    return this.getConfig().pipe(
      switchMap((config) => {
        if (!config.apiKey) {
          return throwError(() => new Error('MapTiler API key is required for reverse geocoding'));
        }

        const url = `https://api.maptiler.com/geocoding/${lon},${lat}.json?key=${config.apiKey}`;

        const httpOptions = {
          headers: new HttpHeaders({
            Accept: 'application/json',
          }),
          withCredentials: false,
        };

        return this.http.get(url, httpOptions).pipe(
          catchError((error) => {
            console.error('Reverse geocoding request failed:', error);
            return throwError(() => error);
          }),
        );
      }),
    );
  }

  /**
   * Get static map image URL
   */
  getStaticMapUrl(
    center: [number, number],
    zoom: number = 12,
    width: number = 600,
    height: number = 400,
    style: keyof MapTilerStyle = 'outdoor',
  ): Observable<string> {
    return this.getConfig().pipe(
      map((config) => {
        const styleId = this.styles[style] || this.styles.outdoor;
        const baseUrl = 'https://api.maptiler.com/maps';
        const [lon, lat] = center;

        let url = `${baseUrl}/${styleId}/static/${lon},${lat},${zoom}/${width}x${height}.png`;

        if (config.apiKey) {
          url += `?key=${config.apiKey}`;
        }

        return url;
      }),
    );
  }
}
