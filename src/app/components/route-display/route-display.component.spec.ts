import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RouteDisplayComponent } from './route-display.component';
import { RouteService } from '../../services/route.service';
import { RouteResult } from '../../models/route';

describe('RouteDisplayComponent', () => {
  let component: RouteDisplayComponent;
  let fixture: ComponentFixture<RouteDisplayComponent>;
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
    distance: 1500,
    duration: 450
  };

  beforeEach(async () => {
    const routeServiceSpy = jasmine.createSpyObj('RouteService', [
      'getCurrentRoute'
    ], {
      currentRoute$: of(mockRouteResult)
    });

    await TestBed.configureTestingModule({
      imports: [RouteDisplayComponent],
      providers: [
        { provide: RouteService, useValue: routeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RouteDisplayComponent);
    component = fixture.componentInstance;
    routeService = TestBed.inject(RouteService) as jasmine.SpyObj<RouteService>;
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
    expect(distanceElement.textContent).toContain('1.5 km');
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
    expect(component.formatDistance(500)).toBe('0.5 km');
    expect(component.formatDistance(1500)).toBe('1.5 km');
    expect(component.formatDistance(100)).toBe('0.1 km');
  });

  it('should format duration correctly', () => {
    expect(component.formatDuration(60)).toBe('1 min');
    expect(component.formatDuration(120)).toBe('2 min');
    expect(component.formatDuration(3600)).toBe('1 hr');
    expect(component.formatDuration(3660)).toBe('1 hr 1 min');
  });

  it('should format coordinates correctly', () => {
    const coords = { lat: 52.520008, lon: 13.404954 };
    const formatted = component.formatCoordinates(coords);
    expect(formatted).toBe('52.520, 13.405');
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

  it('should emit routeExported when export button is clicked', () => {
    spyOn(component.routeExported, 'emit');
    component.routeResult = mockRouteResult;
    component.showActions = true;
    fixture.detectChanges();

    const exportButton = fixture.nativeElement.querySelector('.btn-primary');
    exportButton.click();

    expect(component.routeExported.emit).toHaveBeenCalledWith(mockRouteResult);
  });

  it('should emit routeShared when share button is clicked', () => {
    spyOn(component.routeShared, 'emit');
    component.routeResult = mockRouteResult;
    component.showActions = true;
    fixture.detectChanges();

    const shareButton = fixture.nativeElement.querySelector('.btn-secondary');
    shareButton.click();

    expect(component.routeShared.emit).toHaveBeenCalledWith(mockRouteResult);
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
    spyOn(component['subscription'], 'unsubscribe');

    component.ngOnDestroy();

    expect(component['subscription'].unsubscribe).toHaveBeenCalled();
  });
});