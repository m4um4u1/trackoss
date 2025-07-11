import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { MapPageComponent } from './pages/map-page/map-page.component';

@Component({
  template: '<router-outlet></router-outlet>',
  standalone: true,
  imports: [],
})
class TestHostComponent {}

describe('AppRoutes', () => {
  let router: Router;
  let location: Location;
  let fixture: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: 'routes', useValue: routes }],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('should have correct route configuration', () => {
    expect(routes).toBeDefined();
    expect(routes.length).toBe(2);
  });

  it('should have default redirect route', () => {
    const defaultRoute = routes.find((route) => route.path === '');
    expect(defaultRoute).toBeDefined();
    expect(defaultRoute?.redirectTo).toBe('/map');
    expect(defaultRoute?.pathMatch).toBe('full');
  });

  it('should have map route', () => {
    const mapRoute = routes.find((route) => route.path === 'map');
    expect(mapRoute).toBeDefined();
    expect(mapRoute?.component).toBe(MapPageComponent);
  });

  it('should redirect empty path to map', () => {
    const defaultRoute = routes[0];
    expect(defaultRoute.path).toBe('');
    expect(defaultRoute.redirectTo).toBe('/map');
    expect(defaultRoute.pathMatch).toBe('full');
  });

  it('should have map component for map path', () => {
    const mapRoute = routes[1];
    expect(mapRoute.path).toBe('map');
    expect(mapRoute.component).toBe(MapPageComponent);
  });

  it('should not have any undefined routes', () => {
    routes.forEach((route) => {
      expect(route).toBeDefined();
      expect(route.path).toBeDefined();

      if (route.redirectTo) {
        expect(route.redirectTo).toBeDefined();
        expect(route.pathMatch).toBeDefined();
      }

      if (route.component) {
        expect(route.component).toBeDefined();
      }
    });
  });

  it('should have valid route structure', () => {
    routes.forEach((route) => {
      expect(typeof route.path).toBe('string');

      if (route.redirectTo) {
        expect(typeof route.redirectTo).toBe('string');
        expect(typeof route.pathMatch).toBe('string');
      }
    });
  });

  it('should not have duplicate paths', () => {
    const paths = routes.map((route) => route.path);
    const uniquePaths = [...new Set(paths)];
    expect(paths.length).toBe(uniquePaths.length);
  });

  it('should have all required route properties', () => {
    const defaultRoute = routes[0];
    expect(defaultRoute.path).toBeDefined();
    expect(defaultRoute.redirectTo).toBeDefined();
    expect(defaultRoute.pathMatch).toBeDefined();

    const mapRoute = routes[1];
    expect(mapRoute.path).toBeDefined();
    expect(mapRoute.component).toBeDefined();
  });
});
