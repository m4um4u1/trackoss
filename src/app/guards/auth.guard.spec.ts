import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: jest.Mocked<AuthService>;
  let router: jest.Mocked<Router>;
  let mockActivatedRouteSnapshot: ActivatedRouteSnapshot;
  let mockRouterStateSnapshot: RouterStateSnapshot;

  beforeEach(() => {
    const authServiceSpy = {
      isAuthenticated: jest.fn(),
    };

    const routerSpy = {
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;

    mockActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
    mockRouterStateSnapshot = { url: '/protected-route' } as RouterStateSnapshot;
  });

  it('should allow access when user is authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect to login when user is not authenticated', () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected-route' },
    });
  });

  it('should include the current URL as returnUrl when redirecting', () => {
    authService.isAuthenticated.mockReturnValue(false);
    const customUrl = '/routes/123/edit';
    const customRouterState = { url: customUrl } as RouterStateSnapshot;

    TestBed.runInInjectionContext(() => authGuard(mockActivatedRouteSnapshot, customRouterState));

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: customUrl },
    });
  });

  it('should handle root URL redirect', () => {
    authService.isAuthenticated.mockReturnValue(false);
    const rootRouterState = { url: '/' } as RouterStateSnapshot;

    TestBed.runInInjectionContext(() => authGuard(mockActivatedRouteSnapshot, rootRouterState));

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/' },
    });
  });

  it('should handle complex URLs with query parameters', () => {
    authService.isAuthenticated.mockReturnValue(false);
    const complexUrl = '/routes?filter=cycling&sort=date';
    const complexRouterState = { url: complexUrl } as RouterStateSnapshot;

    TestBed.runInInjectionContext(() => authGuard(mockActivatedRouteSnapshot, complexRouterState));

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: complexUrl },
    });
  });
});
