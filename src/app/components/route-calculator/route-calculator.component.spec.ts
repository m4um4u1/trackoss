import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { RouteCalculatorComponent } from './route-calculator.component';
import { RouteService } from '../../services/route.service';
import { RouteResult } from '../../models/route';

describe('RouteCalculatorComponent', () => {
  let component: RouteCalculatorComponent;
  let fixture: ComponentFixture<RouteCalculatorComponent>;
  let routeService: jasmine.SpyObj<RouteService>;

  const mockRouteResult: RouteResult = {
    startPoint: { lat: 52.520008, lon: 13.404954 },
    endPoint: { lat: 52.516275, lon: 13.377704 },
    routeData: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [[13.404954, 52.520008], [13.377704, 52.516275]]
        }
      }]
    },
    distance: 1000,
    duration: 300
  };

  beforeEach(async () => {
    const routeServiceSpy = jasmine.createSpyObj('RouteService', [
      'calculateRoute',
      'clearAllStoredRoutes'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        RouteCalculatorComponent,
        HttpClientTestingModule,
        FormsModule
      ],
      providers: [
        { provide: RouteService, useValue: routeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RouteCalculatorComponent);
    component = fixture.componentInstance;
    routeService = TestBed.inject(RouteService) as jasmine.SpyObj<RouteService>;
    fixture.detectChanges();
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

  it('should emit coordinatesReady when autoEmitCoordinates is true', async () => {
    spyOn(component.coordinatesReady, 'emit');
    component.autoEmitCoordinates = true;
    component.startPointText = 'Berlin';
    component.endPointText = 'Munich';

    // Mock HTTP responses for geocoding
    spyOn(component['http'], 'get').and.returnValues(
      of([{ lat: '52.520008', lon: '13.404954' }]),
      of([{ lat: '48.137154', lon: '11.576124' }])
    );

    routeService.calculateRoute.and.returnValue(of(mockRouteResult));

    await component.calculateRoute();

    expect(component.coordinatesReady.emit).toHaveBeenCalled();
  });

  it('should emit routeCalculated on successful calculation', async () => {
    spyOn(component.routeCalculated, 'emit');
    component.startPointText = 'Berlin';
    component.endPointText = 'Munich';

    // Mock HTTP responses for geocoding
    spyOn(component['http'], 'get').and.returnValues(
      of([{ lat: '52.520008', lon: '13.404954' }]),
      of([{ lat: '48.137154', lon: '11.576124' }])
    );

    routeService.calculateRoute.and.returnValue(of(mockRouteResult));

    await component.calculateRoute();

    expect(component.routeCalculated.emit).toHaveBeenCalledWith(mockRouteResult);
  });

  it('should handle route calculation error', async () => {
    spyOn(component.error, 'emit');
    component.startPointText = 'Berlin';
    component.endPointText = 'Munich';

    // Mock HTTP responses for geocoding
    spyOn(component['http'], 'get').and.returnValues(
      of([{ lat: '52.520008', lon: '13.404954' }]),
      of([{ lat: '48.137154', lon: '11.576124' }])
    );

    routeService.calculateRoute.and.returnValue(throwError('Route calculation failed'));

    await component.calculateRoute();

    expect(component.errorMessage).toBe('Failed to calculate route. Please try again.');
    expect(component.error.emit).toHaveBeenCalled();
  });

  it('should clear route and emit events', () => {
    spyOn(component.routeCleared, 'emit');
    spyOn(component.coordinatesReady, 'emit');
    
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
    spyOn(component['http'], 'get').and.returnValue(of([]));

    await component.calculateRoute();

    expect(component.errorMessage).toContain('Could not find start location');
  });

  it('should show/hide route options based on input', () => {
    component.showRouteOptions = true;
    fixture.detectChanges();
    
    const costingSelect = fixture.nativeElement.querySelector('#costing');
    const colorInput = fixture.nativeElement.querySelector('#routeColor');
    
    expect(costingSelect).toBeTruthy();
    expect(colorInput).toBeTruthy();

    component.showRouteOptions = false;
    fixture.detectChanges();
    
    const hiddenCostingSelect = fixture.nativeElement.querySelector('#costing');
    const hiddenColorInput = fixture.nativeElement.querySelector('#routeColor');
    
    expect(hiddenCostingSelect).toBeFalsy();
    expect(hiddenColorInput).toBeFalsy();
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
});