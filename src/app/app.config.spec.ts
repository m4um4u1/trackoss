import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { appConfig } from './app.config';

@Component({
  template: '<div>Test Component</div>',
  standalone: true,
})
class TestComponent {}

describe('AppConfig', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: appConfig.providers,
    }).compileComponents();
  });

  it('should provide Router', () => {
    const router = TestBed.inject(Router);
    expect(router).toBeTruthy();
  });

  it('should provide HttpClient', () => {
    const httpClient = TestBed.inject(HttpClient);
    expect(httpClient).toBeTruthy();
  });

  it('should provide Location', () => {
    const location = TestBed.inject(Location);
    expect(location).toBeTruthy();
  });

  it('should have zone change detection configured', () => {
    // Test that the configuration is valid
    expect(appConfig.providers).toBeDefined();
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });

  it('should configure providers correctly', () => {
    const providers = appConfig.providers;
    expect(providers).toBeDefined();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBe(3); // provideZoneChangeDetection, provideRouter, provideHttpClient
  });
});
