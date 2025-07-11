import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { LibreMapComponent } from './libre-map.component';
import { GeolocationService } from '../services/geolocation.service';

describe('LibreMapComponent', () => {
  let component: LibreMapComponent;
  let fixture: ComponentFixture<LibreMapComponent>;
  let geolocationService: jasmine.SpyObj<GeolocationService>;

  beforeEach(async () => {
    const geolocationSpy = jasmine.createSpyObj('GeolocationService', ['requestLocationWithConsent']);

    await TestBed.configureTestingModule({
      imports: [LibreMapComponent, HttpClientTestingModule],
      providers: [
        { provide: GeolocationService, useValue: geolocationSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LibreMapComponent);
    component = fixture.componentInstance;
    geolocationService = TestBed.inject(GeolocationService) as jasmine.SpyObj<GeolocationService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have requestUserLocationConsent method', () => {
    expect(component.requestUserLocationConsent).toBeDefined();
    expect(typeof component.requestUserLocationConsent).toBe('function');
  });

  it('should call geolocation service when requesting user location consent', () => {
    // Mock the geolocation service to return an observable
    geolocationService.requestLocationWithConsent.and.returnValue(of({ lat: 52.5200, lon: 13.4050 }));

    // Mock the map instance
    component.map = {
      flyTo: jasmine.createSpy('flyTo')
    } as any;

    // Call the method
    component.requestUserLocationConsent();

    // Verify the service was called
    expect(geolocationService.requestLocationWithConsent).toHaveBeenCalled();
  });
});
