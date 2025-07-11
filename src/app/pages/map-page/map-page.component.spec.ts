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
});
