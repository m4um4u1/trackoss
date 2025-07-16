import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapPageComponent } from './map-page.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Coordinates } from '../../models/coordinates';
import { RoutePoint } from '../../models/route';

describe('MapPageComponent', () => {
  let component: MapPageComponent;
  let fixture: ComponentFixture<MapPageComponent>;

  const mockCoordinates: Coordinates = { lat: 52.520008, lon: 13.404954 };
  const mockEndCoordinates: Coordinates = { lat: 48.137154, lon: 11.576124 };
  const mockWaypoints: RoutePoint[] = [
    {
      coordinates: { lat: 52.520008, lon: 13.404954 },
      type: 'waypoint',
      order: 1,
      name: 'Berlin',
    },
    {
      coordinates: { lat: 48.137154, lon: 11.576124 },
      type: 'waypoint',
      order: 2,
      name: 'Munich',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
    expect(component.enableWaypointMode).toBeFalse();
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

  it('should clear waypoints when empty array is passed', () => {
    component.currentWaypoints = mockWaypoints;
    component.onWaypointsChanged([]);

    expect(component.currentWaypoints).toEqual([]);
  });

  it('should enable waypoint mode and clear traditional route points', () => {
    // Set up traditional route points
    component.currentStartPoint = mockCoordinates;
    component.currentEndPoint = mockEndCoordinates;

    component.onWaypointModeToggled(true);

    expect(component.enableWaypointMode).toBe(true);
    expect(component.currentStartPoint).toBeUndefined();
    expect(component.currentEndPoint).toBeUndefined();
  });

  it('should disable waypoint mode and clear waypoints', () => {
    // Set up waypoint mode with waypoints
    component.enableWaypointMode = true;
    component.currentWaypoints = mockWaypoints;

    component.onWaypointModeToggled(false);

    expect(component.enableWaypointMode).toBe(false);
    expect(component.currentWaypoints).toEqual([]);
  });

  it('should handle multiple waypoint mode toggles', () => {
    // Start with traditional mode
    component.currentStartPoint = mockCoordinates;
    component.currentEndPoint = mockEndCoordinates;

    // Switch to waypoint mode
    component.onWaypointModeToggled(true);
    expect(component.enableWaypointMode).toBe(true);
    expect(component.currentStartPoint).toBeUndefined();
    expect(component.currentEndPoint).toBeUndefined();

    // Add waypoints
    component.currentWaypoints = mockWaypoints;

    // Switch back to traditional mode
    component.onWaypointModeToggled(false);
    expect(component.enableWaypointMode).toBe(false);
    expect(component.currentWaypoints).toEqual([]);
  });

  it('should handle empty route points object', () => {
    component.currentStartPoint = mockCoordinates;
    component.currentEndPoint = mockEndCoordinates;

    component.onRoutePointsUpdated({});

    expect(component.currentStartPoint).toBeUndefined();
    expect(component.currentEndPoint).toBeUndefined();
  });

  it('should maintain state consistency during mode switches', () => {
    // Verify initial state
    expect(component.enableWaypointMode).toBe(false);
    expect(component.currentWaypoints).toEqual([]);
    expect(component.currentStartPoint).toBeUndefined();
    expect(component.currentEndPoint).toBeUndefined();

    // Add traditional route points
    component.onRoutePointsUpdated({
      start: mockCoordinates,
      end: mockEndCoordinates,
    });

    // Switch to waypoint mode - should clear traditional points
    component.onWaypointModeToggled(true);
    expect(component.currentStartPoint).toBeUndefined();
    expect(component.currentEndPoint).toBeUndefined();

    // Add waypoints
    component.onWaypointsChanged(mockWaypoints);
    expect(component.currentWaypoints).toEqual(mockWaypoints);

    // Switch back to traditional mode - should clear waypoints
    component.onWaypointModeToggled(false);
    expect(component.currentWaypoints).toEqual([]);
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

  describe('Responsive behavior', () => {
    beforeEach(() => {
      // Mock window.innerWidth for testing
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
    });

    it('should detect mobile screen size correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 767, writable: true });
      component['checkScreenSize']();

      expect(component.isMobile).toBe(true);
      expect(component.isTablet).toBe(false);
    });

    it('should detect tablet screen size correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true });
      component['checkScreenSize']();

      expect(component.isMobile).toBe(false);
      expect(component.isTablet).toBe(true);
    });

    it('should detect desktop screen size correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1400, writable: true });
      component['checkScreenSize']();

      expect(component.isMobile).toBe(false);
      expect(component.isTablet).toBe(false);
    });

    it('should open sidepanel when switching from mobile to desktop', () => {
      // Start as mobile with closed sidepanel
      component.isMobile = true;
      component.isSidepanelOpen = false;

      // Switch to desktop
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
      component['checkScreenSize']();

      expect(component.isSidepanelOpen).toBe(true);
    });

    it('should close sidepanel when switching from desktop to mobile', () => {
      // Start as desktop with open sidepanel
      component.isMobile = false;
      component.isSidepanelOpen = true;

      // Switch to mobile
      Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });
      component['checkScreenSize']();

      expect(component.isSidepanelOpen).toBe(false);
    });

    it('should call updateCSSProperties when screen size changes', () => {
      const updateCSSPropertiesSpy = jest.spyOn(component as any, 'updateCSSProperties');

      component['checkScreenSize']();

      expect(updateCSSPropertiesSpy).toHaveBeenCalled();
    });

    it('should call resizeMapAfterToggle when screen size changes', () => {
      const resizeMapSpy = jest.spyOn(component as any, 'resizeMapAfterToggle');

      component['checkScreenSize']();

      expect(resizeMapSpy).toHaveBeenCalled();
    });
  });

  describe('CSS Properties Management', () => {
    let hostElement: HTMLElement;
    let setPropertySpy: jest.SpyInstance;

    beforeEach(() => {
      hostElement = fixture.nativeElement;
      setPropertySpy = jest.spyOn(hostElement.style, 'setProperty');
    });

    it('should set mobile sidepanel width when on mobile', () => {
      component.isMobile = true;

      component['updateCSSProperties']();

      expect(setPropertySpy).toHaveBeenCalledWith('--mobile-sidepanel-width', '85%');
    });

    it('should not set CSS properties when not on mobile', () => {
      component.isMobile = false;
      component.isSidepanelOpen = true;

      component['updateCSSProperties']();

      expect(setPropertySpy).not.toHaveBeenCalled();
    });

    it('should not set CSS properties when on desktop with sidepanel closed', () => {
      component.isMobile = false;
      component.isSidepanelOpen = false;

      component['updateCSSProperties']();

      expect(setPropertySpy).not.toHaveBeenCalled();
    });
  });

  describe('Sidepanel functionality', () => {
    it('should toggle sidepanel state', () => {
      const initialState = component.isSidepanelOpen;

      component.toggleSidepanel();

      expect(component.isSidepanelOpen).toBe(!initialState);
    });

    it('should call updateCSSProperties when toggling sidepanel', () => {
      const updateCSSPropertiesSpy = jest.spyOn(component as any, 'updateCSSProperties');

      component.toggleSidepanel();

      expect(updateCSSPropertiesSpy).toHaveBeenCalled();
    });

    it('should call resizeMapAfterToggle when toggling sidepanel', () => {
      const resizeMapSpy = jest.spyOn(component as any, 'resizeMapAfterToggle');

      component.toggleSidepanel();

      expect(resizeMapSpy).toHaveBeenCalled();
    });

    it('should handle backdrop click on mobile when sidepanel is open', () => {
      component.isMobile = true;
      component.isSidepanelOpen = true;

      component.onBackdropClick();

      expect(component.isSidepanelOpen).toBe(false);
    });

    it('should not handle backdrop click on mobile when sidepanel is closed', () => {
      component.isMobile = true;
      component.isSidepanelOpen = false;

      component.onBackdropClick();

      expect(component.isSidepanelOpen).toBe(false);
    });

    it('should not handle backdrop click on desktop', () => {
      component.isMobile = false;
      component.isSidepanelOpen = true;

      component.onBackdropClick();

      expect(component.isSidepanelOpen).toBe(true);
    });
  });

  describe('Body scroll handling', () => {
    beforeEach(() => {
      // Reset document.body.style before each test
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    });

    it('should prevent body scroll when mobile sidepanel is open', () => {
      component.isMobile = true;
      component.isSidepanelOpen = true;

      component['handleBodyScroll']();

      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.position).toBe('fixed');
      expect(document.body.style.width).toBe('100%');
    });

    it('should restore body scroll when mobile sidepanel is closed', () => {
      component.isMobile = true;
      component.isSidepanelOpen = false;

      component['handleBodyScroll']();

      expect(document.body.style.overflow).toBe('');
      expect(document.body.style.position).toBe('');
      expect(document.body.style.width).toBe('');
    });

    it('should not affect body scroll on desktop', () => {
      component.isMobile = false;
      component.isSidepanelOpen = true;

      component['handleBodyScroll']();

      expect(document.body.style.overflow).toBe('');
      expect(document.body.style.position).toBe('');
      expect(document.body.style.width).toBe('');
    });
  });

  describe('Touch event handling', () => {
    let mockTouchEvent: Partial<TouchEvent>;
    let mockTarget: Partial<HTMLElement>;

    beforeEach(() => {
      mockTarget = {
        scrollTop: 0,
        scrollHeight: 1000,
        clientHeight: 500,
        currentTarget: null as any,
        _initialTouchY: undefined,
      };

      mockTouchEvent = {
        currentTarget: mockTarget as HTMLElement,
        touches: [{ clientY: 100 } as Touch],
        preventDefault: jest.fn(),
      };
    });

    it('should store initial touch position on touchstart', () => {
      component.isMobile = true;
      component.isSidepanelOpen = true;
      mockTouchEvent.touches = [{ clientY: 150 } as Touch];

      component.onSidepanelTouchStart(mockTouchEvent as TouchEvent);

      expect((mockTarget as any)._initialTouchY).toBe(150);
    });

    it('should prevent overscroll at top on mobile', () => {
      component.isMobile = true;
      component.isSidepanelOpen = true;
      mockTarget.scrollTop = 0;
      (mockTarget as any)._initialTouchY = 150;
      mockTouchEvent.touches = [{ clientY: 200 } as Touch]; // Positive deltaY (scrolling down at top)

      component.onSidepanelTouchMove(mockTouchEvent as TouchEvent);

      expect(mockTouchEvent.preventDefault).toHaveBeenCalled();
    });

    it('should prevent overscroll at bottom on mobile', () => {
      component.isMobile = true;
      component.isSidepanelOpen = true;
      mockTarget.scrollTop = 499; // Near bottom (scrollTop + clientHeight >= scrollHeight - 1)
      mockTarget.scrollHeight = 1000;
      mockTarget.clientHeight = 500;
      (mockTarget as any)._initialTouchY = 150;
      mockTouchEvent.touches = [{ clientY: 100 } as Touch]; // Negative deltaY (scrolling up at bottom)

      component.onSidepanelTouchMove(mockTouchEvent as TouchEvent);

      expect(mockTouchEvent.preventDefault).toHaveBeenCalled();
    });

    it('should allow normal scrolling in middle of content', () => {
      component.isMobile = true;
      component.isSidepanelOpen = true;
      mockTarget.scrollTop = 250; // Middle of scrollable area
      (mockTarget as any)._initialTouchY = 150;
      mockTouchEvent.touches = [{ clientY: 100 } as Touch];

      component.onSidepanelTouchMove(mockTouchEvent as TouchEvent);

      expect(mockTouchEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should not handle touch events on desktop', () => {
      component.isMobile = false;
      component.isSidepanelOpen = true;

      component.onSidepanelTouchMove(mockTouchEvent as TouchEvent);

      expect(mockTouchEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should not handle touch events when sidepanel is closed', () => {
      component.isMobile = true;
      component.isSidepanelOpen = false;

      component.onSidepanelTouchMove(mockTouchEvent as TouchEvent);

      expect(mockTouchEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should not handle touchstart when not on mobile', () => {
      component.isMobile = false;
      component.isSidepanelOpen = true;

      component.onSidepanelTouchStart(mockTouchEvent as TouchEvent);

      expect((mockTarget as any)._initialTouchY).toBeUndefined();
    });
  });

  describe('Window resize handling', () => {
    it('should call checkScreenSize on window resize', () => {
      const checkScreenSizeSpy = jest.spyOn(component as any, 'checkScreenSize');

      // Trigger window resize event
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);

      expect(checkScreenSizeSpy).toHaveBeenCalled();
    });
  });

  describe('Component lifecycle', () => {
    it('should call checkScreenSize and updateCSSProperties on init', () => {
      const checkScreenSizeSpy = jest.spyOn(component as any, 'checkScreenSize');
      const updateCSSPropertiesSpy = jest.spyOn(component as any, 'updateCSSProperties');

      component.ngOnInit();

      expect(checkScreenSizeSpy).toHaveBeenCalled();
      expect(updateCSSPropertiesSpy).toHaveBeenCalled();
    });

    it('should restore body scroll on destroy', () => {
      // Set some body styles
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';

      component.ngOnDestroy();

      expect(document.body.style.overflow).toBe('');
      expect(document.body.style.position).toBe('');
      expect(document.body.style.width).toBe('');
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
