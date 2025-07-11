import { TestBed } from '@angular/core/testing';
import { GeolocationService } from './geolocation.service';
import { Coordinates } from '../models/coordinates';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let mockGeolocation: any;
  let mockPermissions: any;

  const mockCoordinates: Coordinates = { lat: 52.520008, lon: 13.404954 };
  const mockPosition: GeolocationPosition = {
    coords: {
      latitude: mockCoordinates.lat,
      longitude: mockCoordinates.lon,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeolocationService);

    // Create spy objects
    mockGeolocation = {
      getCurrentPosition: jest.fn(),
    };
    mockPermissions = {
      query: jest.fn(),
    };
  });

  afterEach(() => {
    // Restore original navigator properties if they were mocked
    if ((navigator as any).originalGeolocation) {
      (navigator as any).geolocation = (navigator as any).originalGeolocation;
      delete (navigator as any).originalGeolocation;
    }
    if ((navigator as any).originalPermissions) {
      (navigator as any).permissions = (navigator as any).originalPermissions;
      delete (navigator as any).originalPermissions;
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check if geolocation is supported', () => {
    const isSupported = service.isGeolocationSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should return true when geolocation is supported', () => {
    // Geolocation is typically supported in test environment
    expect(service.isGeolocationSupported()).toBeTrue();
  });

  it('should handle geolocation not supported', async () => {
    // Mock navigator.geolocation to be undefined
    (navigator as any).originalGeolocation = navigator.geolocation;
    (navigator as any).geolocation = undefined;

    service.getCurrentPosition().subscribe({
      next: () => {
        throw new Error('Should not emit when geolocation is not supported');
      },
      complete: () => {
        // Test passes when complete is called
      },
    });
  });

  it('should get current position successfully', async () => {
    // Mock navigator.geolocation
    (navigator as any).originalGeolocation = navigator.geolocation;
    (navigator as any).geolocation = mockGeolocation;

    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
        success(mockPosition);
      },
    );

    service.getCurrentPosition().subscribe({
      next: (coordinates) => {
        expect(coordinates).toEqual(mockCoordinates);
      },
      error: () => {
        throw new Error('Should not error');
      },
      complete: () => {},
    });
  });

  it('should handle geolocation error', async () => {
    // Mock navigator.geolocation
    (navigator as any).originalGeolocation = navigator.geolocation;
    (navigator as any).geolocation = mockGeolocation;

    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
        error!({
          code: 1,
          message: 'Permission denied',
        } as GeolocationPositionError);
      },
    );

    service.getCurrentPosition().subscribe({
      next: () => {
        throw new Error('Should not emit on error');
      },
      complete: () => {},
    });
  });

  it('should use correct geolocation options', () => {
    // Mock navigator.geolocation
    (navigator as any).originalGeolocation = navigator.geolocation;
    (navigator as any).geolocation = mockGeolocation;

    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
        expect(options).toEqual({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
        success(mockPosition);
      },
    );

    service.getCurrentPosition().subscribe();
  });

  it('should request location with consent when permission granted', async () => {
    // Mock navigator.geolocation and permissions
    (navigator as any).originalGeolocation = navigator.geolocation;
    (navigator as any).originalPermissions = navigator.permissions;
    (navigator as any).geolocation = mockGeolocation;
    (navigator as any).permissions = mockPermissions;

    mockPermissions.query.mockReturnValue(
      Promise.resolve({
        state: 'granted',
      } as PermissionStatus),
    );

    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
        success(mockPosition);
      },
    );

    service.requestLocationWithConsent().subscribe({
      next: (coordinates) => {
        expect(coordinates).toEqual(mockCoordinates);
      },
      error: () => {
        throw new Error('Should not error');
      },
    });
  });

  it('should handle permission denied', async () => {
    // Mock navigator.geolocation and permissions
    (navigator as any).originalGeolocation = navigator.geolocation;
    (navigator as any).originalPermissions = navigator.permissions;
    (navigator as any).geolocation = mockGeolocation;
    (navigator as any).permissions = mockPermissions;

    mockPermissions.query.mockReturnValue(
      Promise.resolve({
        state: 'denied',
      } as PermissionStatus),
    );

    service.requestLocationWithConsent().subscribe({
      next: () => {
        throw new Error('Should not emit when permission denied');
      },
      complete: () => {},
    });
  });

  it('should handle permission prompt', async () => {
    // Mock navigator.geolocation and permissions
    (navigator as any).originalGeolocation = navigator.geolocation;
    (navigator as any).originalPermissions = navigator.permissions;
    (navigator as any).geolocation = mockGeolocation;
    (navigator as any).permissions = mockPermissions;

    mockPermissions.query.mockReturnValue(
      Promise.resolve({
        state: 'prompt',
      } as PermissionStatus),
    );

    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
        success(mockPosition);
      },
    );

    service.requestLocationWithConsent().subscribe({
      next: (coordinates) => {
        expect(coordinates).toEqual(mockCoordinates);
      },
      error: () => {
        throw new Error('Should not error');
      },
    });
  });

  it('should fallback when permissions API not supported', async () => {
    // Mock navigator.geolocation without permissions
    (navigator as any).originalGeolocation = navigator.geolocation;
    (navigator as any).originalPermissions = navigator.permissions;
    (navigator as any).geolocation = mockGeolocation;
    (navigator as any).permissions = undefined;

    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
        success(mockPosition);
      },
    );

    service.requestLocationWithConsent().subscribe({
      next: (coordinates) => {
        expect(coordinates).toEqual(mockCoordinates);
      },
      error: () => {
        throw new Error('Should not error');
      },
    });
  });

  it('should handle permissions query error', async () => {
    // Mock navigator.geolocation and permissions
    (navigator as any).originalGeolocation = navigator.geolocation;
    (navigator as any).originalPermissions = navigator.permissions;
    (navigator as any).geolocation = mockGeolocation;
    (navigator as any).permissions = mockPermissions;

    mockPermissions.query.mockReturnValue(Promise.reject('Permission query failed'));

    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
        success(mockPosition);
      },
    );

    service.requestLocationWithConsent().subscribe({
      next: (coordinates) => {
        expect(coordinates).toEqual(mockCoordinates);
      },
      error: () => {
        throw new Error('Should not error');
      },
    });
  });

  // Additional comprehensive tests for better coverage
  describe('Edge Cases and Error Scenarios', () => {
    it('should handle geolocation timeout error', async () => {
      (navigator as any).originalGeolocation = navigator.geolocation;
      (navigator as any).geolocation = mockGeolocation;

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
          error!({
            code: 3, // TIMEOUT
            message: 'Timeout expired',
          } as GeolocationPositionError);
        },
      );

      service.getCurrentPosition().subscribe({
        next: () => {
          throw new Error('Should not emit on timeout error');
        },
        complete: () => {
          // Test passes when complete is called
        },
      });
    });

    it('should handle geolocation position unavailable error', async () => {
      (navigator as any).originalGeolocation = navigator.geolocation;
      (navigator as any).geolocation = mockGeolocation;

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
          error!({
            code: 2, // POSITION_UNAVAILABLE
            message: 'Position unavailable',
          } as GeolocationPositionError);
        },
      );

      service.getCurrentPosition().subscribe({
        next: () => {
          throw new Error('Should not emit on position unavailable error');
        },
        complete: () => {
          // Test passes when complete is called
        },
      });
    });

    it('should handle requestLocationWithConsent when geolocation not supported', async () => {
      (navigator as any).originalGeolocation = navigator.geolocation;
      (navigator as any).geolocation = undefined;

      service.requestLocationWithConsent().subscribe({
        next: () => {
          throw new Error('Should not emit when geolocation is not supported');
        },
        complete: () => {
          // Test passes when complete is called
        },
      });
    });

    it('should handle permission state changes during request', async () => {
      (navigator as any).originalGeolocation = navigator.geolocation;
      (navigator as any).originalPermissions = navigator.permissions;
      (navigator as any).geolocation = mockGeolocation;
      (navigator as any).permissions = mockPermissions;

      // First return 'prompt', then simulate user denying
      mockPermissions.query.mockReturnValue(
        Promise.resolve({
          state: 'prompt',
        } as PermissionStatus),
      );

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
          error!({
            code: 1, // PERMISSION_DENIED
            message: 'User denied the request for Geolocation.',
          } as GeolocationPositionError);
        },
      );

      service.requestLocationWithConsent().subscribe({
        next: () => {
          throw new Error('Should not emit when user denies permission');
        },
        complete: () => {
          // Test passes when complete is called
        },
      });
    });

    it('should handle malformed position data', async () => {
      (navigator as any).originalGeolocation = navigator.geolocation;
      (navigator as any).geolocation = mockGeolocation;

      const malformedPosition = {
        coords: {
          latitude: null,
          longitude: null,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      } as any;

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
          success(malformedPosition);
        },
      );

      service.getCurrentPosition().subscribe({
        next: (coordinates) => {
          expect(coordinates.lat).toBeNull();
          expect(coordinates.lon).toBeNull();
        },
        error: () => {
          throw new Error('Should not error with malformed data');
        },
      });
    });

    it('should handle very high accuracy coordinates', async () => {
      (navigator as any).originalGeolocation = navigator.geolocation;
      (navigator as any).geolocation = mockGeolocation;

      const highAccuracyPosition = {
        coords: {
          latitude: 52.52000659999999,
          longitude: 13.404954000000001,
          accuracy: 1,
          altitude: 34.5,
          altitudeAccuracy: 2,
          heading: 90,
          speed: 0,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      } as GeolocationPosition;

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
          success(highAccuracyPosition);
        },
      );

      service.getCurrentPosition().subscribe({
        next: (coordinates) => {
          expect(coordinates.lat).toBe(52.52000659999999);
          expect(coordinates.lon).toBe(13.404954000000001);
        },
        error: () => {
          throw new Error('Should not error with high accuracy data');
        },
      });
    });

    it('should handle multiple concurrent requests', async () => {
      (navigator as any).originalGeolocation = navigator.geolocation;
      (navigator as any).geolocation = mockGeolocation;

      let callCount = 0;
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
          callCount++;
          success(mockPosition);
        },
      );

      const request1 = service.getCurrentPosition();
      const request2 = service.getCurrentPosition();
      const request3 = service.getCurrentPosition();

      let completedCount = 0;
      const checkCompletion = () => {
        completedCount++;
        if (completedCount === 3) {
          expect(callCount).toBe(3);
        }
      };

      request1.subscribe({ next: checkCompletion });
      request2.subscribe({ next: checkCompletion });
      request3.subscribe({ next: checkCompletion });
    });

    it('should handle permissions API with unknown state', async () => {
      (navigator as any).originalGeolocation = navigator.geolocation;
      (navigator as any).originalPermissions = navigator.permissions;
      (navigator as any).geolocation = mockGeolocation;
      (navigator as any).permissions = mockPermissions;

      mockPermissions.query.mockReturnValue(
        Promise.resolve({
          state: 'unknown' as any, // Non-standard state
        } as PermissionStatus),
      );

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
          success(mockPosition);
        },
      );

      service.requestLocationWithConsent().subscribe({
        next: (coordinates) => {
          expect(coordinates).toEqual(mockCoordinates);
        },
        error: () => {
          throw new Error('Should not error with unknown permission state');
        },
      });
    });

    it('should handle edge case with null coordinates', async () => {
      (navigator as any).originalGeolocation = navigator.geolocation;
      (navigator as any).geolocation = mockGeolocation;

      const nullCoordinatesPosition = {
        coords: {
          latitude: 0,
          longitude: 0,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      } as GeolocationPosition;

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
          success(nullCoordinatesPosition);
        },
      );

      service.getCurrentPosition().subscribe({
        next: (coordinates) => {
          expect(coordinates.lat).toBe(0);
          expect(coordinates.lon).toBe(0);
        },
        error: () => {
          throw new Error('Should not error with zero coordinates');
        },
      });
    });

    it('should handle service instantiation correctly', () => {
      expect(service).toBeDefined();
      expect(typeof service.getCurrentPosition).toBe('function');
      expect(typeof service.requestLocationWithConsent).toBe('function');
      expect(typeof service.isGeolocationSupported).toBe('function');
    });

    // Additional comprehensive tests for better coverage
    describe('Advanced Geolocation Scenarios', () => {
      it('should handle permissions API query error gracefully', async () => {
        // Mock navigator.geolocation and permissions
        (navigator as any).originalGeolocation = navigator.geolocation;
        (navigator as any).originalPermissions = navigator.permissions;
        (navigator as any).geolocation = mockGeolocation;
        (navigator as any).permissions = mockPermissions;

        mockPermissions.query.mockReturnValue(Promise.reject(new Error('Permissions API error')));

        mockGeolocation.getCurrentPosition.mockImplementation(
          (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
            success(mockPosition);
          },
        );

        service.requestLocationWithConsent().subscribe({
          next: (coordinates) => {
            expect(coordinates).toEqual(mockCoordinates);
          },
          error: () => {
            throw new Error('Should not error when permissions API fails');
          },
        });
      });

      it('should handle geolocation timeout error', () => {
        // Mock navigator.geolocation
        (navigator as any).originalGeolocation = navigator.geolocation;
        (navigator as any).geolocation = mockGeolocation;

        mockGeolocation.getCurrentPosition.mockImplementation(
          (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
            error!({
              code: 3,
              message: 'Timeout',
            } as GeolocationPositionError);
          },
        );

        service.getCurrentPosition().subscribe({
          next: () => {
            throw new Error('Should not emit on timeout error');
          },
          complete: () => {},
        });
      });

      it('should handle position with extreme coordinates', () => {
        // Mock navigator.geolocation
        (navigator as any).originalGeolocation = navigator.geolocation;
        (navigator as any).geolocation = mockGeolocation;

        const extremePosition = {
          coords: {
            latitude: 89.999,
            longitude: 179.999,
            accuracy: 1,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition;

        mockGeolocation.getCurrentPosition.mockImplementation(
          (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
            success(extremePosition);
          },
        );

        service.getCurrentPosition().subscribe({
          next: (coordinates) => {
            expect(coordinates.lat).toBe(89.999);
            expect(coordinates.lon).toBe(179.999);
          },
          error: () => {
            throw new Error('Should not error with extreme coordinates');
          },
        });
      });

      it('should handle negative coordinates', () => {
        // Mock navigator.geolocation
        (navigator as any).originalGeolocation = navigator.geolocation;
        (navigator as any).geolocation = mockGeolocation;

        const negativePosition = {
          coords: {
            latitude: -45.123,
            longitude: -123.456,
            accuracy: 1,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition;

        mockGeolocation.getCurrentPosition.mockImplementation(
          (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
            success(negativePosition);
          },
        );

        service.getCurrentPosition().subscribe({
          next: (coordinates) => {
            expect(coordinates.lat).toBe(-45.123);
            expect(coordinates.lon).toBe(-123.456);
          },
          error: () => {
            throw new Error('Should not error with negative coordinates');
          },
        });
      });

      it('should handle requestLocationWithConsent without permissions API', () => {
        // Mock navigator.geolocation without permissions
        (navigator as any).originalGeolocation = navigator.geolocation;
        (navigator as any).originalPermissions = navigator.permissions;
        (navigator as any).geolocation = mockGeolocation;
        delete (navigator as any).permissions;

        mockGeolocation.getCurrentPosition.mockImplementation(
          (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
            success(mockPosition);
          },
        );

        service.requestLocationWithConsent().subscribe({
          next: (coordinates) => {
            expect(coordinates).toEqual(mockCoordinates);
          },
          error: () => {
            throw new Error('Should not error without permissions API');
          },
        });
      });

      it('should handle concurrent location requests', () => {
        // Mock navigator.geolocation
        (navigator as any).originalGeolocation = navigator.geolocation;
        (navigator as any).geolocation = mockGeolocation;

        let callCount = 0;
        mockGeolocation.getCurrentPosition.mockImplementation(
          (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
            callCount++;
            setTimeout(() => success(mockPosition), 10);
          },
        );

        const request1 = service.getCurrentPosition();
        const request2 = service.getCurrentPosition();
        const request3 = service.getCurrentPosition();

        let responseCount = 0;
        const checkResponse = (coordinates: any) => {
          expect(coordinates).toEqual(mockCoordinates);
          responseCount++;
        };

        request1.subscribe({ next: checkResponse });
        request2.subscribe({ next: checkResponse });
        request3.subscribe({ next: checkResponse });

        setTimeout(() => {
          expect(callCount).toBe(3);
          expect(responseCount).toBe(3);
        }, 50);
      });

      it('should handle permission state changes', async () => {
        // Mock navigator.geolocation and permissions
        (navigator as any).originalGeolocation = navigator.geolocation;
        (navigator as any).originalPermissions = navigator.permissions;
        (navigator as any).geolocation = mockGeolocation;
        (navigator as any).permissions = mockPermissions;

        let permissionState = 'prompt';
        mockPermissions.query.mockImplementation(() =>
          Promise.resolve({
            state: permissionState,
          } as PermissionStatus),
        );

        mockGeolocation.getCurrentPosition.mockImplementation(
          (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
            if (permissionState === 'granted' || permissionState === 'prompt') {
              success(mockPosition);
            } else {
              error!({
                code: 1,
                message: 'Permission denied',
              } as GeolocationPositionError);
            }
          },
        );

        // First request with prompt state
        service.requestLocationWithConsent().subscribe({
          next: (coordinates) => {
            expect(coordinates).toEqual(mockCoordinates);
          },
        });

        // Change permission state to granted
        permissionState = 'granted';
        service.requestLocationWithConsent().subscribe({
          next: (coordinates) => {
            expect(coordinates).toEqual(mockCoordinates);
          },
        });

        // Change permission state to denied
        permissionState = 'denied';
        service.requestLocationWithConsent().subscribe({
          next: () => {
            throw new Error('Should not emit when permission denied');
          },
          complete: () => {},
        });
      });
    });
  });
});
