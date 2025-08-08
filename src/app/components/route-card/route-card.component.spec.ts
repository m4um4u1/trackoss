import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RouteCardComponent } from './route-card.component';
import { RouteResponse, RouteType } from '../../models/backend-api';
import { SurfaceType } from '../../models/route-metadata';
import { AuthService } from '../../services/auth.service';

describe('RouteCardComponent', () => {
  let component: RouteCardComponent;
  let fixture: ComponentFixture<RouteCardComponent>;

  const mockRoute: RouteResponse = {
    id: 'route-1',
    name: 'Test Route',
    description: 'A test route description',
    routeType: RouteType.CYCLING,
    totalDistance: 15000,
    estimatedDuration: 3600,
    totalElevationGain: 250,
    isPublic: true,
    createdAt: [2025, 8, 3, 3, 14, 3, 610109000],
    updatedAt: [2025, 8, 3, 3, 14, 3, 610235000],
    userId: 'user-1',
    points: [],
    pointCount: 0,
    metadata: JSON.stringify({
      surface: SurfaceType.ASPHALT,
      difficulty: 3,
    }),
  };

  const mockRouteWithArrayDate: RouteResponse = {
    ...mockRoute,
    createdAt: [2023, 1, 1, 10, 30, 0, 0] as any,
  };

  beforeEach(async () => {
    const authServiceSpy = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      getCurrentUserValue: jest.fn().mockReturnValue({ id: 'user-1' }),
    };

    await TestBed.configureTestingModule({
      imports: [RouteCardComponent, RouterModule.forRoot([])],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteCardComponent);
    component = fixture.componentInstance;
    component.route = mockRoute;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse metadata correctly', () => {
    const metadata = component.parsedMetadata;
    expect(metadata).toEqual({
      surface: SurfaceType.ASPHALT,
      difficulty: 3,
    });
  });

  it('should return null for invalid metadata', () => {
    component.route = { ...mockRoute, metadata: 'invalid json' };
    expect(component.parsedMetadata).toBeNull();
  });

  it('should return null for null metadata', () => {
    component.route = { ...mockRoute, metadata: null };
    expect(component.parsedMetadata).toBeNull();
  });

  describe('formattedDistance', () => {
    it('should format distance correctly for meters', () => {
      component.route = { ...mockRoute, totalDistance: 500 };
      expect(component.formattedDistance).toBe('500 m');
    });

    it('should format distance correctly for kilometers', () => {
      component.route = { ...mockRoute, totalDistance: 15000 };
      expect(component.formattedDistance).toBe('15 km');
    });

    it('should format distance correctly for kilometers with meters', () => {
      component.route = { ...mockRoute, totalDistance: 15250 };
      expect(component.formattedDistance).toBe('15 km 250 m');
    });

    it('should handle thousands separator format', () => {
      component.route = { ...mockRoute, totalDistance: '32.021' as any };
      expect(component.formattedDistance).toBe('32 km 21 m');
    });

    it('should handle null distance', () => {
      component.route = { ...mockRoute, totalDistance: null as any };
      expect(component.formattedDistance).toBe('N/A');
    });

    it('should handle undefined distance', () => {
      component.route = { ...mockRoute, totalDistance: undefined as any };
      expect(component.formattedDistance).toBe('N/A');
    });

    it('should handle invalid distance', () => {
      component.route = { ...mockRoute, totalDistance: 'invalid' as any };
      expect(component.formattedDistance).toBe('N/A');
    });
  });

  describe('formattedDuration', () => {
    it('should format duration with hours and minutes', () => {
      component.route = { ...mockRoute, estimatedDuration: 3660 }; // 1h 1m
      expect(component.formattedDuration).toBe('1h 1m');
    });

    it('should format duration with only minutes', () => {
      component.route = { ...mockRoute, estimatedDuration: 1800 }; // 30m
      expect(component.formattedDuration).toBe('30m');
    });

    it('should handle zero duration', () => {
      component.route = { ...mockRoute, estimatedDuration: 0 };
      expect(component.formattedDuration).toBe('0m');
    });
  });

  it('should format elevation correctly', () => {
    expect(component.formattedElevation).toBe('250m');
  });

  describe('routeTypeIcon', () => {
    it('should return correct icon for cycling routes', () => {
      component.route = { ...mockRoute, routeType: RouteType.CYCLING };
      expect(component.routeTypeIcon).toBe('bi-bicycle');

      component.route = { ...mockRoute, routeType: RouteType.ROAD_CYCLING };
      expect(component.routeTypeIcon).toBe('bi-bicycle');

      component.route = { ...mockRoute, routeType: RouteType.E_BIKE };
      expect(component.routeTypeIcon).toBe('bi-bicycle');

      component.route = { ...mockRoute, routeType: RouteType.MOUNTAIN_BIKING };
      expect(component.routeTypeIcon).toBe('bi-bicycle');

      component.route = { ...mockRoute, routeType: RouteType.GRAVEL };
      expect(component.routeTypeIcon).toBe('bi-bicycle');
    });

    it('should return correct icon for walking routes', () => {
      component.route = { ...mockRoute, routeType: RouteType.WALKING };
      expect(component.routeTypeIcon).toBe('bi-person-walking');
    });

    it('should return correct icon for running routes', () => {
      component.route = { ...mockRoute, routeType: RouteType.RUNNING };
      expect(component.routeTypeIcon).toBe('bi-person-running');
    });

    it('should return correct icon for hiking routes', () => {
      component.route = { ...mockRoute, routeType: RouteType.HIKING };
      expect(component.routeTypeIcon).toBe('bi-tree');
    });

    it('should return default icon for other routes', () => {
      component.route = { ...mockRoute, routeType: RouteType.OTHER };
      expect(component.routeTypeIcon).toBe('bi-geo-alt');
    });
  });

  describe('routeTypeColor', () => {
    it('should return correct color for different route types', () => {
      component.route = { ...mockRoute, routeType: RouteType.CYCLING };
      expect(component.routeTypeColor).toBe('primary');

      component.route = { ...mockRoute, routeType: RouteType.MOUNTAIN_BIKING };
      expect(component.routeTypeColor).toBe('danger');

      component.route = { ...mockRoute, routeType: RouteType.GRAVEL };
      expect(component.routeTypeColor).toBe('warning');

      component.route = { ...mockRoute, routeType: RouteType.WALKING };
      expect(component.routeTypeColor).toBe('success');

      component.route = { ...mockRoute, routeType: RouteType.RUNNING };
      expect(component.routeTypeColor).toBe('warning');

      component.route = { ...mockRoute, routeType: RouteType.HIKING };
      expect(component.routeTypeColor).toBe('info');

      component.route = { ...mockRoute, routeType: RouteType.OTHER };
      expect(component.routeTypeColor).toBe('secondary');
    });
  });

  describe('difficultyStars', () => {
    it('should return correct difficulty stars', () => {
      component.route = { ...mockRoute, metadata: JSON.stringify({ difficulty: 3 }) };
      const stars = component.difficultyStars;
      expect(stars).toEqual([1, 1, 1, 0, 0]);
    });

    it('should default to 1 star when no difficulty is provided', () => {
      component.route = { ...mockRoute, metadata: null };
      const stars = component.difficultyStars;
      expect(stars).toEqual([1, 0, 0, 0, 0]);
    });

    it('should handle maximum difficulty', () => {
      component.route = { ...mockRoute, metadata: JSON.stringify({ difficulty: 5 }) };
      const stars = component.difficultyStars;
      expect(stars).toEqual([1, 1, 1, 1, 1]);
    });
  });

  describe('surfaceTypeDisplay', () => {
    it('should return formatted surface type', () => {
      component.route = { ...mockRoute, metadata: JSON.stringify({ surface: SurfaceType.ASPHALT }) };
      expect(component.surfaceTypeDisplay).toBe('Asphalt');
    });

    it('should return empty string when no surface type', () => {
      component.route = { ...mockRoute, metadata: null };
      expect(component.surfaceTypeDisplay).toBe('');
    });
  });

  describe('formattedCreatedAt', () => {
    it('should format string date correctly', () => {
      component.route = { ...mockRoute, createdAt: [2025, 8, 3, 3, 14, 3, 610109000] };
      const formatted = component.formattedCreatedAt;
      // Accept different locale date formats (with slashes, dots, or dashes)
      expect(formatted).toMatch(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}/);
    });

    it('should format array date correctly', () => {
      component.route = mockRouteWithArrayDate;
      const formatted = component.formattedCreatedAt;
      // Accept different locale date formats (with slashes, dots, or dashes)
      expect(formatted).toMatch(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}/);
    });

    it('should handle invalid date', () => {
      component.route = { ...mockRoute, createdAt: 'invalid-date' as any };
      expect(component.formattedCreatedAt).toBe('N/A');
    });
  });

  it('should format route type correctly', () => {
    expect(component.formatRouteType(RouteType.MOUNTAIN_BIKING)).toBe('Mountain Biking');
    expect(component.formatRouteType(RouteType.ROAD_CYCLING)).toBe('Road Cycling');
    expect(component.formatRouteType(RouteType.E_BIKE)).toBe('E Bike');
  });

  describe('formatEnumValue', () => {
    it('should format enum values correctly', () => {
      // Access private method for testing
      const formatEnumValue = (component as any).formatEnumValue.bind(component);

      expect(formatEnumValue('MOUNTAIN_BIKING')).toBe('Mountain Biking');
      expect(formatEnumValue('road_cycling')).toBe('Road Cycling');
      expect(formatEnumValue('e_bike')).toBe('E Bike');
      expect(formatEnumValue('asphalt')).toBe('Asphalt');
    });
  });

  it('should handle route with minimal data', () => {
    component.route = {
      id: 'minimal-route',
      name: 'Minimal Route',
      description: '',
      routeType: RouteType.OTHER,
      totalDistance: 0,
      estimatedDuration: 0,
      totalElevationGain: 0,
      isPublic: false,
      createdAt: [2025, 8, 3, 3, 14, 3, 610109000],
      updatedAt: [2025, 8, 3, 3, 14, 3, 610235000],
      userId: 'user-1',
      points: [],
      pointCount: 0,
      metadata: null,
    };
    fixture.detectChanges();

    expect(component.formattedDistance).toBe('0 m');
    expect(component.formattedDuration).toBe('0m');
    expect(component.formattedElevation).toBe('0m');
    expect(component.routeTypeIcon).toBe('bi-geo-alt');
    expect(component.routeTypeColor).toBe('secondary');
    expect(component.surfaceTypeDisplay).toBe('');
    expect(component.difficultyStars).toEqual([1, 0, 0, 0, 0]);
  });

  it('should emit routeDeleted when delete is called', () => {
    jest.spyOn(component.routeDeleted, 'emit');

    component.onDeleteRoute();

    expect(component.routeDeleted.emit).toHaveBeenCalledWith('route-1');
  });

  it('should render delete button with correct icon and styling', () => {
    fixture.detectChanges();
    const deleteButton = fixture.nativeElement.querySelector('button[title="Delete route"]');
    expect(deleteButton).toBeTruthy();
    expect(deleteButton.classList).toContain('btn-danger');
    expect(deleteButton.querySelector('i.bi-trash')).toBeTruthy();
  });
});
