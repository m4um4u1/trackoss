import { Routes } from '@angular/router';
import { MapPageComponent } from './pages/map-page/map-page.component';
import { RoutesPageComponent } from './pages/routes-page/routes-page.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';

export const routes: Routes = [
  { path: 'map', component: MapPageComponent }, // Go directly to map - open source approach
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '', redirectTo: 'map', pathMatch: 'full' }, // Redirect /map to root
  { path: 'routes', component: RoutesPageComponent },
  { path: '**', redirectTo: '/map', pathMatch: 'full' }, // Wildcard route goes to map
];
