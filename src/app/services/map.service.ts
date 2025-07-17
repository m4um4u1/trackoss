import { inject, Injectable, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, switchMap } from 'rxjs';
import { environment } from '../../environments/environments';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  // Modern Angular 20 dependency injection
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  /**
   * Get map tiles using httpResource pattern (modern approach)
   * @param style - Map style name (e.g., 'outdoor', 'street')
   * @returns Resource containing map style configuration
   */
  getMapTilesResource(style: string) {
    return resource({
      loader: () => {
        if (environment.production && environment.useConfigService) {
          // Use ConfigService for production
          return firstValueFrom(
            this.configService
              .loadConfig()
              .pipe(switchMap((config) => this.http.get(`${config.mapTileProxyBaseUrl}/${style}/style.json`))),
          );
        } else {
          // Use environment directly for development
          return firstValueFrom(this.http.get(`${environment.mapTileProxyBaseUrl}/${style}/style.json`));
        }
      },
    });
  }

  /**
   * Get map tiles (legacy Observable approach for backward compatibility)
   * @deprecated Use getMapTilesResource() instead
   */
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
