import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environments';
import { ConfigService } from './config.service';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly configService = inject(ConfigService);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  constructor() {
    // Check if user is already logged in on service initialization
    this.loadStoredAuth();
  }

  /**
   * Login user
   */
  login(loginRequest: LoginRequest): Observable<AuthResponse> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/auth/login`;
        return this.http.post<AuthResponse>(url, loginRequest);
      }),
      tap((response) => {
        this.setSession(response);
      }),
      catchError((error) => {
        console.error('Login error:', error);
        throw this.handleAuthError(error);
      }),
    );
  }

  /**
   * Register new user
   */
  register(registerRequest: RegisterRequest): Observable<AuthResponse> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/auth/register`;
        return this.http.post<AuthResponse>(url, registerRequest);
      }),
      tap((response) => {
        this.setSession(response);
      }),
      catchError((error) => {
        console.error('Registration error:', error);
        throw this.handleAuthError(error);
      }),
    );
  }

  /**
   * Get current user information
   */
  getCurrentUser(): Observable<User> {
    return this.getBackendBaseUrl().pipe(
      switchMap((baseUrl) => {
        const url = `${baseUrl}/api/auth/me`;
        return this.http.get<User>(url);
      }),
      tap((user) => {
        this.currentUserSubject.next(user);
        this.storeUser(user);
      }),
      catchError((error) => {
        console.error('Get current user error:', error);
        this.logout();
        throw this.handleAuthError(error);
      }),
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired(token);
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get current user value
   */
  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Set user session
   */
  private setSession(authResponse: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authResponse.token);

    const user: User = {
      id: authResponse.id,
      username: authResponse.username,
      email: authResponse.email,
      role: authResponse.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.storeUser(user);
    this.currentUserSubject.next(user);
  }

  /**
   * Store user information
   */
  private storeUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Load stored authentication information
   */
  private loadStoredAuth(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr && !this.isTokenExpired(token)) {
      try {
        const user: User = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.logout();
      }
    } else {
      // Clear invalid stored data
      if (token || userStr) {
        this.logout();
      }
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      // Decode URL-safe base64 (handles '-' and '_' characters)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get backend base URL
   */
  private getBackendBaseUrl(): Observable<string> {
    if (environment.production && environment.useConfigService) {
      return this.configService.loadConfig().pipe(map((config) => config.baseUrl));
    } else {
      return of(environment.baseUrl);
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): Error {
    let message = 'An authentication error occurred';

    if (error.error) {
      if (typeof error.error === 'string') {
        message = error.error;
      } else if (error.error.message) {
        message = error.error.message;
      }
    } else if (error.message) {
      message = error.message;
    }

    return new Error(message);
  }
}
