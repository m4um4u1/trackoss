import { Routes } from '@angular/router';
import { MapPageComponent } from './pages/map-page/map-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '/map', pathMatch: 'full' },
  { path: 'map', component: MapPageComponent },
];
