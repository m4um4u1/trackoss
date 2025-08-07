import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';

import { MapPageComponent } from './map-page.component';
import { ResponsiveService } from '../../services/responsive.service';
import { LayoutStateService } from '../../services/layout-state.service';
import { RouteService } from '../../services/route.service';
import { BackendApiService } from '../../services/backend-api.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Coordinates } from '../../models/coordinates';
import { RoutePoint } from '../../models/route';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MapPageComponent', () => {
  let component: MapPageComponent;
  let fixture: ComponentFixture<MapPageComponent>;
  let mockResponsiveService: jest.Mocked<ResponsiveService>;
  let mockLayoutStateService: jest.Mocked<LayoutStateService>;
  let mockRouteService: jest.Mocked<RouteService>;
  let mockBackendApiService: jest.Mocked<BackendApiService>;

  const mockCoordinates: Coordinates = { lat: 52.520008, lon: 13.404954 };
  const mockEndCoordinates: Coordinates = { lat: 48.137154, lon: 11.576124 };
  const mockWaypoints: RoutePoint[] = [
    {
      coordinates: { lat: 52.520008, lon: 13.404954 },
      type: 'start',
      order: 0,
      name: 'Berlin',
      id: '1',
    },
    {
      coordinates: { lat: 48.137154, lon: 11.576124 },
      type: 'end',
      order: 1,
      name: 'Munich',
      id: '2',
    },
  ];

  beforeEach(async () => {
    // Create mock services
    mockResponsiveService = {
      isMobile: jest.fn().mockReturnValue(false),
      isTablet: jest.fn().mockReturnValue(false),
      isDesktop: jest.fn().mockReturnValue(true),
      state: jest.fn().mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        screenWidth: 1200,
      }),
      screenWidth: signal(1200).asReadonly(),
      getSidepanelColumnClass: jest.fn().mockReturnValue('col-3'),
      shouldSidepanelBeOpenByDefault: jest.fn().mockReturnValue(true),
    } as any;

    mockLayoutStateService = {
      isSidepanelOpen: signal(true).asReadonly(),
      toggleSidepanel: jest.fn(),
      closeSidepanel: jest.fn(),
      openSidepanel: jest.fn(),
      updateBodyScrollLock: jest.fn(),
      sidepanelClasses: jest.fn().mockReturnValue('desktop-sidepanel open col-3'),
      mapClasses: jest.fn().mockReturnValue('desktop-map col'),
      toggleButtonClasses: jest.fn().mockReturnValue('toggle-btn desktop-toggle'),
      rootClasses: jest.fn().mockReturnValue('position-relative h-100 overflow-hidden desktop-mode sidepanel-open'),
    } as any;

    mockRouteService = {
      loadSavedRoute: jest.fn().mockReturnValue(of({})),
      clearMultiWaypointRoute: jest.fn(),
      getCurrentMultiWaypointRoute: jest.fn().mockReturnValue(of(null)),
    } as any;

    mockBackendApiService = {
      getRoute: jest.fn().mockReturnValue(of({})),
      getMapProxyUrl: jest.fn().mockReturnValue(of('http://test-proxy.com')),
    } as any;

    await TestBed.configureTestingModule({
      imports: [MapPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ResponsiveService, useValue: mockResponsiveService },
        { provide: LayoutStateService, useValue: mockLayoutStateService },
        { provide: RouteService, useValue: mockRouteService },
        { provide: BackendApiService, useValue: mockBackendApiService },
        { provide: BreakpointObserver, useValue: { observe: jest.fn().mockReturnValue(of({})) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (): string | null => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.currentStartPoint).toBeUndefined();
    expect(component.currentEndPoint).toBeUndefined();
    expect(component.currentWaypoints).toEqual([]);
  });

  it('should expose responsive and layout services', () => {
    expect(component.responsive).toBe(mockResponsiveService);
    expect(component.layout).toBe(mockLayoutStateService);
  });

  it('should update route points when onRoutePointsUpdated is called', () => {
    const routePoints = {
      start: mockCoordinates,
      end: mockEndCoordinates,
    };

    component.onRoutePointsUpdated(routePoints);

    expect(component.currentStartPoint).toEqual(mockCoordinates);
    expect(component.currentEndPoint).toEqual(mockEndCoordinates);
  });

  it('should handle partial route points update', () => {
    const routePointsStartOnly = { start: mockCoordinates };
    const routePointsEndOnly = { end: mockEndCoordinates };

    component.onRoutePointsUpdated(routePointsStartOnly);
    expect(component.currentStartPoint).toEqual(mockCoordinates);
    expect(component.currentEndPoint).toBeUndefined();

    component.onRoutePointsUpdated(routePointsEndOnly);
    expect(component.currentStartPoint).toBeUndefined();
    expect(component.currentEndPoint).toEqual(mockEndCoordinates);
  });

  it('should update waypoints when onWaypointsChanged is called', () => {
    component.onWaypointsChanged(mockWaypoints);

    expect(component.currentWaypoints).toEqual(mockWaypoints);
  });

  it('should clear route when waypoints are reduced to less than 2', () => {
    const singleWaypoint = [mockWaypoints[0]];

    component.onWaypointsChanged(singleWaypoint);

    expect(mockRouteService.clearMultiWaypointRoute).toHaveBeenCalled();
    expect(component.currentWaypoints).toEqual(singleWaypoint);
  });

  it('should clear waypoints when empty array is passed', () => {
    // First set some waypoints
    component.onWaypointsChanged(mockWaypoints);
    component.onWaypointsChanged([]);

    expect(component.currentWaypoints).toEqual([]);
    expect(mockRouteService.clearMultiWaypointRoute).toHaveBeenCalled();
  });

  it('should toggle sidepanel through layout service', () => {
    component.toggleSidepanel();

    expect(mockLayoutStateService.toggleSidepanel).toHaveBeenCalled();
  });

  it('should handle backdrop click on mobile', () => {
    // Mock mobile state
    mockResponsiveService.isMobile.mockReturnValue(true);

    component.onBackdropClick();

    expect(mockLayoutStateService.closeSidepanel).toHaveBeenCalled();
  });

  it('should not handle backdrop click on desktop', () => {
    // Mock desktop state (default)
    mockResponsiveService.isMobile.mockReturnValue(false);

    component.onBackdropClick();

    expect(mockLayoutStateService.closeSidepanel).not.toHaveBeenCalled();
  });

  it('should handle empty route points object', () => {
    // First set some route points
    component.onRoutePointsUpdated({
      start: mockCoordinates,
      end: mockEndCoordinates,
    });

    component.onRoutePointsUpdated({});

    expect(component.currentStartPoint).toBeUndefined();
    expect(component.currentEndPoint).toBeUndefined();
  });

  it('should maintain state consistency during route updates', () => {
    // Verify initial state
    expect(component.currentWaypoints).toEqual([]);
    expect(component.currentStartPoint).toBeUndefined();
    expect(component.currentEndPoint).toBeUndefined();

    // Add traditional route points
    component.onRoutePointsUpdated({
      start: mockCoordinates,
      end: mockEndCoordinates,
    });

    expect(component.currentStartPoint).toEqual(mockCoordinates);
    expect(component.currentEndPoint).toEqual(mockEndCoordinates);

    // Add waypoints
    component.onWaypointsChanged(mockWaypoints);
    expect(component.currentWaypoints).toEqual(mockWaypoints);
  });

  it('should handle large waypoint arrays', () => {
    const largeWaypointArray: RoutePoint[] = [];
    for (let i = 0; i < 50; i++) {
      largeWaypointArray.push({
        coordinates: {
          lat: 52.520008 + i * 0.001,
          lon: 13.404954 + i * 0.001,
        },
        type: 'waypoint',
        order: i,
        name: `Waypoint ${i}`,
      });
    }

    component.onWaypointsChanged(largeWaypointArray);
    expect(component.currentWaypoints).toEqual(largeWaypointArray);
    expect(component.currentWaypoints.length).toBe(50);
  });

  it('should handle coordinate edge cases', () => {
    const extremeCoordinates = [
      { start: { lat: 90, lon: 180 }, end: { lat: -90, lon: -180 } },
      { start: { lat: 0, lon: 0 }, end: { lat: 0, lon: 0 } },
      { start: { lat: 85.051128, lon: 179.999999 }, end: { lat: -85.051128, lon: -179.999999 } },
    ];

    extremeCoordinates.forEach((coords) => {
      component.onRoutePointsUpdated(coords);
      expect(component.currentStartPoint).toEqual(coords.start);
      expect(component.currentEndPoint).toEqual(coords.end);
    });
  });

  describe('Service integration', () => {
    it('should use responsive service for screen detection', () => {
      expect(component.responsive.isMobile).toBeDefined();
      expect(component.responsive.isTablet).toBeDefined();
      expect(component.responsive.isDesktop).toBeDefined();
    });

    it('should use layout service for sidepanel management', () => {
      expect(component.layout.toggleSidepanel).toBeDefined();
      expect(component.layout.sidepanelClasses).toBeDefined();
      expect(component.layout.mapClasses).toBeDefined();
    });
  });

  describe('Sidepanel functionality', () => {
    it('should call layout service when toggling sidepanel', () => {
      component.toggleSidepanel();

      expect(mockLayoutStateService.toggleSidepanel).toHaveBeenCalled();
    });
  });

  describe('Body scroll handling', () => {
    it('should call layout service to update body scroll lock on destroy', () => {
      component.ngOnDestroy();

      expect(mockLayoutStateService.updateBodyScrollLock).toHaveBeenCalled();
    });
  });

  describe('Component lifecycle', () => {
    it('should initialize component properly', () => {
      expect(component).toBeTruthy();
      expect(component.currentWaypoints).toEqual([]);
    });
  });

  describe('Map integration', () => {
    it('should call resizeMap when resizeMapAfterToggle is called', () => {
      const mockMapComponent = {
        resizeMap: jest.fn(),
      };
      component.mapComponent = mockMapComponent as any;

      component['resizeMapAfterToggle']();

      expect(mockMapComponent.resizeMap).toHaveBeenCalled();
    });

    it('should handle missing mapComponent gracefully', () => {
      component.mapComponent = undefined;

      expect(() => component['resizeMapAfterToggle']()).not.toThrow();
    });
  });
});
