import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap, map, catchError } from 'rxjs';
import { environment } from '../../environments/environments';
import { ConfigService } from './config.service';
import { MapTilerService, MapTilerStyle } from './maptiler.service';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  private readonly mapTilerService = inject(MapTilerService);

  /**
   * Get map style configuration directly from MapTiler
   * @param style The style name (e.g., 'outdoor', 'streets', 'satellite')
   * @deprecated Use MapTilerService.getMapStyle() instead for better error handling
   */
  getMapTiles(style: string): Observable<any> {
    // Delegate to the new MapTiler service for backward compatibility
    return this.mapTilerService.getMapStyle(style as keyof MapTilerStyle).pipe(
      catchError((error) => {
        console.error('Failed to load map tiles, falling back to legacy method:', error);
        return this.getMapTilesLegacy(style);
      }),
    );
  }

  /**
   * Legacy method for getting map tiles (fallback)
   */
  private getMapTilesLegacy(style: string): Observable<any> {
    return this.getMapTilerConfig().pipe(
      switchMap(({ url, apiKey }) => {
        // Build the MapTiler style URL with API key
        const styleUrl = `${url}/${style}/style.json${apiKey ? `?key=${apiKey}` : ''}`;

        // Fetch the style configuration
        return this.http.get(styleUrl).pipe(
          map((styleConfig: any) => {
            // If using MapTiler, the style config already has the correct URLs
            // If API key is needed, it's included in the tile URLs
            if (apiKey && styleConfig.sources) {
              // Ensure tile URLs have the API key
              Object.keys(styleConfig.sources).forEach((sourceKey) => {
                const source = styleConfig.sources[sourceKey];
                if (source.tiles) {
                  source.tiles = source.tiles.map((tileUrl: string) => {
                    // Add API key if not already present
                    if (!tileUrl.includes('key=') && apiKey) {
                      const separator = tileUrl.includes('?') ? '&' : '?';
                      return `${tileUrl}${separator}key=${apiKey}`;
                    }
                    return tileUrl;
                  });
                }
              });
            }
            return styleConfig;
          }),
        );
      }),
    );
  }

  /**
   * Get MapTiler configuration based on environment
   */
  private getMapTilerConfig(): Observable<{ url: string; apiKey: string }> {
    if (environment.production && environment.useConfigService) {
      // Production: load from config.json
      return this.configService.loadConfig().pipe(
        map((config) => ({
          url: config.mapTilerUrl || 'https://api.maptiler.com/maps',
          apiKey: config.mapTilerApiKey || '',
        })),
      );
    } else {
      // Development: use environment variables
      return of({
        url: environment.mapTilerUrl || 'https://api.maptiler.com/maps',
        apiKey: environment.mapTilerApiKey || '',
      });
    }
  }

  /**
   * Get a simple tile URL for OSM or other tile services
   * Alternative to MapTiler for free/open tiles
   */
  getOpenStreetMapTileUrl(): string {
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  }
}
