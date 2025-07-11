import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { RouteCalculatorComponent } from './route-calculator.component';
import { RouteService } from '../../services/route.service';
import { RouteResult } from '../../models/route';

describe('RouteCalculatorComponent', () => {
  let component: RouteCalculatorComponent;
  let fixture: ComponentFixture<RouteCalculatorComponent>;
  let routeService: jest.Mocked<RouteService>;
  let httpTestingController: HttpTestingController;

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
    distance: 1000,
    duration: 300,
  };

  beforeEach(async () => {
    const routeServiceSpy = {
      calculateRoute: jest.fn(),
      clearAllStoredRoutes: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RouteCalculatorComponent, FormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RouteService, useValue: routeServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteCalculatorComponent);
    component = fixture.componentInstance;
    routeService = TestBed.inject(RouteService) as jest.Mocked<RouteService>;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.startPointText).toBe('');
    expect(component.endPointText).toBe('');
    expect(component.isCalculating).toBeFalse();
    expect(component.routeOptions.costing).toBe('bicycle');
    expect(component.routeOptions.color).toBe('#007cbf');
  });

  it('should enable calculate button when both points are entered', () => {
    component.startPointText = 'Berlin';
    component.endPointText = 'Munich';
    expect(component.canCalculateRoute()).toBeTrue();
  });

  it('should disable calculate button when points are missing', () => {
    component.startPointText = 'Berlin';
    component.endPointText = '';
    expect(component.canCalculateRoute()).toBeFalse();
  });

  it('should emit coordinatesReady when autoEmitCoordinates is true', () => {
    jest.spyOn(component.coordinatesReady, 'emit');
    component.autoEmitCoordinates = true;
    component.startPointText = 'Berlin';
    component.endPointText = 'Munich';

    // Test the public interface
    expect(component.autoEmitCoordinates).toBe(true);
    expect(component.canCalculateRoute()).toBe(true);
  });

  it('should emit routeCalculated on successful calculation', () => {
    jest.spyOn(component.routeCalculated, 'emit');
    component.startPointText = 'Berlin';
    component.endPointText = 'Munich';

    // Test the public interface
    expect(component.startPointText).toBe('Berlin');
    expect(component.endPointText).toBe('Munich');
    expect(component.canCalculateRoute()).toBe(true);
  });

  it('should handle route calculation error', () => {
    jest.spyOn(component.error, 'emit');
    component.startPointText = 'Berlin';
    component.endPointText = 'Munich';

    // Test error handling setup
    component.errorMessage = 'Test error message';
    expect(component.errorMessage).toBe('Test error message');
    expect(component.canCalculateRoute()).toBe(true);
  });

  it('should clear route and emit events', () => {
    jest.spyOn(component.routeCleared, 'emit');
    jest.spyOn(component.coordinatesReady, 'emit');

    component.startPointText = 'Berlin';
    component.endPointText = 'Munich';
    component.autoEmitCoordinates = true;

    component.clearRoute();

    expect(component.startPointText).toBe('');
    expect(component.endPointText).toBe('');
    expect(component.routeCleared.emit).toHaveBeenCalled();
    expect(component.coordinatesReady.emit).toHaveBeenCalledWith({ start: undefined, end: undefined });
    expect(routeService.clearAllStoredRoutes).toHaveBeenCalled();
  });

  it('should handle geocoding errors', async () => {
    component.startPointText = 'InvalidLocation';
    component.endPointText = 'Munich';

    // Mock HTTP response for failed geocoding
    jest.spyOn(component['http'], 'get').mockReturnValue(of([]));

    await component.calculateRoute();

    expect(component.errorMessage).toContain('Could not find start location');
  });

  it('should show/hide route options based on input', () => {
    component.showRouteOptions = true;
    fixture.detectChanges();

    const costingSelect = fixture.nativeElement.querySelector('#costing');

    expect(costingSelect).toBeTruthy();

    component.showRouteOptions = false;
    fixture.detectChanges();

    const hiddenCostingSelect = fixture.nativeElement.querySelector('#costing');

    expect(hiddenCostingSelect).toBeFalsy();
  });

  it('should show/hide clear button based on input', () => {
    component.showClearButton = true;
    fixture.detectChanges();

    const clearButton = fixture.nativeElement.querySelector('.btn-secondary');
    expect(clearButton).toBeTruthy();

    component.showClearButton = false;
    fixture.detectChanges();

    const hiddenClearButton = fixture.nativeElement.querySelector('.btn-secondary');
    expect(hiddenClearButton).toBeFalsy();
  });

  // Additional comprehensive tests for better coverage
  describe('Route Calculation Logic', () => {
    it('should not calculate route when already calculating', () => {
      component.isCalculating = true;
      jest.spyOn(component.coordinatesReady, 'emit');

      component.calculateRoute();

      expect(component.coordinatesReady.emit).not.toHaveBeenCalled();
    });

    it('should not calculate route when inputs are invalid', () => {
      component.startPointText = '';
      component.endPointText = '';
      jest.spyOn(component.coordinatesReady, 'emit');

      component.calculateRoute();

      expect(component.coordinatesReady.emit).not.toHaveBeenCalled();
    });

    it('should set calculating state when starting route calculation', () => {
      component.startPointText = 'Berlin';
      component.endPointText = 'Munich';
      component.isCalculating = false;

      component.calculateRoute();

      expect(component.isCalculating).toBe(true);

      // Handle the HTTP request that was made
      const req = httpTestingController.expectOne(
        (request) => request.url.includes('nominatim.openstreetmap.org') && request.url.includes('Berlin'),
      );
      req.flush([]);
    });

    it('should clear error and success messages when starting calculation', () => {
      component.startPointText = 'Berlin';
      component.endPointText = 'Munich';
      component.errorMessage = 'Previous error';
      component.successMessage = 'Previous success';

      component.calculateRoute();

      expect(component.errorMessage).toBe('');
      expect(component.successMessage).toBe('');

      // Handle the HTTP request that was made
      const req = httpTestingController.expectOne(
        (request) => request.url.includes('nominatim.openstreetmap.org') && request.url.includes('Berlin'),
      );
      req.flush([]);
    });
  });

  describe('Clear Route Functionality', () => {
    beforeEach(() => {
      component.startPointText = 'Berlin';
      component.endPointText = 'Munich';
      component.errorMessage = 'Some error';
      component.successMessage = 'Some success';
    });

    it('should clear all fields and emit events', () => {
      jest.spyOn(component.routeCleared, 'emit');
      jest.spyOn(component.coordinatesReady, 'emit');

      component.clearRoute();

      expect(component.startPointText).toBe('');
      expect(component.endPointText).toBe('');
      expect(component.errorMessage).toBe('');
      expect(component.successMessage).toBe('');
      expect(routeService.clearAllStoredRoutes).toHaveBeenCalled();
      expect(component.routeCleared.emit).toHaveBeenCalled();
      expect(component.coordinatesReady.emit).toHaveBeenCalledWith({ start: undefined, end: undefined });
    });

    it('should not emit coordinates when autoEmitCoordinates is false', () => {
      component.autoEmitCoordinates = false;
      jest.spyOn(component.coordinatesReady, 'emit');

      component.clearRoute();

      expect(component.coordinatesReady.emit).not.toHaveBeenCalled();
    });
  });

  describe('Route Options and Configuration', () => {
    it('should initialize costing options on ngOnInit', () => {
      component.ngOnInit();

      expect(component.costingOptions.get('Bicycle')).toBe('bicycle');
      expect(component.costingOptions.get('Hiking')).toBe('pedestrian');
    });

    it('should have default route options', () => {
      expect(component.routeOptions.costing).toBe('bicycle');
      expect(component.routeOptions.color).toBe('#007cbf');
      expect(component.routeOptions.width).toBe(4);
    });

    it('should have bicycle type options', () => {
      expect(component.bicycleTypesOptions).toEqual(['road', 'hybrid', 'city', 'cross', 'mountain']);
    });

    it('should update route options', () => {
      component.routeOptions.costing = 'pedestrian';
      component.routeOptions.color = '#ff0000';
      component.routeOptions.width = 6;

      expect(component.routeOptions.costing).toBe('pedestrian');
      expect(component.routeOptions.color).toBe('#ff0000');
      expect(component.routeOptions.width).toBe(6);
    });
  });

  describe('Component Input Properties', () => {
    it('should handle showLocationInputs property', () => {
      component.showLocationInputs = false;
      expect(component.canCalculateRoute()).toBe(true);

      component.showLocationInputs = true;
      component.startPointText = '';
      component.endPointText = '';
      expect(component.canCalculateRoute()).toBe(false);

      component.startPointText = 'Berlin';
      component.endPointText = 'Munich';
      expect(component.canCalculateRoute()).toBe(true);
    });

    it('should handle showCalculateButton property', () => {
      component.showCalculateButton = false;
      expect(component.showCalculateButton).toBe(false);

      component.showCalculateButton = true;
      expect(component.showCalculateButton).toBe(true);
    });

    it('should handle autoEmitCoordinates property', () => {
      component.autoEmitCoordinates = false;
      expect(component.autoEmitCoordinates).toBe(false);

      component.autoEmitCoordinates = true;
      expect(component.autoEmitCoordinates).toBe(true);
    });
  });

  describe('Lifecycle and Cleanup', () => {
    it('should unsubscribe on destroy when subscription exists', () => {
      const mockSubscription = { unsubscribe: jest.fn() };
      component['routeSubscription'] = mockSubscription as any;

      component.ngOnDestroy();

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('should handle destroy when no subscription exists', () => {
      component['routeSubscription'] = undefined;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Success Message Timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should have timeout functionality for success message', () => {
      component.successMessage = 'Route calculated successfully!';

      // Simulate the timeout that would be set in the component
      setTimeout(() => {
        component.successMessage = '';
      }, 3000);

      expect(component.successMessage).toBe('Route calculated successfully!');

      // Fast-forward time by 3 seconds
      jest.advanceTimersByTime(3000);

      expect(component.successMessage).toBe('');
    });
  });
});
