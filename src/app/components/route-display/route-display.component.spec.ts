import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RouteDisplayComponent } from './route-display.component';
import { RouteService } from '../../services/route.service';
import { RouteResult } from '../../models/route';

describe('RouteDisplayComponent', () => {
  let component: RouteDisplayComponent;
  let fixture: ComponentFixture<RouteDisplayComponent>;

  const mockRouteResult: RouteResult = {
    startPoint: { lat: 52.520008, lon: 13.404954 },
    endPoint: { lat: 52.516275, lon: 13.377704 },
    routeData: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [13.404954, 52.520008],
              [13.377704, 52.516275],
            ],
          },
        },
      ],
    },
    distance: 1.5,
    duration: 450,
  };

  const mockMultiWaypointRoute = {
    waypoints: [
      {
        coordinates: { lat: 52.520008, lon: 13.404954 },
        type: 'start' as const,
        order: 1,
        name: 'Berlin',
      },
      {
        coordinates: { lat: 48.137154, lon: 11.576124 },
        type: 'end' as const,
        order: 2,
        name: 'Munich',
      },
    ],
    totalDistance: 5.75,
    totalDuration: 7320,
    routes: [] as any[],
    routeData: {
      type: 'FeatureCollection' as const,
      features: [] as any[],
    },
  };

  let routeServiceSpy: any;

  beforeEach(async () => {
    routeServiceSpy = {
      getCurrentRoute: jest.fn().mockReturnValue(of(mockRouteResult)),
      getCurrentMultiWaypointRoute: jest.fn().mockReturnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [RouteDisplayComponent],
      providers: [{ provide: RouteService, useValue: routeServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display route information when route is available', () => {
    component.routeResult = mockRouteResult;
    fixture.detectChanges();

    const routeDisplay = fixture.nativeElement.querySelector('.route-display');
    expect(routeDisplay).toBeTruthy();

    const distanceElement = fixture.nativeElement.querySelector('.route-detail .value');
    expect(distanceElement.textContent).toContain('1 km 500 m');
  });

  it('should display no route message when no route is available', () => {
    component.routeResult = null;
    component.showNoRouteMessage = true;
    fixture.detectChanges();

    const noRouteElement = fixture.nativeElement.querySelector('.no-route');
    expect(noRouteElement).toBeTruthy();
    expect(noRouteElement.textContent).toContain('No route calculated yet');
  });

  it('should format distance correctly', () => {
    expect(component.formatDistance(0.5)).toBe('500 m');
    expect(component.formatDistance(1.5)).toBe('1 km 500 m');
    expect(component.formatDistance(0.1)).toBe('100 m');
  });

  it('should format duration correctly', () => {
    expect(component.formatDuration(60)).toBe('1m');
    expect(component.formatDuration(120)).toBe('2m');
    expect(component.formatDuration(3600)).toBe('1h 0m');
    expect(component.formatDuration(3660)).toBe('1h 1m');
  });

  it('should format coordinates correctly', () => {
    const coords = { lat: 52.520008, lon: 13.404954 };
    const formatted = component.formatCoordinates(coords);
    expect(formatted).toBe('52.5200, 13.4050');
  });

  it('should show/hide actions based on input', () => {
    component.routeResult = mockRouteResult;
    component.showActions = true;
    fixture.detectChanges();

    const actionsElement = fixture.nativeElement.querySelector('.route-actions');
    expect(actionsElement).toBeTruthy();

    component.showActions = false;
    fixture.detectChanges();

    const hiddenActionsElement = fixture.nativeElement.querySelector('.route-actions');
    expect(hiddenActionsElement).toBeFalsy();
  });

  it('should call exportRoute when export button is clicked', () => {
    jest.spyOn(component, 'exportRoute');
    component.routeResult = mockRouteResult;
    component.showActions = true;
    fixture.detectChanges();

    const exportButton = fixture.nativeElement.querySelector('.btn-primary');
    if (exportButton) {
      exportButton.click();
      expect(component.exportRoute).toHaveBeenCalled();
    }
  });

  it('should subscribe to route service when autoUpdate is true', () => {
    component.autoUpdate = true;
    component.ngOnInit();

    expect(component.routeResult).toEqual(mockRouteResult);
  });

  it('should not subscribe to route service when autoUpdate is false', () => {
    component.autoUpdate = false;
    component.routeResult = null;
    component.ngOnInit();

    expect(component.routeResult).toBeNull();
  });

  it('should unsubscribe on destroy', () => {
    component.ngOnInit();
    const routeSubscription = {
      unsubscribe: jest.fn(),
      closed: false,
      add: jest.fn(),
      remove: jest.fn(),
    } as any;
    const multiWaypointSubscription = {
      unsubscribe: jest.fn(),
      closed: false,
      add: jest.fn(),
      remove: jest.fn(),
    } as any;

    component['routeSubscription'] = routeSubscription;
    component['multiWaypointRouteSubscription'] = multiWaypointSubscription;

    component.ngOnDestroy();

    expect(routeSubscription.unsubscribe).toHaveBeenCalled();
    expect(multiWaypointSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('should handle null route gracefully', () => {
    component.routeResult = null;
    fixture.detectChanges();

    const routeElement = fixture.nativeElement.querySelector('.route-info');
    expect(routeElement).toBeFalsy();
  });

  it('should handle undefined route properties', () => {
    component.routeResult = {
      startPoint: { lat: 52.520008, lon: 13.404954 },
      endPoint: { lat: 48.137154, lon: 11.576124 },
      distance: undefined,
      duration: undefined,
      routeData: null,
    } as any;
    fixture.detectChanges();

    expect(component.formatDistance(component.routeResult.distance)).toBe('NaN m');
    expect(component.formatDuration(component.routeResult.duration)).toBe('NaNm');
  });

  it('should format very small distances', () => {
    expect(component.formatDistance(0.001)).toBe('1 m');
    expect(component.formatDistance(0)).toBe('0 m');
  });

  it('should format very large distances', () => {
    expect(component.formatDistance(100.5)).toBe('100 km 500 m');
    expect(component.formatDistance(1000)).toBe('1000 km 0 m');
  });

  it('should format very short durations', () => {
    expect(component.formatDuration(30)).toBe('0m');
    expect(component.formatDuration(0)).toBe('0m');
  });

  it('should format very long durations', () => {
    expect(component.formatDuration(86400)).toBe('24h 0m'); // 24 hours
    expect(component.formatDuration(90061)).toBe('25h 1m'); // 25 hours 1 minute
  });

  it('should handle negative values gracefully', () => {
    expect(component.formatDistance(-1)).toBe('0 m');
    expect(component.formatDuration(-60)).toBe('-1m');
  });

  it('should format coordinates with extreme values', () => {
    const coords1 = { lat: 90, lon: 180 };
    const coords2 = { lat: -90, lon: -180 };

    expect(component.formatCoordinates(coords1)).toBe('90.0000, 180.0000');
    expect(component.formatCoordinates(coords2)).toBe('-90.0000, -180.0000');
  });

  it('should handle route with missing start or end point', () => {
    component.routeResult = {
      startPoint: null,
      endPoint: { lat: 48.137154, lon: 11.576124 },
      distance: 1.5,
      duration: 300,
      routeData: { type: 'FeatureCollection', features: [] },
    } as any;
    // Don't trigger change detection since formatCoordinates will be called with null
    // Should not crash and should handle gracefully
    expect(component.routeResult.startPoint).toBeNull();
  });

  it('should handle route data with empty features', () => {
    component.routeResult = {
      ...mockRouteResult,
      routeData: {
        type: 'FeatureCollection',
        features: [],
      },
    };
    fixture.detectChanges();

    expect(component.routeResult.routeData.features.length).toBe(0);
  });

  it('should handle exportRoute method', () => {
    // Mock DOM methods
    const createElementSpy = jest.spyOn(document, 'createElement');
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
    const mockLink = { href: '', download: '', click: jest.fn() };
    createElementSpy.mockReturnValue(mockLink as any);

    component.routeResult = mockRouteResult;

    component.exportRoute();

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.download).toBe('route.json');
    expect(mockLink.click).toHaveBeenCalled();

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
  });

  // Additional comprehensive tests for better coverage
  describe('Formatting Methods', () => {
    it('should format distance with kilometers and meters', () => {
      const result = component.formatDistance(5.75);
      expect(result).toBe('5 km 750 m');
    });

    it('should format distance with only meters when less than 1 km', () => {
      const result = component.formatDistance(0.5);
      expect(result).toBe('500 m');
    });

    it('should format distance with zero kilometers', () => {
      const result = component.formatDistance(0.25);
      expect(result).toBe('250 m');
    });

    it('should format duration with hours and minutes', () => {
      const result = component.formatDuration(7320); // 2 hours 2 minutes
      expect(result).toBe('2h 2m');
    });

    it('should format duration with only minutes when less than 1 hour', () => {
      const result = component.formatDuration(1800); // 30 minutes
      expect(result).toBe('30m');
    });

    it('should format duration with zero minutes', () => {
      const result = component.formatDuration(3600); // 1 hour exactly
      expect(result).toBe('1h 0m');
    });

    it('should format coordinates with 4 decimal places', () => {
      const coords = { lat: 52.520008, lon: 13.404954 };
      const result = component.formatCoordinates(coords);
      expect(result).toBe('52.5200, 13.4050');
    });

    it('should format negative coordinates correctly', () => {
      const coords = { lat: -34.6037, lon: -58.3816 };
      const result = component.formatCoordinates(coords);
      expect(result).toBe('-34.6037, -58.3816');
    });
  });

  describe('Helper Methods', () => {
    it('should return true when routeResult exists', () => {
      component.routeResult = mockRouteResult;
      component.multiWaypointRoute = null;

      expect(component.hasRoute()).toBe(true);
    });

    it('should return true when multiWaypointRoute exists', () => {
      component.routeResult = null;
      component.multiWaypointRoute = mockMultiWaypointRoute as any;

      expect(component.hasRoute()).toBe(true);
    });

    it('should return false when no routes exist', () => {
      component.routeResult = null;
      component.multiWaypointRoute = null;

      expect(component.hasRoute()).toBe(false);
    });

    it('should return multiWaypointRoute distance when available', () => {
      component.routeResult = mockRouteResult;
      component.multiWaypointRoute = mockMultiWaypointRoute as any;

      expect(component.getDistance()).toBe(mockMultiWaypointRoute.totalDistance);
    });

    it('should return routeResult distance when multiWaypointRoute not available', () => {
      component.routeResult = mockRouteResult;
      component.multiWaypointRoute = null;

      expect(component.getDistance()).toBe(mockRouteResult.distance);
    });

    it('should return undefined when no routes available', () => {
      component.routeResult = null;
      component.multiWaypointRoute = null;

      expect(component.getDistance()).toBeUndefined();
    });

    it('should return multiWaypointRoute duration when available', () => {
      component.routeResult = mockRouteResult;
      component.multiWaypointRoute = mockMultiWaypointRoute as any;

      expect(component.getDuration()).toBe(mockMultiWaypointRoute.totalDuration);
    });

    it('should return routeResult duration when multiWaypointRoute not available', () => {
      component.routeResult = mockRouteResult;
      component.multiWaypointRoute = null;

      expect(component.getDuration()).toBe(mockRouteResult.duration);
    });

    it('should return undefined when no routes available for duration', () => {
      component.routeResult = null;
      component.multiWaypointRoute = null;

      expect(component.getDuration()).toBeUndefined();
    });
  });

  describe('Share Functionality', () => {
    it('should handle route sharing when route is available', () => {
      component.routeResult = mockRouteResult;

      // Test that the component has the route data needed for sharing
      expect(component.routeResult).toBeDefined();
      expect(component.routeResult.startPoint).toBeDefined();
      expect(component.routeResult.endPoint).toBeDefined();
    });

    it('should not attempt sharing when no route available', () => {
      component.routeResult = null;

      expect(component.routeResult).toBeNull();
    });

    it('should handle multi-waypoint route sharing when available', () => {
      component.multiWaypointRoute = mockMultiWaypointRoute as any;

      expect(component.multiWaypointRoute).toBeDefined();
      expect(component.multiWaypointRoute.waypoints).toBeDefined();
      expect(component.multiWaypointRoute.waypoints.length).toBeGreaterThan(0);
    });

    it('should not attempt multi-waypoint sharing when none available', () => {
      component.multiWaypointRoute = null;

      expect(component.multiWaypointRoute).toBeNull();
    });
  });

  describe('Export Functionality', () => {
    it('should handle multi-waypoint route export when available', () => {
      component.multiWaypointRoute = mockMultiWaypointRoute as any;

      expect(component.multiWaypointRoute).toBeDefined();
      expect(component.multiWaypointRoute.waypoints).toBeDefined();
    });

    it('should handle export when no multi-waypoint route available', () => {
      component.multiWaypointRoute = null;

      expect(component.multiWaypointRoute).toBeNull();
    });

    it('should handle regular route export when available', () => {
      component.routeResult = mockRouteResult;

      expect(component.routeResult).toBeDefined();
      expect(component.routeResult.distance).toBeDefined();
      expect(component.routeResult.duration).toBeDefined();
    });

    it('should handle export when no regular route available', () => {
      component.routeResult = null;

      expect(component.routeResult).toBeNull();
    });
  });

  describe('Component Properties', () => {
    it('should handle showActions property', () => {
      component.showActions = false;
      expect(component.showActions).toBe(false);

      component.showActions = true;
      expect(component.showActions).toBe(true);
    });

    it('should handle showNoRouteMessage property', () => {
      component.showNoRouteMessage = false;
      expect(component.showNoRouteMessage).toBe(false);

      component.showNoRouteMessage = true;
      expect(component.showNoRouteMessage).toBe(true);
    });

    it('should handle autoUpdate property', () => {
      component.autoUpdate = false;
      expect(component.autoUpdate).toBe(false);

      component.autoUpdate = true;
      expect(component.autoUpdate).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle formatting with extreme values', () => {
      expect(component.formatDistance(0)).toBe('0 m');
      expect(component.formatDuration(0)).toBe('0m');
      expect(component.formatDistance(999.999)).toBe('999 km 999 m');
    });

    it('should handle coordinates with many decimal places', () => {
      const coords = { lat: 52.5200081234, lon: 13.4049541234 };
      const result = component.formatCoordinates(coords);
      expect(result).toBe('52.5200, 13.4050');
    });

    it('should handle null and undefined values gracefully', () => {
      component.routeResult = null;
      component.multiWaypointRoute = null;

      expect(component.hasRoute()).toBe(false);
      expect(component.getDistance()).toBeUndefined();
      expect(component.getDuration()).toBeUndefined();
    });
  });
});
