import { routes } from './app.routes';
import { MapPageComponent } from './pages/map-page/map-page.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { RoutesPageComponent } from './pages/routes-page/routes-page.component';

describe('AppRoutes', () => {
  it('should have correct route configuration', () => {
    expect(routes).toBeDefined();
    console.log('Routes:', routes);
    console.log('Routes length:', routes.length);
    expect(routes.length).toBe(6);
  });

  it('should have map as default route', () => {
    const defaultRoute = routes.find((route) => route.path === 'map');
    expect(defaultRoute).toBeDefined();
    expect(defaultRoute?.component).toBe(MapPageComponent);
  });

  it('should redirect root to /map', () => {
    const mapRoute = routes.find((route) => route.path === '');
    expect(mapRoute).toBeDefined();
    expect(mapRoute?.redirectTo).toBe('map');
    expect(mapRoute?.pathMatch).toBe('full');
  });

  it('should have login route', () => {
    const loginRoute = routes.find((route) => route.path === 'login');
    expect(loginRoute).toBeDefined();
    expect(loginRoute?.component).toBe(LoginComponent);
  });

  it('should have register route', () => {
    const registerRoute = routes.find((route) => route.path === 'register');
    expect(registerRoute).toBeDefined();
    expect(registerRoute?.component).toBe(RegisterComponent);
  });

  it('should have routes page route', () => {
    const routesRoute = routes.find((route) => route.path === 'routes');
    expect(routesRoute).toBeDefined();
    expect(routesRoute?.component).toBe(RoutesPageComponent);
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

  it('should have wildcard route redirecting to root', () => {
    const wildcardRoute = routes.find((route) => route.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute?.redirectTo).toBe('/map');
    expect(wildcardRoute?.pathMatch).toBe('full');
  });
});
