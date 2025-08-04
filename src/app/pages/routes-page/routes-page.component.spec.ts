import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { RoutesPageComponent } from './routes-page.component';
import { BackendApiService } from '../../services/backend-api.service';
import { RouteFilters, RouteFiltersComponent } from '../../components/route-filters/route-filters.component';
import { RouteCardComponent } from '../../components/route-card/route-card.component';
import { PageResponse, RouteResponse, RouteType } from '../../models/backend-api';
import { SurfaceType } from '../../models/route-metadata';

describe('RoutesPageComponent', () => {
  let component: RoutesPageComponent;
  let fixture: ComponentFixture<RoutesPageComponent>;
  let mockBackendApiService: jest.Mocked<BackendApiService>;
  let mockRouter: jest.Mocked<Router>;

  const mockRoute: RouteResponse = {
    id: 'route-1',
    name: 'Test Route',
    description: 'A test route',
    routeType: RouteType.CYCLING,
    totalDistance: 10000,
    estimatedDuration: 3600,
    totalElevationGain: 100,
    isPublic: true,
    createdAt: [2023, 1, 1, 0, 0, 0, 0],
    updatedAt: [2023, 1, 1, 0, 0, 0, 0],
    userId: 'user-1',
    points: [],
    pointCount: 0,
    metadata: null,
  };

  const mockPageResponse: PageResponse<RouteResponse> = {
    content: [mockRoute],
    totalPages: 1,
    totalElements: 1,
    number: 0,
    size: 12,
    first: true,
    last: true,
    empty: false,
    numberOfElements: 1,
  };

  beforeEach(async () => {
    const backendApiServiceSpy = {
      getPublicRoutes: jest.fn().mockReturnValue(of(mockPageResponse)),
      getRoutes: jest.fn().mockReturnValue(of(mockPageResponse)),
      deleteRoute: jest.fn().mockReturnValue(of(void 0)),
    };

    const routerSpy = {
      navigate: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RoutesPageComponent, RouteFiltersComponent, RouteCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BackendApiService, useValue: backendApiServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoutesPageComponent);
    component = fixture.componentInstance;
    mockBackendApiService = TestBed.inject(BackendApiService) as jest.Mocked<BackendApiService>;
    mockRouter = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.routes()).toEqual([]);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.currentPage()).toBe(0);
    expect(component.totalPages()).toBe(0);
    expect(component.totalElements()).toBe(0);
    expect(component.pageSize()).toBe(12);
  });

  it('should initialize with default filters', () => {
    const filters = component.currentFilters();
    expect(filters.searchText).toBe('');
    expect(filters.routeType).toBe('');
    expect(filters.difficulty).toBe('');
    expect(filters.minDistance).toBe(0);
    expect(filters.maxDistance).toBe(100);
    expect(filters.surfaceType).toBe('');
    expect(filters.sortBy).toBe('createdAt');
    expect(filters.sortOrder).toBe('desc');
  });

  it('should load routes on init', () => {
    mockBackendApiService.getRoutes.mockReturnValue(of(mockPageResponse));

    component.ngOnInit();

    expect(mockBackendApiService.getRoutes).toHaveBeenCalledWith({
      page: 0,
      size: 12,
      search: undefined,
      routeType: undefined,
      difficulty: undefined,
      minDistance: undefined,
      maxDistance: 100000,
      surfaceType: undefined,
      sort: 'createdAt,desc',
    });
  });

  it('should load routes successfully', () => {
    mockBackendApiService.getRoutes.mockReturnValue(of(mockPageResponse));

    component.loadRoutes();

    expect(component.loading()).toBe(false);
    expect(component.routes()).toEqual([mockRoute]);
    expect(component.totalPages()).toBe(1);
    expect(component.totalElements()).toBe(1);
    expect(component.currentPage()).toBe(0);
    expect(component.error()).toBeNull();
  });

  it('should handle loading error', () => {
    const errorMessage = 'Network error';
    mockBackendApiService.getRoutes.mockReturnValue(throwError(() => new Error(errorMessage)));

    component.loadRoutes();

    expect(component.loading()).toBe(false);
    expect(component.routes()).toEqual([]);
    expect(component.error()).toBe('Failed to load routes. Please try again.');
  });

  it('should update filters and reload routes when filters change', () => {
    const newFilters: RouteFilters = {
      searchText: 'mountain',
      routeType: RouteType.HIKING,
      difficulty: 3,
      minDistance: 5,
      maxDistance: 20,
      surfaceType: '',
      sortBy: 'name',
      sortOrder: 'asc',
    };

    mockBackendApiService.getRoutes.mockReturnValue(of(mockPageResponse));

    component.onFiltersChanged(newFilters);

    expect(component.currentFilters()).toEqual(newFilters);
    expect(component.currentPage()).toBe(0); // Should reset to first page
    expect(mockBackendApiService.getRoutes).toHaveBeenCalledWith({
      page: 0,
      size: 12,
      search: 'mountain',
      routeType: RouteType.HIKING,
      difficulty: 3,
      minDistance: 5000,
      maxDistance: 20000,
      surfaceType: undefined,
      sort: 'name,asc',
    });
  });

  it('should reset to first page and reload routes when filters reset', () => {
    component.currentPage.set(2);
    mockBackendApiService.getRoutes.mockReturnValue(of(mockPageResponse));

    component.onFiltersReset();

    expect(component.currentPage()).toBe(0);
    expect(mockBackendApiService.getRoutes).toHaveBeenCalledWith({
      page: 0,
      size: 12,
      search: undefined,
      routeType: undefined,
      difficulty: undefined,
      minDistance: undefined,
      maxDistance: 100000,
      surfaceType: undefined,
      sort: 'createdAt,desc',
    });
  });

  it('should navigate to map page when route is viewed', () => {
    const routeId = 'route-123';

    component.onRouteViewed(routeId);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/map'], { queryParams: { routeId } });
  });

  it('should change page correctly', () => {
    component.totalPages.set(5);
    const responseWithPage2 = { ...mockPageResponse, number: 2 };
    mockBackendApiService.getRoutes.mockReturnValue(of(responseWithPage2));

    component.onPageChange(2);

    expect(component.currentPage()).toBe(2);
    expect(mockBackendApiService.getRoutes).toHaveBeenCalledWith({
      page: 2,
      size: 12,
      search: undefined,
      routeType: undefined,
      difficulty: undefined,
      minDistance: undefined,
      maxDistance: 100000,
      surfaceType: undefined,
      sort: 'createdAt,desc',
    });
  });

  it('should not change page if page number is invalid', () => {
    component.totalPages.set(5);
    component.currentPage.set(1);

    component.onPageChange(-1);
    expect(component.currentPage()).toBe(1);

    component.onPageChange(10);
    expect(component.currentPage()).toBe(1);
  });

  it('should go to next page when hasNextPage is true', () => {
    component.currentPage.set(1);
    component.totalPages.set(5);
    const responseWithPage2 = { ...mockPageResponse, number: 2 };
    mockBackendApiService.getRoutes.mockReturnValue(of(responseWithPage2));

    component.onNextPage();

    expect(component.currentPage()).toBe(2);
    expect(mockBackendApiService.getRoutes).toHaveBeenCalledWith({
      page: 2,
      size: 12,
      search: undefined,
      routeType: undefined,
      difficulty: undefined,
      minDistance: undefined,
      maxDistance: 100000,
      surfaceType: undefined,
      sort: 'createdAt,desc',
    });
  });

  it('should not go to next page when hasNextPage is false', () => {
    component.currentPage.set(4);
    component.totalPages.set(5);

    component.onNextPage();

    expect(component.currentPage()).toBe(4);
  });

  it('should go to previous page when hasPreviousPage is true', () => {
    component.currentPage.set(2);
    const responseWithPage1 = { ...mockPageResponse, number: 1 };
    mockBackendApiService.getRoutes.mockReturnValue(of(responseWithPage1));

    component.onPreviousPage();

    expect(component.currentPage()).toBe(1);
    expect(mockBackendApiService.getRoutes).toHaveBeenCalledWith({
      page: 1,
      size: 12,
      search: undefined,
      routeType: undefined,
      difficulty: undefined,
      minDistance: undefined,
      maxDistance: 100000,
      surfaceType: undefined,
      sort: 'createdAt,desc',
    });
  });

  it('should not go to previous page when hasPreviousPage is false', () => {
    component.currentPage.set(0);

    component.onPreviousPage();

    expect(component.currentPage()).toBe(0);
  });

  it('should refresh routes', () => {
    mockBackendApiService.getRoutes.mockReturnValue(of(mockPageResponse));

    component.onRefresh();

    expect(mockBackendApiService.getRoutes).toHaveBeenCalledWith({
      page: 0,
      size: 12,
      search: undefined,
      routeType: undefined,
      difficulty: undefined,
      minDistance: undefined,
      maxDistance: 100000,
      surfaceType: undefined,
      sort: 'createdAt,desc',
    });
  });

  it('should compute hasRoutes correctly', () => {
    expect(component.hasRoutes()).toBe(false);

    component.routes.set([mockRoute]);
    expect(component.hasRoutes()).toBe(true);
  });

  it('should compute hasNextPage correctly', () => {
    component.currentPage.set(0);
    component.totalPages.set(3);
    expect(component.hasNextPage()).toBe(true);

    component.currentPage.set(2);
    expect(component.hasNextPage()).toBe(false);
  });

  it('should compute hasPreviousPage correctly', () => {
    component.currentPage.set(0);
    expect(component.hasPreviousPage()).toBe(false);

    component.currentPage.set(1);
    expect(component.hasPreviousPage()).toBe(true);
  });

  it('should compute showPagination correctly', () => {
    component.totalPages.set(1);
    expect(component.showPagination()).toBe(false);

    component.totalPages.set(3);
    expect(component.showPagination()).toBe(true);
  });

  it('should generate correct page numbers', () => {
    component.currentPage.set(2);
    component.totalPages.set(10);

    const pageNumbers = component.getPageNumbers();

    expect(pageNumbers).toEqual([0, 1, 2, 3, 4]);
  });

  it('should generate correct results text', () => {
    component.currentPage.set(0);
    component.pageSize.set(12);
    component.totalElements.set(25);

    expect(component.getResultsText()).toBe('Showing 1-12 of 25 routes');

    component.currentPage.set(1);
    expect(component.getResultsText()).toBe('Showing 13-24 of 25 routes');

    component.currentPage.set(2);
    expect(component.getResultsText()).toBe('Showing 25-25 of 25 routes');
  });

  it('should return "No routes found" when totalElements is 0', () => {
    component.totalElements.set(0);

    expect(component.getResultsText()).toBe('No routes found');
  });

  it('should send correct API parameters when loading routes', () => {
    const filters: RouteFilters = {
      searchText: 'mountain',
      routeType: RouteType.HIKING,
      difficulty: 3,
      minDistance: 5,
      maxDistance: 20,
      surfaceType: SurfaceType.GRAVEL,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    component.currentFilters.set(filters);
    component.currentPage.set(1);
    component.pageSize.set(10);

    mockBackendApiService.getRoutes.mockReturnValue(of(mockPageResponse));

    component.loadRoutes();

    expect(mockBackendApiService.getRoutes).toHaveBeenCalledWith({
      page: 1,
      size: 10,
      sort: 'name,asc',
      search: 'mountain',
      routeType: RouteType.HIKING,
      difficulty: 3,
      minDistance: 5000, // Converted to meters
      maxDistance: 20000, // Converted to meters
      surfaceType: 'gravel',
    });
  });

  describe('Route Deletion', () => {
    it('should show confirmation dialog when route deletion is requested', () => {
      component.onRouteDeleted('route-1');

      expect(component.showDeleteConfirmation()).toBe(true);
      expect(component.routeToDelete()).toBe('route-1');
    });

    it('should delete route and update state when confirmed', () => {
      // Set up initial state
      component.routes.set([mockRoute, { ...mockRoute, id: 'route-2' }]);
      component.totalElements.set(2);
      component.currentPage.set(0);

      // Mock the delete API call
      mockBackendApiService.deleteRoute.mockReturnValue(of(void 0));

      // Trigger deletion
      component.onRouteDeleted('route-1');
      component.confirmDelete();

      // Verify API call
      expect(mockBackendApiService.deleteRoute).toHaveBeenCalledWith('route-1');

      // Verify state updates
      expect(component.routes()).toEqual([{ ...mockRoute, id: 'route-2' }]);
      expect(component.totalElements()).toBe(1);
      expect(component.routeToDelete()).toBeNull();
      expect(component.showDeleteConfirmation()).toBe(false);
      expect(component.loading()).toBe(false);
    });

    it('should handle deletion error', () => {
      // Set up initial state
      component.routes.set([mockRoute]);

      // Mock the delete API call to fail
      mockBackendApiService.deleteRoute.mockReturnValue(throwError(() => new Error('Delete failed')));

      // Trigger deletion
      component.onRouteDeleted('route-1');
      component.confirmDelete();

      // Verify API call
      expect(mockBackendApiService.deleteRoute).toHaveBeenCalledWith('route-1');

      // Verify error handling
      expect(component.deleteError()).toBe('Failed to delete route. Please try again.');
      expect(component.routes()).toEqual([mockRoute]); // Routes should remain unchanged
      expect(component.loading()).toBe(false);
    });

    it('should cancel deletion when cancelled', () => {
      component.onRouteDeleted('route-1');
      component.cancelDelete();

      expect(component.showDeleteConfirmation()).toBe(false);
      expect(component.routeToDelete()).toBeNull();
      expect(mockBackendApiService.deleteRoute).not.toHaveBeenCalled();
    });

    it('should go back one page if last route on page is deleted', () => {
      // Set up initial state with one route on page 1
      component.routes.set([mockRoute]);
      component.totalElements.set(1);
      component.currentPage.set(1);

      // Mock the delete API call
      mockBackendApiService.deleteRoute.mockReturnValue(of(void 0));

      // Trigger deletion
      component.onRouteDeleted('route-1');
      component.confirmDelete();

      // Verify API call
      expect(mockBackendApiService.deleteRoute).toHaveBeenCalledWith('route-1');

      // Verify page change and reload
      expect(component.currentPage()).toBe(0);
      expect(mockBackendApiService.getRoutes).toHaveBeenCalledWith({
        page: 0,
        size: 12,
        search: undefined,
        routeType: undefined,
        difficulty: undefined,
        minDistance: undefined,
        maxDistance: 100000,
        surfaceType: undefined,
        sort: 'createdAt,desc',
      });
    });
  });
});
