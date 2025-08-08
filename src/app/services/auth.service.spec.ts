import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from './auth.service';
import { ConfigService } from './config.service';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/auth.models';
import { environment } from '../../environments/environments';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jest.Mocked<Router>;
  let configService: jest.Mocked<ConfigService>;
  let originalConsoleError: jest.SpyInstance;

  const mockLoginRequest: LoginRequest = {
    username: 'testuser',
    password: 'testpassword123',
  };

  const mockRegisterRequest: RegisterRequest = {
    username: 'newuser',
    email: 'newuser@example.com',
    password: 'newpassword123',
  };

  const mockAuthResponse: AuthResponse = {
    token: 'mock-jwt-token-not-real',
    type: 'Bearer',
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'USER',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Mock console.error once
    originalConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const routerSpy = {
      navigate: jest.fn(),
    };

    const configServiceSpy = {
      loadConfig: jest.fn().mockReturnValue(
        of({
          baseUrl: 'http://test-backend.com',
          valhallaUrl: 'http://test-valhalla.com',
        }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: ConfigService, useValue: configServiceSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    configService = TestBed.inject(ConfigService) as jest.Mocked<ConfigService>;

    // Clear localStorage before each test
    localStorage.clear();

    // Mock environment
    (environment as any).production = false;
    (environment as any).useConfigService = false;
    (environment as any).baseUrl = 'http://localhost:8080';
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    // Restore console.error after each test
    originalConsoleError.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login successfully and store token', () => {
      service.login(mockLoginRequest).subscribe((response) => {
        expect(response).toEqual(mockAuthResponse);
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLoginRequest);
      req.flush(mockAuthResponse);

      // Check that token and user are stored
      expect(localStorage.getItem('auth_token')).toBe(mockAuthResponse.token);
      expect(localStorage.getItem('auth_user')).toBeTruthy();

      // Check that current user is set
      service.currentUser$.subscribe((user) => {
        expect(user).toBeTruthy();
        expect(user?.username).toBe(mockAuthResponse.username);
      });
    });

    it('should handle login error', () => {
      const errorMessage = 'Invalid credentials';

      service.login(mockLoginRequest).subscribe({
        error: (error) => {
          expect(error.message).toContain(errorMessage);
        },
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
      req.flush({ message: errorMessage }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should use config service in production', () => {
      (environment as any).production = true;
      (environment as any).useConfigService = true;

      service.login(mockLoginRequest).subscribe();

      expect(configService.loadConfig).toHaveBeenCalled();
      const req = httpMock.expectOne('http://test-backend.com/api/auth/login');
      req.flush(mockAuthResponse);
    });
  });

  describe('register', () => {
    it('should register successfully and store token', () => {
      service.register(mockRegisterRequest).subscribe((response) => {
        expect(response).toEqual(mockAuthResponse);
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockRegisterRequest);
      req.flush(mockAuthResponse);

      // Check that token and user are stored
      expect(localStorage.getItem('auth_token')).toBe(mockAuthResponse.token);
      expect(localStorage.getItem('auth_user')).toBeTruthy();
    });

    it('should handle registration error', () => {
      const errorMessage = 'Username already exists';

      service.register(mockRegisterRequest).subscribe({
        error: (error) => {
          expect(error.message).toContain(errorMessage);
        },
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/register');
      req.flush({ message: errorMessage }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', () => {
      service.getCurrentUser().subscribe((user) => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/me');
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);

      // Check that user is stored and subject is updated
      expect(localStorage.getItem('auth_user')).toBeTruthy();
      service.currentUser$.subscribe((user) => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should logout on getCurrentUser error', () => {
      service.getCurrentUser().subscribe({
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/me');
      req.flush({}, { status: 401, statusText: 'Unauthorized' });

      // Check that logout was called
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear storage and navigate to login', () => {
      // Set up some stored data
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      service.logout();

      // Check that storage is cleared
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();

      // Check that user subject is cleared
      expect(service.getCurrentUserValue()).toBeNull();

      // Check navigation
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for valid token', () => {
      // Create a valid token (expires in future)
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { exp: futureExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      localStorage.setItem('auth_token', token);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false for expired token', () => {
      // Create an expired token
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { exp: pastExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      localStorage.setItem('auth_token', token);

      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return false for no token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return false for invalid token format', () => {
      localStorage.setItem('auth_token', 'invalid-token');
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return stored token', () => {
      const testToken = 'test-token-123';
      localStorage.setItem('auth_token', testToken);

      expect(service.getToken()).toBe(testToken);
    });

    it('should return null when no token', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('getCurrentUserValue', () => {
    it('should return current user value', () => {
      // Login first to set user
      service.login(mockLoginRequest).subscribe();
      const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
      req.flush(mockAuthResponse);

      const user = service.getCurrentUserValue();
      expect(user).toBeTruthy();
      expect(user?.username).toBe(mockAuthResponse.username);
    });

    it('should return null when no user', () => {
      expect(service.getCurrentUserValue()).toBeNull();
    });
  });

  describe('loadStoredAuth', () => {
    it('should load valid stored auth on initialization', () => {
      // Create a valid token and user
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = { exp: futureExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Reset TestBed and create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          AuthService,
          ConfigService,
          { provide: Router, useValue: { navigate: jest.fn() } },
        ],
      });
      const newService = TestBed.inject(AuthService);

      expect(newService.getCurrentUserValue()).toEqual(mockUser);
    });

    it('should clear invalid stored auth on initialization', () => {
      // Create an expired token
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const payload = { exp: pastExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Reset TestBed and create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          AuthService,
          ConfigService,
          { provide: Router, useValue: { navigate: jest.fn() } },
        ],
      });
      const newService = TestBed.inject(AuthService);

      expect(newService.getCurrentUserValue()).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should handle corrupted stored user data', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = { exp: futureExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', 'invalid-json');

      // Reset TestBed and create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          AuthService,
          ConfigService,
          { provide: Router, useValue: { navigate: jest.fn() } },
        ],
      });
      const newService = TestBed.inject(AuthService);

      expect(newService.getCurrentUserValue()).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle auth error with error message string', () => {
      const errorMessage = 'Custom error message';
      service.login(mockLoginRequest).subscribe({
        error: (error) => {
          expect(error.message).toBe(errorMessage);
        },
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
      req.flush(errorMessage, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle auth error with error object', () => {
      const errorObj = { message: 'Error from server' };
      service.login(mockLoginRequest).subscribe({
        error: (error) => {
          expect(error.message).toBe(errorObj.message);
        },
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
      req.flush(errorObj, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle auth error with field errors', () => {
      const fieldErrors = {
        username: 'Username is required',
        password: 'Password must be at least 6 characters',
      };
      service.login(mockLoginRequest).subscribe({
        error: (error) => {
          expect(error.message).toContain('Username is required');
          expect(error.message).toContain('Password must be at least 6 characters');
        },
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
      req.flush(fieldErrors, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle network error', () => {
      service.login(mockLoginRequest).subscribe({
        error: (error) => {
          expect(error.message).toContain('Network error');
        },
      });

      const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });
    });
  });
});
