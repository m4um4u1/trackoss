import { TestBed } from '@angular/core/testing';
import { GeolocationService } from './geolocation.service';

describe('GeolocationService', () => {
  let service: GeolocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeolocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check if geolocation is supported', () => {
    const isSupported = service.isGeolocationSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should handle geolocation not supported', (done) => {
    // Mock navigator.geolocation to be undefined
    const originalGeolocation = navigator.geolocation;
    (navigator as any).geolocation = undefined;

    service.getCurrentPosition().subscribe({
      next: () => {
        fail('Should not emit when geolocation is not supported');
      },
      complete: () => {
        // Restore original geolocation
        (navigator as any).geolocation = originalGeolocation;
        done();
      }
    });
  });
});
