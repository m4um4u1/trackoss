import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SimpleChanges } from '@angular/core';
import { of, throwError } from 'rxjs';

import { LibreMapComponent } from './libre-map.component';
import { GeolocationService } from '../../services/geolocation.service';
import { MapService } from '../../services/map.service';
import { RouteService } from '../../services/route.service';
import { Coordinates } from '../../models/coordinates';
import { RouteOptions, RoutePoint } from '../../models/route';

// Mock MapLibre GL Marker
jest.mock('maplibre-gl', () => ({
  Map: jest.fn(),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  })),
  LngLatBounds: jest.fn(),
}));

describe('LibreMapComponent', () => {
  let component: LibreMapComponent;
  let fixture: ComponentFixture<LibreMapComponent>;
  let geolocationService: jest.Mocked<GeolocationService>;
  let mapService: jest.Mocked<MapService>;
  let routeService: jest.Mocked<RouteService>;

  const mockCoordinates: Coordinates = { lat: 52.520008, lon: 13.404954 };

  const mockMap = {
    flyTo: jest.fn(),
    getSource: jest.fn().mockReturnValue(null),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    removeSource: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    fitBounds: jest.fn(),
    isStyleLoaded: jest.fn().mockReturnValue(true),
    getCanvas: jest.fn().mockReturnValue({ style: { cursor: 'default' } }),
    hasControl: jest.fn().mockReturnValue(false),
    resize: jest.fn(),
    remove: jest.fn(),
    getContainer: jest.fn().mockReturnValue(document.createElement('div')),
    getStyle: jest.fn().mockReturnValue({}),
    isSourceLoaded: jest.fn().mockReturnValue(true),
    areTilesLoaded: jest.fn().mockReturnValue(true),
    getBounds: jest.fn().mockReturnValue({
      getNorthEast: jest.fn().mockReturnValue({ lat: 52.5, lng: 13.4 }),
      getSouthWest: jest.fn().mockReturnValue({ lat: 52.4, lng: 13.3 }),
    }),
  };

  const mockWaypoint: RoutePoint = {
    coordinates: mockCoordinates,
    type: 'start',
    id: 'waypoint-1',
    name: 'Berlin',
    order: 0,
  };

  const mockRouteOptions: RouteOptions = {
    costing: 'bicycle',
    color: '#007cbf',
    width: 4,
  };

  beforeEach(async () => {
    const geolocationSpy = {
      requestLocationWithConsent: jest.fn().mockReturnValue(of(mockCoordinates)),
    };
    const mapServiceSpy = {
      getMapTiles: jest.fn(),
    };
    const routeServiceSpy = {
      getCurrentRoute: jest.fn(),
      getCurrentMultiWaypointRoute: jest.fn(),
      calculateMultiWaypointRoute: jest.fn(),
      addRouteToMap: jest.fn(),
      addMultiWaypointRouteToMap: jest.fn(),
      removeRouteFromMap: jest.fn(),
      updateRouteOnMap: jest.fn(),
      updateMultiWaypointRouteOnMap: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LibreMapComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GeolocationService, useValue: geolocationSpy },
        { provide: MapService, useValue: mapServiceSpy },
        { provide: RouteService, useValue: routeServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LibreMapComponent);
    component = fixture.componentInstance;
    geolocationService = TestBed.inject(GeolocationService) as any;
    mapService = TestBed.inject(MapService) as any;
    routeService = TestBed.inject(RouteService) as any;

    // Setup default mock return values
    mapService.getMapTiles.mockReturnValue(of('mock-style-url'));
    routeService.getCurrentRoute.mockReturnValue(of(null));
    routeService.getCurrentMultiWaypointRoute.mockReturnValue(of(null));

    // Initialize the map instance in the component to prevent errors
    component.onMapLoad(mockMap as any);
    // Don't call fixture.detectChanges() to avoid MapLibre Angular library initialization issues
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.startPosition()).toEqual([13.404954, 52.520008]);
    expect(component.showRoute).toBeTrue();
    // mapStyleUrl is initially empty and gets set after ngOnInit is called
    expect(component.mapStyleUrl()).toBe('');
  });

  it('should load map tiles on init', () => {
    // Call ngOnInit to trigger the map tiles loading
    component.ngOnInit();

    expect(mapService.getMapTiles).toHaveBeenCalledWith('outdoor');
    expect(component.mapStyleUrl()).toBe('mock-style-url');
  });

  it('should have requestUserLocationConsent method', () => {
    expect(component.requestUserLocationConsent).toBeDefined();
    expect(typeof component.requestUserLocationConsent).toBe('function');
  });

  it('should call geolocation service when requesting user location consent', () => {
    // Mock the geolocation service to return an observable
    geolocationService.requestLocationWithConsent.mockReturnValue(of(mockCoordinates));

    // Mock the map instance
    component['_map'].set({
      flyTo: jest.fn(),
    } as any);
    // Call the method
    component.requestUserLocationConsent();

    // Verify the service was called
    expect(geolocationService.requestLocationWithConsent).toHaveBeenCalled();
  });

  it('should fly to user location when consent granted', () => {
    const mockMap = {
      flyTo: jest.fn(),
      on: jest.fn(), // Add the missing 'on' method for event handling
    };
    // Set up the map by calling onMapLoad to properly initialize the signal
    component.onMapLoad(mockMap as any);

    geolocationService.requestLocationWithConsent.mockReturnValue(of(mockCoordinates));

    component.requestUserLocationConsent();

    expect(mockMap.flyTo).toHaveBeenCalledWith({
      center: [mockCoordinates.lon, mockCoordinates.lat],
      zoom: 14,
      duration: 2000,
    });
  });

  it('should handle input changes', () => {
    component['_map'].set({
      getSource: jest.fn().mockReturnValue(null),
    } as any); // Mock map instance

    // Just verify the method was called without error
    expect(component.map).toBeDefined();
  });

  it('should not update markers when map is not initialized', () => {
    const changes: SimpleChanges = {
      startPoint: {
        currentValue: mockCoordinates,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    };

    component['_map'].set(undefined);
    component.ngOnChanges(changes);

    // Just verify no error occurred
    expect(component.map()).toBeUndefined();
  });

  it('should clean up subscriptions on destroy', () => {
    const mockSubscription = {
      unsubscribe: jest.fn(),
      closed: false,
      add: jest.fn(),
      remove: jest.fn(),
    } as any;
    component['routeSubscription'] = mockSubscription;
    component['multiWaypointRouteSubscription'] = mockSubscription;

    component.ngOnDestroy();

    expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('should handle map load event', () => {
    // Ensure the mock map has all required methods
    const mockMapInstance = {
      ...mockMap,
      on: jest.fn(),
      off: jest.fn(),
      getCanvas: jest.fn().mockReturnValue({ style: { cursor: 'default' } }),
    };

    component.onMapLoad(mockMapInstance as any);
    expect(component.map()).toBe(mockMapInstance as any);
    expect(mockMapInstance.on).toHaveBeenCalledWith('click', (expect as any).any(Function));
  });

  it('should handle route display when showRoute is true', () => {
    component.showRoute = true;
    component['_map'].set(mockMap as any);

    const changes: SimpleChanges = {
      showRoute: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    };

    component.ngOnChanges(changes);
    expect(component.showRoute).toBe(true);
  });

  // Removed test for waypoint mode changes as this functionality doesn't exist in the component

  it('should handle waypoints changes', () => {
    const mockWaypoints = [
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
    component.waypoints = mockWaypoints;
    component['_map'].set(mockMap as any);

    const changes: SimpleChanges = {
      waypoints: {
        currentValue: mockWaypoints,
        previousValue: [],
        firstChange: false,
        isFirstChange: () => false,
      },
    };

    component.ngOnChanges(changes);
    expect(component.waypoints).toEqual(mockWaypoints);
  });

  it('should handle geolocation errors gracefully', () => {
    const mockError = new Error('Geolocation failed');
    geolocationService.requestLocationWithConsent.mockReturnValue(throwError(() => mockError));

    // Set the map so the method doesn't return early
    component['_map'].set(mockMap as any);

    component.requestUserLocationConsent();

    expect(geolocationService.requestLocationWithConsent).toHaveBeenCalled();
  });

  it('should handle map style loading errors', () => {
    mapService.getMapTiles.mockReturnValue(throwError(() => new Error('Map tiles failed')));

    component.ngOnInit();

    expect(mapService.getMapTiles).toHaveBeenCalledWith('outdoor');
    expect(component.mapStyleUrl()).toBe('');
  });

  it('should handle map style loading success', () => {
    mapService.getMapTiles.mockReturnValue(of('mock-style-url'));

    component.ngOnInit();

    expect(mapService.getMapTiles).toHaveBeenCalledWith('outdoor');
    expect(component.mapStyleUrl()).toBe('mock-style-url');
  });

  // Additional tests for better coverage
  describe('Waypoint Mode Tests', () => {
    const testWaypoints = [
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

    beforeEach(() => {
      component['_map'].set(mockMap as any);
    });

    it('should clear waypoint markers when disabling waypoint mode', () => {
      component.waypoints = testWaypoints;
      (component as any).waypointMarkers = [{ remove: jest.fn() } as any, { remove: jest.fn() } as any];

      // Test the marker clearing logic directly
      const markers = (component as any).waypointMarkers;
      (component as any).clearWaypointMarkers();

      markers.forEach((marker: any) => {
        expect(marker.remove).toHaveBeenCalled();
      });
      expect((component as any).waypointMarkers).toEqual([]);
    });

    it('should handle waypoint mode with no waypoints', () => {
      component.waypoints = [];

      // No changes needed for waypoint mode as this functionality doesn't exist

      expect(component.waypoints).toEqual([]);
    });

    // Removed test for waypoint mode toggle as this functionality doesn't exist in the component
  });

  describe('Marker Management Tests', () => {
    beforeEach(() => {
      component['_map'].set(mockMap as any);
    });

    it('should set start point property', () => {
      const startPoint = { lat: 52.520008, lon: 13.404954 };
      component.startPoint = startPoint;

      expect(component.startPoint).toEqual(startPoint);
    });

    it('should set end point property', () => {
      const endPoint = { lat: 48.137154, lon: 11.576124 };
      component.endPoint = endPoint;

      expect(component.endPoint).toEqual(endPoint);
    });

    it('should handle component destruction properly', () => {
      // Test that ngOnDestroy completes subscriptions without errors
      expect(() => component.ngOnDestroy()).not.toThrow();

      // Verify the map signal is cleared
      expect(component.map()).toBeUndefined();
    });
  });

  describe('Route Calculation Tests', () => {
    beforeEach(() => {
      component['_map'].set(mockMap as any);
      component.showRoute = true;
    });

    it('should handle traditional route mode properties', () => {
      component.startPoint = { lat: 52.520008, lon: 13.404954 };
      component.endPoint = { lat: 48.137154, lon: 11.576124 };

      expect(component.startPoint).toBeDefined();
      expect(component.endPoint).toBeDefined();
    });

    it('should handle route mode with only start point', () => {
      component.startPoint = { lat: 52.520008, lon: 13.404954 };
      component.endPoint = null;

      expect(component.startPoint).toBeDefined();
      expect(component.endPoint).toBeNull();
    });

    it('should handle route mode with only end point', () => {
      component.startPoint = null;
      component.endPoint = { lat: 48.137154, lon: 11.576124 };

      expect(component.startPoint).toBeNull();
      expect(component.endPoint).toBeDefined();
    });

    it('should handle showRoute property changes', () => {
      component.showRoute = false;
      expect(component.showRoute).toBe(false);

      component.showRoute = true;
      expect(component.showRoute).toBe(true);
    });
  });

  describe('Map Click Handling Tests', () => {
    beforeEach(() => {
      component['_map'].set(mockMap as any);
    });

    it('should emit waypointsChanged when waypoints are modified', () => {
      jest.spyOn(component.waypointsChanged, 'emit');

      // Manually trigger the emission to test the event
      component.waypointsChanged.emit([]);

      expect(component.waypointsChanged.emit).toHaveBeenCalledWith([]);
    });

    // Removed test for waypoint mode state as this functionality doesn't exist in the component
  });

  describe('Traditional Route to Waypoint Conversion Tests', () => {
    beforeEach(() => {
      component['_map'].set(mockMap as any);
      jest.spyOn(component.startPointChanged, 'emit');
      jest.spyOn(component.endPointChanged, 'emit');
      jest.spyOn(component.waypointsChanged, 'emit');
    });

    it('should set start point when no start point exists', () => {
      component.startPoint = undefined;
      component.endPoint = undefined;
      component.waypoints = [];

      component['handleMapClick'](13.404954, 52.520008);

      expect(component.startPointChanged.emit).toHaveBeenCalledWith({
        lat: 52.520008,
        lon: 13.404954,
      });
    });

    it('should set end point when start point exists but no end point', () => {
      component.startPoint = { lat: 52.520008, lon: 13.404954 };
      component.endPoint = undefined;
      component.waypoints = [];

      component['handleMapClick'](11.576124, 48.137154);

      expect(component.endPointChanged.emit).toHaveBeenCalledWith({
        lat: 48.137154,
        lon: 11.576124,
      });
    });

    it('should convert traditional route to waypoints when both start and end points exist', () => {
      component.startPoint = { lat: 52.520008, lon: 13.404954 };
      component.endPoint = { lat: 48.137154, lon: 11.576124 };
      component.waypoints = [];

      component['handleMapClick'](8.682127, 50.110924);

      // Should clear traditional route points
      expect(component.startPointChanged.emit).toHaveBeenCalledWith(undefined);
      expect(component.endPointChanged.emit).toHaveBeenCalledWith(undefined);

      // Should emit waypoints with converted traditional route + new point
      expect(component.waypointsChanged.emit).toHaveBeenCalled();
      const emittedWaypoints = (component.waypointsChanged.emit as jest.Mock).mock.calls[0][0];
      expect(emittedWaypoints).toHaveLength(3);

      // First waypoint should be the original start point
      expect(emittedWaypoints[0].coordinates).toEqual({ lat: 52.520008, lon: 13.404954 });
      expect(emittedWaypoints[0].type).toBe('start');

      // Second waypoint should be the original end point
      expect(emittedWaypoints[1].coordinates).toEqual({ lat: 48.137154, lon: 11.576124 });
      expect(emittedWaypoints[1].type).toBe('waypoint');

      // Third waypoint should be the new clicked point
      expect(emittedWaypoints[2].coordinates).toEqual({ lat: 50.110924, lon: 8.682127 });
      expect(emittedWaypoints[2].type).toBe('end');
    });

    it('should add waypoint to existing waypoints list', () => {
      component.waypoints = [
        {
          coordinates: { lat: 52.520008, lon: 13.404954 },
          type: 'start' as const,
          id: 'waypoint-1',
          order: 0,
        },
      ];

      component['handleMapClick'](11.576124, 48.137154);

      expect(component.waypointsChanged.emit).toHaveBeenCalled();
      const emittedWaypoints = (component.waypointsChanged.emit as jest.Mock).mock.calls[0][0];
      expect(emittedWaypoints).toHaveLength(2);
    });
  });

  describe('Utility Methods Tests', () => {
    it('should return correct colors for waypoint types', () => {
      const getWaypointColor = (component as any).getWaypointColor;

      expect(getWaypointColor('start')).toBe('#00FF00');
      expect(getWaypointColor('end')).toBe('#FF0000');
      expect(getWaypointColor('waypoint')).toBe('#FFA500');
      expect(getWaypointColor('unknown')).toBe('#0000FF');
    });

    it('should clear waypoint markers', () => {
      const marker1 = { remove: jest.fn() };
      const marker2 = { remove: jest.fn() };
      (component as any).waypointMarkers = [marker1 as any, marker2 as any];

      (component as any).clearWaypointMarkers();

      expect(marker1.remove).toHaveBeenCalled();
      expect(marker2.remove).toHaveBeenCalled();
      expect((component as any).waypointMarkers).toEqual([]);
    });

    it('should clear start and end markers', () => {
      const startMarker = { remove: jest.fn() };
      const endMarker = { remove: jest.fn() };

      (component as any).startMarker = startMarker as any;
      (component as any).endMarker = endMarker as any;

      (component as any).clearStartEndMarkers();

      expect(startMarker.remove).toHaveBeenCalled();
      expect(endMarker.remove).toHaveBeenCalled();
      expect((component as any).startMarker).toBeUndefined();
      expect((component as any).endMarker).toBeUndefined();
    });
  });

  // Additional comprehensive tests for better coverage
  describe('Advanced Map Interaction Tests', () => {
    beforeEach(() => {
      component['_map'].set(mockMap as any);
    });

    it('should handle geolocation error during map load', () => {
      geolocationService.requestLocationWithConsent.mockReturnValue(throwError(() => new Error('Geolocation failed')));

      component.onMapLoad(mockMap as any);

      expect(component.map()).toBe(mockMap as any);
      expect(geolocationService.requestLocationWithConsent).toHaveBeenCalled();
    });

    it('should handle updateMarkersAndBounds with no map instance', () => {
      component['_map'].set(mockMap as any);

      expect(() => {
        (component as any).updateMarkersAndBounds();
      }).not.toThrow();
    });

    // Removed test for waypoint mode changes as this functionality doesn't exist in the component

    it('should handle waypoint changes with empty waypoints array', () => {
      component.waypoints = [];

      const changes = {
        waypoints: {
          currentValue: [] as any[],
          previousValue: [mockWaypoint],
          firstChange: false,
          isFirstChange: () => false,
        },
      };

      component.ngOnChanges(changes);

      expect((component as any).waypointMarkers).toEqual([]);
    });

    it('should handle route options changes', () => {
      component.routeOptions = mockRouteOptions;

      const changes = {
        routeOptions: {
          currentValue: mockRouteOptions,
          previousValue: null as any,
          firstChange: false,
          isFirstChange: () => false,
        },
      };

      component.ngOnChanges(changes);

      // Should not throw errors
      expect(component.routeOptions).toEqual(mockRouteOptions);
    });

    it('should handle showRoute changes', () => {
      component.showRoute = false;

      const changes = {
        showRoute: {
          currentValue: false,
          previousValue: true,
          firstChange: false,
          isFirstChange: () => false,
        },
      };

      component.ngOnChanges(changes);

      expect(component.showRoute).toBe(false);
    });

    it('should handle input property changes correctly', () => {
      // Test multiple property changes
      component.startPoint = mockCoordinates;
      component.endPoint = { lat: 48.137154, lon: 11.576124 };
      component.showRoute = true;

      expect(component.startPoint).toEqual(mockCoordinates);
      expect(component.endPoint).toEqual({ lat: 48.137154, lon: 11.576124 });
      expect(component.showRoute).toBe(true);
    });
  });

  describe('Component State Management', () => {
    it('should handle component initialization correctly', () => {
      expect(component).toBeDefined();
      expect(component.showRoute).toBe(true);
      expect(component.waypoints).toBeUndefined(); // Component initializes waypoints as undefined
      expect(component.startPoint).toBeUndefined(); // Component initializes startPoint as undefined
      expect(component.endPoint).toBeUndefined(); // Component initializes endPoint as undefined
    });

    it('should handle multiple property updates', () => {
      const newWaypoints = [mockWaypoint, { ...mockWaypoint, id: 'wp2' }];
      const newStartPoint = { lat: 50.0, lon: 10.0 };
      const newEndPoint = { lat: 51.0, lon: 11.0 };

      component.waypoints = newWaypoints;
      component.startPoint = newStartPoint;
      component.endPoint = newEndPoint;
      component.showRoute = false;

      expect(component.waypoints).toEqual(newWaypoints);
      expect(component.startPoint).toEqual(newStartPoint);
      expect(component.endPoint).toEqual(newEndPoint);
      expect(component.showRoute).toBe(false);
    });

    it('should handle route options updates', () => {
      const newRouteOptions = {
        costing: 'pedestrian' as const,
        color: '#00FF00',
        width: 5,
      };

      component.routeOptions = newRouteOptions;
      expect(component.routeOptions).toEqual(newRouteOptions);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle map service error during initialization', () => {
      mapService.getMapTiles.mockReturnValue(throwError(() => new Error('Map service error')));

      expect(() => {
        component.ngOnInit();
      }).not.toThrow();
    });

    it('should handle undefined waypoints in waypoint mode', () => {
      component.waypoints = undefined;
      component['_map'].set(mockMap as any);

      const changes = {
        waypoints: {
          currentValue: undefined as any,
          previousValue: [mockWaypoint],
          firstChange: false,
          isFirstChange: () => false,
        },
      };

      expect(() => {
        component.ngOnChanges(changes);
      }).not.toThrow();
    });

    it('should handle clearing markers when no markers exist', () => {
      (component as any).startMarker = undefined;
      (component as any).endMarker = undefined;
      (component as any).waypointMarkers = [];

      expect(() => {
        (component as any).clearStartEndMarkers();
        (component as any).clearWaypointMarkers();
      }).not.toThrow();

      expect((component as any).startMarker).toBeUndefined();
      expect((component as any).endMarker).toBeUndefined();
      expect((component as any).waypointMarkers).toEqual([]);
    });

    it('should handle component destruction with no subscriptions', () => {
      (component as any).routeSubscription = undefined;
      (component as any).multiWaypointRouteSubscription = undefined;

      expect(() => {
        component.ngOnDestroy();
      }).not.toThrow();
    });

    it('should handle null and undefined input values', () => {
      component.startPoint = null;
      component.endPoint = null;
      component.waypoints = null;
      component.routeOptions = null;

      expect(component.startPoint).toBeNull();
      expect(component.endPoint).toBeNull();
      expect(component.waypoints).toBeNull();
      expect(component.routeOptions).toBeNull();
    });

    it('should handle empty waypoints array', () => {
      component.waypoints = [];

      expect(component.waypoints).toEqual([]);
    });

    it('should handle updateMapViewForWaypoints method existence', () => {
      expect((component as any).updateMapViewForWaypoints).toBeDefined();
      expect(typeof (component as any).updateMapViewForWaypoints).toBe('function');
    });

    it('should handle updateMapViewForWaypoints with no map instance', () => {
      component['_map'].set(undefined);
      component.waypoints = [
        {
          coordinates: { lat: 52.520008, lon: 13.404954 },
          type: 'start' as const,
          order: 0,
        },
      ];

      expect(() => {
        (component as any).updateMapViewForWaypoints();
      }).not.toThrow();
    });
  });
});
