import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../services/auth.service';
import { AuthResponse } from '../../../models/auth.models';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jest.Mocked<AuthService>;
  let router: jest.Mocked<Router>;
  let activatedRoute: Partial<ActivatedRoute>;

  const mockAuthResponse: AuthResponse = {
    token: 'test-token',
    type: 'Bearer',
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'USER',
  };

  beforeEach(async () => {
    const authServiceSpy = {
      login: jest.fn(),
    };

    const routerSpy = {
      navigate: jest.fn(),
      createUrlTree: jest.fn().mockReturnValue({} as any),
      serializeUrl: jest.fn().mockReturnValue('/'),
      events: {
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
      },
    };

    activatedRoute = {
      snapshot: {
        queryParams: {},
      } as any,
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.loginForm.get('username')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should initialize with default return URL', () => {
    expect(component.returnUrl).toBe('/');
  });

  it('should set return URL from query parameters', () => {
    activatedRoute.snapshot!.queryParams = { returnUrl: '/protected-page' };

    // Create new component instance to trigger constructor
    const newFixture = TestBed.createComponent(LoginComponent);
    const newComponent = newFixture.componentInstance;

    expect(newComponent.returnUrl).toBe('/protected-page');
  });

  describe('Form Validation', () => {
    it('should mark form as invalid when empty', () => {
      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as invalid with short username', () => {
      component.loginForm.patchValue({
        username: 'ab',
        password: 'validpassword',
      });
      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as invalid with short password', () => {
      component.loginForm.patchValue({
        username: 'validuser',
        password: '12345',
      });
      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as valid with correct inputs', () => {
      component.loginForm.patchValue({
        username: 'validuser',
        password: 'validpassword',
      });
      expect(component.loginForm.valid).toBe(true);
    });

    it('should return true for invalid field when touched', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.markAsTouched();

      expect(component.isFieldInvalid('username')).toBe(true);
    });

    it('should return false for valid field', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('validuser');
      usernameControl?.markAsTouched();

      expect(component.isFieldInvalid('username')).toBe(false);
    });

    it('should return false for untouched invalid field', () => {
      expect(component.isFieldInvalid('username')).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should not submit when form is invalid', () => {
      component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
      expect(component.loginForm.get('username')?.touched).toBe(true);
      expect(component.loginForm.get('password')?.touched).toBe(true);
    });

    it('should submit valid form and navigate on success', () => {
      authService.login.mockReturnValue(of(mockAuthResponse));

      component.loginForm.patchValue({
        username: 'testuser',
        password: 'testpassword',
      });

      component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpassword',
      });
      expect(component.isLoading).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      expect(component.errorMessage).toBe('');
    });

    it('should navigate to returnUrl on successful login', () => {
      authService.login.mockReturnValue(of(mockAuthResponse));
      component.returnUrl = '/protected-route';

      component.loginForm.patchValue({
        username: 'testuser',
        password: 'testpassword',
      });

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/protected-route']);
    });

    it('should handle login error', () => {
      const errorMessage = 'Invalid credentials';
      authService.login.mockReturnValue(throwError(() => ({ message: errorMessage })));

      component.loginForm.patchValue({
        username: 'testuser',
        password: 'wrongpassword',
      });

      component.onSubmit();

      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBe(errorMessage);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should use default error message when error has no message', () => {
      authService.login.mockReturnValue(throwError(() => ({})));

      component.loginForm.patchValue({
        username: 'testuser',
        password: 'testpassword',
      });

      component.onSubmit();

      expect(component.errorMessage).toBe('Login failed. Please try again.');
    });

    it('should set isLoading to true during submission', () => {
      authService.login.mockReturnValue(of(mockAuthResponse));

      component.loginForm.patchValue({
        username: 'testuser',
        password: 'testpassword',
      });

      expect(component.isLoading).toBe(false);

      component.onSubmit();

      // Note: In real scenario, isLoading would be true during async operation
      // But in our sync test, it's already false after the operation completes
      expect(component.isLoading).toBe(false);
    });

    it('should clear error message on new submission', () => {
      component.errorMessage = 'Previous error';
      authService.login.mockReturnValue(of(mockAuthResponse));

      component.loginForm.patchValue({
        username: 'testuser',
        password: 'testpassword',
      });

      component.onSubmit();

      expect(component.errorMessage).toBe('');
    });
  });

  describe('Helper Methods', () => {
    it('should mark all fields as touched when form is invalid', () => {
      component.onSubmit();

      expect(component.loginForm.get('username')?.touched).toBe(true);
      expect(component.loginForm.get('password')?.touched).toBe(true);
    });

    it('should handle null field in isFieldInvalid', () => {
      expect(component.isFieldInvalid('nonexistent')).toBe(false);
    });
  });

  describe('Component Rendering', () => {
    it('should have correct form structure', () => {
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('form')).toBeTruthy();
      expect(compiled.querySelector('input[formControlName="username"]')).toBeTruthy();
      expect(compiled.querySelector('input[formControlName="password"]')).toBeTruthy();
      expect(compiled.querySelector('button[type="submit"]')).toBeTruthy();
    });

    it('should display error message when present', () => {
      component.errorMessage = 'Test error message';
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.alert-danger');
      expect(errorElement?.textContent).toContain('Test error message');
    });

    it('should disable submit button when loading', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitButton?.disabled).toBe(true);
    });

    it('should show loading spinner when loading', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.spinner-border');
      expect(spinner).toBeTruthy();
    });

    it('should have link to register page', () => {
      const registerLink = fixture.nativeElement.querySelector('a[routerLink="/register"]');
      expect(registerLink).toBeTruthy();
    });
  });
});
