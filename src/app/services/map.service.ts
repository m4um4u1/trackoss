import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';

import { BackendApiService } from './backend-api.service';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private readonly http = inject(HttpClient);
  private readonly backendApiService = inject(BackendApiService);

  getMapTiles(style: string): Observable<any> {
    // Use BackendApiService to get the map proxy URL
    return this.backendApiService
      .getMapProxyUrl()
      .pipe(switchMap((mapProxyUrl) => this.http.get(`${mapProxyUrl}/${style}/style.json`)));
  }
}
