import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { MapSidepanelComponent } from './map-sidepanel.component';
import { RouteService } from '../services/route.service';
import { Coordinates } from '../models/coordinates';
import { MultiWaypointRoute, RoutePoint, RouteResult } from '../models/route';

describe('MapSidepanelComponent', () => {
  let component: MapSidepanelComponent;
  let fixture: ComponentFixture<MapSidepanelComponent>;
  let routeService: jest.Mocked<RouteService>;

  const mockCoordinates: Coordinates = { lat: 52.520008, lon: 13.404954 };
  const mockRouteResult: RouteResult = {
    startPoint: mockCoordinates,
    endPoint: { lat: 52.516275, lon: 13.377704 },
    routeData: {
      type: 'FeatureCollection',
      features: [],
    },
    distance: 1000,
    duration: 300,
  };

  const mockWaypoint: RoutePoint = {
    coordinates: mockCoordinates,
    type: 'start',
    id: 'waypoint-1',
    name: 'Berlin',
    order: 0,
  };

  const mockMultiWaypointRoute: MultiWaypointRoute = {
    waypoints: [mockWaypoint],
    totalDistance: 1000,
    totalDuration: 300,
    routeData: {
      type: 'FeatureCollection',
      features: [],
    },
    legs: [],
  };

  beforeEach(async () => {
    const routeServiceSpy = {
      getCurrentMultiWaypointRoute: jest.fn().mockReturnValue(of(mockMultiWaypointRoute)),
      getCurrentRoute: jest.fn().mockReturnValue(of(null)),
      clearAllStoredRoutes: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MapSidepanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RouteService, useValue: routeServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapSidepanelComponent);
    component = fixture.componentInstance;
    routeService = TestBed.inject(RouteService) as jest.Mocked<RouteService>;

    // Setup default mock return values
    (routeService.getCurrentMultiWaypointRoute as unknown as jest.Mock).mockReturnValue(of(null));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.waypoints).toEqual([]);
    expect(component.currentMultiWaypointRoute).toBeNull();
  });

  it('should subscribe to multi-waypoint route updates on init', () => {
    (routeService.getCurrentMultiWaypointRoute as unknown as jest.Mock).mockReturnValue(of(mockMultiWaypointRoute));

    component.ngOnInit();

    expect(component.currentMultiWaypointRoute).toEqual(mockMultiWaypointRoute);
  });

  it('should emit coordinates when onCoordinatesReady is called', () => {
    jest.spyOn(component.routePointsReady, 'emit');
    const coordinates = { start: mockCoordinates, end: mockCoordinates };

    component.onCoordinatesReady(coordinates);

    expect(component.routePointsReady.emit).toHaveBeenCalledWith(coordinates);
  });

  it('should emit route result when onRouteCalculated is called', () => {
    jest.spyOn(component.routeCalculated, 'emit');

    component.onRouteCalculated(mockRouteResult);

    expect(component.routeCalculated.emit).toHaveBeenCalledWith(mockRouteResult);
  });

  it('should emit undefined coordinates when onRouteCleared is called', () => {
    jest.spyOn(component.routePointsReady, 'emit');

    component.onRouteCleared();

    expect(component.routePointsReady.emit).toHaveBeenCalledWith({
      start: undefined,
      end: undefined,
    });
  });

  it('should handle route error', () => {
    // Test that the method handles errors gracefully
    expect(() => component.onRouteError('Test error')).not.toThrow();
  });

  it('should emit waypoints when onWaypointsChanged is called', () => {
    jest.spyOn(component.waypointsChanged, 'emit');
    const waypoints = [mockWaypoint];

    component.onWaypointsChanged(waypoints);

    expect(component.waypointsChanged.emit).toHaveBeenCalledWith(waypoints);
  });

  // Removed test for waypoint mode toggle as this functionality doesn't exist in the component

  // Removed test for waypoints cleared as this method doesn't exist in the component

  it('should emit multi-waypoint route calculated', () => {
    jest.spyOn(component.multiWaypointRouteCalculated, 'emit');
    component.currentMultiWaypointRoute = mockMultiWaypointRoute;

    component.onWaypointRouteCalculated();

    expect(component.multiWaypointRouteCalculated.emit).toHaveBeenCalledWith(mockMultiWaypointRoute);
  });

  it('should unsubscribe on destroy', () => {
    const subscription = {
      unsubscribe: jest.fn(),
      closed: false,
      add: jest.fn(),
      remove: jest.fn(),
    } as any;
    component['multiWaypointRouteSubscription'] = subscription;

    component.ngOnDestroy();

    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('should handle input changes correctly', () => {
    const newWaypoints = [
      {
        coordinates: { lat: 52.520008, lon: 13.404954 },
        type: 'waypoint' as const,
        order: 1,
        name: 'Berlin',
      },
      {
        coordinates: { lat: 48.137154, lon: 11.576124 },
        type: 'waypoint' as const,
        order: 2,
        name: 'Munich',
      },
    ];

    component.waypoints = newWaypoints;
    expect(component.waypoints).toEqual(newWaypoints);
  });

  // Removed test for enableWaypointMode as this property doesn't exist in the component

  it('should handle route calculation', () => {
    jest.spyOn(component.routeCalculated, 'emit');

    component.onRouteCalculated(mockRouteResult);

    expect(component.routeCalculated.emit).toHaveBeenCalledWith(mockRouteResult);
  });

  it('should handle coordinates ready with different coordinate types', () => {
    const coordinates = {
      start: { lat: 52.520008, lon: 13.404954 },
      end: { lat: 48.137154, lon: 11.576124 },
    };

    jest.spyOn(component.routePointsReady, 'emit');

    component.onCoordinatesReady(coordinates);

    expect(component.routePointsReady.emit).toHaveBeenCalledWith(coordinates);
  });

  it('should handle route clearing with cleanup', () => {
    component.currentMultiWaypointRoute = mockMultiWaypointRoute;

    jest.spyOn(component.routePointsReady, 'emit');

    // The onRouteCleared method only emits routePointsReady, it doesn't clear the service
    // The currentMultiWaypointRoute is only set to null when the service emits null
    component.onRouteCleared();

    expect(component.routePointsReady.emit).toHaveBeenCalledWith({ start: undefined, end: undefined });
    // The currentMultiWaypointRoute should still have the mock route since onRouteCleared doesn't clear it
    expect(component.currentMultiWaypointRoute).toBe(mockMultiWaypointRoute);
  });

  // Removed tests for waypoint mode toggle and waypoints cleared as these methods don't exist in the component

  it('should handle multi-waypoint route updates from service', () => {
    const newRoute = {
      ...mockMultiWaypointRoute,
      totalDistance: 2000,
      totalDuration: 600,
    };

    (routeService.getCurrentMultiWaypointRoute as unknown as jest.Mock).mockReturnValue(of(newRoute));

    component.ngOnInit();

    expect(component.currentMultiWaypointRoute).toEqual(newRoute);
  });

  it('should handle error scenarios gracefully', () => {
    const errorMessage = 'Network error occurred';

    component.onRouteError(errorMessage);

    // Should not throw and should handle error gracefully
    expect(true).toBe(true); // Test passes if no error is thrown
  });

  it('should handle waypoint route calculation when route exists', () => {
    component.currentMultiWaypointRoute = mockMultiWaypointRoute;

    jest.spyOn(component.multiWaypointRouteCalculated, 'emit');

    component.onWaypointRouteCalculated();

    expect(component.multiWaypointRouteCalculated.emit).toHaveBeenCalledWith(mockMultiWaypointRoute);
  });

  it('should not emit when no multi-waypoint route exists', () => {
    component.currentMultiWaypointRoute = null;

    jest.spyOn(component.multiWaypointRouteCalculated, 'emit');

    component.onWaypointRouteCalculated();

    expect(component.multiWaypointRouteCalculated.emit).not.toHaveBeenCalled();
  });

  // Additional comprehensive tests for better coverage
  describe('Advanced Component Behavior', () => {
    it('should handle subscription errors gracefully', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock an error in the subscription using throwError from rxjs
      (routeService.getCurrentMultiWaypointRoute as unknown as jest.Mock).mockReturnValue(
        throwError(() => new Error('Service error')),
      );

      expect(() => component.ngOnInit()).not.toThrow();

      errorSpy.mockRestore();
    });

    it('should handle multiple waypoint changes', () => {
      const waypoints1 = [
        { coordinates: { lat: 52.520008, lon: 13.404954 }, type: 'start' as const, order: 0, name: 'Berlin' },
        { coordinates: { lat: 48.137154, lon: 11.576124 }, type: 'waypoint' as const, order: 1, name: 'Munich' },
      ];

      const waypoints2 = [
        { coordinates: { lat: 50.110922, lon: 8.682127 }, type: 'start' as const, order: 0, name: 'Frankfurt' },
        { coordinates: { lat: 51.165691, lon: 10.451526 }, type: 'waypoint' as const, order: 1, name: 'Göttingen' },
        { coordinates: { lat: 53.551086, lon: 9.993682 }, type: 'end' as const, order: 2, name: 'Hamburg' },
      ];

      jest.spyOn(component.waypointsChanged, 'emit');

      component.onWaypointsChanged(waypoints1);
      expect(component.waypointsChanged.emit).toHaveBeenCalledWith(waypoints1);

      component.onWaypointsChanged(waypoints2);
      expect(component.waypointsChanged.emit).toHaveBeenCalledWith(waypoints2);
    });

    it('should handle empty waypoints array', () => {
      jest.spyOn(component.waypointsChanged, 'emit');

      component.onWaypointsChanged([]);

      expect(component.waypointsChanged.emit).toHaveBeenCalledWith([]);
    });

    it('should handle coordinates with null values', () => {
      const coordinates = {
        start: null as any,
        end: null as any,
      };

      jest.spyOn(component.routePointsReady, 'emit');

      component.onCoordinatesReady(coordinates as any);

      expect(component.routePointsReady.emit).toHaveBeenCalledWith(coordinates);
    });

    it('should handle route result with minimal data', () => {
      const minimalRoute: RouteResult = {
        startPoint: { lat: 0, lon: 0 },
        endPoint: { lat: 0, lon: 0 },
        routeData: { type: 'FeatureCollection', features: [] },
        distance: 0,
        duration: 0,
      };

      jest.spyOn(component.routeCalculated, 'emit');

      component.onRouteCalculated(minimalRoute);

      expect(component.routeCalculated.emit).toHaveBeenCalledWith(minimalRoute);
    });

    it('should handle route result with large values', () => {
      const largeRoute: RouteResult = {
        startPoint: { lat: 89.999, lon: 179.999 },
        endPoint: { lat: -89.999, lon: -179.999 },
        routeData: { type: 'FeatureCollection', features: [] },
        distance: 999999,
        duration: 86400,
      };

      jest.spyOn(component.routeCalculated, 'emit');

      component.onRouteCalculated(largeRoute);

      expect(component.routeCalculated.emit).toHaveBeenCalledWith(largeRoute);
    });

    // Removed test for waypoint mode toggle as this functionality doesn't exist in the component

    it('should handle route error with empty string', () => {
      expect(() => component.onRouteError('')).not.toThrow();
    });

    it('should handle route error with null', () => {
      expect(() => component.onRouteError(null as any)).not.toThrow();
    });

    it('should handle route error with undefined', () => {
      expect(() => component.onRouteError(undefined as any)).not.toThrow();
    });

    it('should handle component destruction without subscription', () => {
      component['multiWaypointRouteSubscription'] = undefined;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle component destruction with null subscription', () => {
      component['multiWaypointRouteSubscription'] = null as any;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle service returning null route', () => {
      (routeService.getCurrentMultiWaypointRoute as unknown as jest.Mock).mockReturnValue(of(null));

      component.ngOnInit();

      expect(component.currentMultiWaypointRoute).toBeNull();
    });

    it('should handle service returning undefined route', () => {
      (routeService.getCurrentMultiWaypointRoute as unknown as jest.Mock).mockReturnValue(of(undefined));

      component.ngOnInit();

      expect(component.currentMultiWaypointRoute).toBeUndefined();
    });

    it('should handle waypoint route calculation with undefined route', () => {
      component.currentMultiWaypointRoute = undefined as any;

      jest.spyOn(component.multiWaypointRouteCalculated, 'emit');

      component.onWaypointRouteCalculated();

      expect(component.multiWaypointRouteCalculated.emit).not.toHaveBeenCalled();
    });

    it('should handle property initialization correctly', () => {
      expect(component.waypoints).toBeDefined();
      expect(component.currentMultiWaypointRoute).toBeDefined();
      expect(component.routePointsReady).toBeDefined();
      expect(component.routeCalculated).toBeDefined();
      expect(component.waypointsChanged).toBeDefined();
      expect(component.multiWaypointRouteCalculated).toBeDefined();
    });

    it('should handle complex multi-waypoint route data', () => {
      const complexRoute: MultiWaypointRoute = {
        waypoints: [
          { coordinates: { lat: 52.520008, lon: 13.404954 }, type: 'start', order: 0, name: 'Berlin', id: 'wp1' },
          { coordinates: { lat: 48.137154, lon: 11.576124 }, type: 'waypoint', order: 1, name: 'Munich', id: 'wp2' },
          { coordinates: { lat: 50.110922, lon: 8.682127 }, type: 'end', order: 2, name: 'Frankfurt', id: 'wp3' },
        ],
        totalDistance: 5000,
        totalDuration: 18000,
        routeData: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [13.404954, 52.520008],
                  [11.576124, 48.137154],
                ],
              },
              properties: {},
            },
          ],
        },
        legs: [
          {
            startPoint: { lat: 52.520008, lon: 13.404954 },
            endPoint: { lat: 48.137154, lon: 11.576124 },
            distance: 2500,
            duration: 9000,
            geometry: {
              type: 'LineString',
              coordinates: [
                [13.404954, 52.520008],
                [11.576124, 48.137154],
              ],
            },
          },
          {
            startPoint: { lat: 48.137154, lon: 11.576124 },
            endPoint: { lat: 50.110922, lon: 8.682127 },
            distance: 2500,
            duration: 9000,
            geometry: {
              type: 'LineString',
              coordinates: [
                [11.576124, 48.137154],
                [8.682127, 50.110922],
              ],
            },
          },
        ],
      };

      (routeService.getCurrentMultiWaypointRoute as unknown as jest.Mock).mockReturnValue(of(complexRoute));

      component.ngOnInit();

      expect(component.currentMultiWaypointRoute).toEqual(complexRoute);
    });
  });
});
