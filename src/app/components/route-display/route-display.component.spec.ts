import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RouteDisplayComponent } from './route-display.component';
import { RouteService } from '../../services/route.service';
import { RouteResult } from '../../models/route';
import { HttpClient } from '@angular/common/http';

describe('RouteDisplayComponent', () => {
  let component: RouteDisplayComponent;
  let fixture: ComponentFixture<RouteDisplayComponent>;

  // Mock AuthService
  class MockAuthService {
    isAuthenticated() {
      return false;
    }

    getUser() {
      return null;
    }
  }

  const mockRouteResult: RouteResult = {
    startPoint: { lat: 52.520008, lon: 13.404954 },
    endPoint: { lat: 52.516275, lon: 13.377704 },
    routeData: {
      distance: 1500,
      duration: 300,
      elevationGain: 50,
      elevationLoss: 30,
      routeGeometry: {
        type: 'LineString',
        coordinates: [
          [13.404954, 52.520008],
          [13.405, 52.5201],
          [13.377704, 52.516275],
        ],
      },
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
      providers: [
        { provide: RouteService, useValue: routeServiceSpy },
        { provide: 'AuthService', useClass: MockAuthService },
        { provide: HttpClient, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle formatting with extreme values', () => {
      // Test with extreme values
      component.routeResult = {
        ...mockRouteResult,
        routeData: {
          ...mockRouteResult.routeData,
          distance: 1000000, // 1000 km
          duration: 100000, // 100,000 seconds (~1.5 days)
          elevationGain: 10000, // 10 km
          elevationLoss: 10000, // 10 km
        },
      };
      fixture.detectChanges();

      // Check that the component handles extreme values without crashing
      expect(component).toBeTruthy();
    });

    it('should handle coordinates with many decimal places', () => {
      // Test with many decimal places
      component.routeResult = {
        ...mockRouteResult,
        startPoint: { lat: 52.520008123456789, lon: 13.404954123456789 },
        endPoint: { lat: 52.516275123456789, lon: 13.377704123456789 },
        routeData: {
          ...mockRouteResult.routeData,
          routeGeometry: {
            type: 'LineString',
            coordinates: [
              [13.404954123456789, 52.520008123456789],
              [13.405123456789, 52.5201123456789],
              [13.377704123456789, 52.516275123456789],
            ],
          },
        },
      };
      fixture.detectChanges();

      // Check that the component handles many decimal places without crashing
      expect(component).toBeTruthy();
    });

    it('should handle null and undefined values gracefully', () => {
      // Test with null values
      component.routeResult = null;
      fixture.detectChanges();
      expect(component).toBeTruthy();

      // Test with undefined values
      component.routeResult = undefined;
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  });
});
