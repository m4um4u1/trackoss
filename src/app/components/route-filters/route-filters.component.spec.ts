import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { RouteFiltersComponent } from './route-filters.component';
import { RouteType } from '../../models/backend-api';
import { SurfaceType } from '../../models/route-metadata';

describe('RouteFiltersComponent', () => {
  let component: RouteFiltersComponent;
  let fixture: ComponentFixture<RouteFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteFiltersComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default filter values', () => {
    const filters = component.filters();
    expect(filters.searchText).toBe('');
    expect(filters.routeType).toBe('');
    expect(filters.difficulty).toBe('');
    expect(filters.minDistance).toBe(0);
    expect(filters.maxDistance).toBe(100);
    expect(filters.surfaceType).toBe('');
    expect(filters.sortBy).toBe('createdAt');
    expect(filters.sortOrder).toBe('desc');
  });

  it('should initialize with collapsed state false', () => {
    expect(component.isCollapsed()).toBe(false);
  });

  it('should emit filtersChanged when onFilterChange is called', () => {
    jest.spyOn(component.filtersChanged, 'emit');

    component.onFilterChange();

    expect(component.filtersChanged.emit).toHaveBeenCalledWith(component.filters());
  });

  it('should reset filters to default values when onReset is called', () => {
    jest.spyOn(component.resetFilters, 'emit');

    // Change some filter values
    component.filters.set({
      searchText: 'test',
      routeType: RouteType.CYCLING,
      difficulty: 3,
      minDistance: 10,
      maxDistance: 50,
      surfaceType: SurfaceType.ASPHALT,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    component.onReset();

    const filters = component.filters();
    expect(filters.searchText).toBe('');
    expect(filters.routeType).toBe('');
    expect(filters.difficulty).toBe('');
    expect(filters.minDistance).toBe(0);
    expect(filters.maxDistance).toBe(100);
    expect(filters.surfaceType).toBe('');
    expect(filters.sortBy).toBe('createdAt');
    expect(filters.sortOrder).toBe('desc');
    expect(component.resetFilters.emit).toHaveBeenCalled();
  });

  it('should toggle collapse state when toggleCollapse is called', () => {
    const initialState = component.isCollapsed();

    component.toggleCollapse();

    expect(component.isCollapsed()).toBe(!initialState);

    component.toggleCollapse();

    expect(component.isCollapsed()).toBe(initialState);
  });

  it('should return route type keys', () => {
    const keys = component.getRouteTypeKeys();
    expect(keys).toEqual(Object.keys(RouteType));
  });

  it('should return route type value for given key', () => {
    const key = Object.keys(RouteType)[0];
    const value = component.getRouteTypeValue(key);
    expect(value).toBe(RouteType[key as keyof typeof RouteType]);
  });

  it('should return surface type keys', () => {
    const keys = component.getSurfaceTypeKeys();
    expect(keys).toEqual(Object.keys(SurfaceType));
  });

  it('should return surface type value for given key', () => {
    const key = Object.keys(SurfaceType)[0];
    const value = component.getSurfaceTypeValue(key);
    expect(value).toBe(SurfaceType[key as keyof typeof SurfaceType]);
  });

  it('should format enum values correctly', () => {
    expect(component.formatEnumValue('MOUNTAIN_BIKING')).toBe('Mountain Biking');
    expect(component.formatEnumValue('ROAD_CYCLING')).toBe('Road Cycling');
    expect(component.formatEnumValue('WALKING')).toBe('Walking');
    expect(component.formatEnumValue('asphalt')).toBe('Asphalt');
  });

  it('should have correct difficulty options', () => {
    expect(component.difficultyOptions).toEqual([
      { value: 1, label: '1 - Very Easy' },
      { value: 2, label: '2 - Easy' },
      { value: 3, label: '3 - Moderate' },
      { value: 4, label: '4 - Hard' },
      { value: 5, label: '5 - Very Hard' },
    ]);
  });

  it('should have correct sort options', () => {
    expect(component.sortOptions).toEqual([
      { value: 'name', label: 'Name' },
      { value: 'createdAt', label: 'Date Created' },
      { value: 'totalDistance', label: 'Distance' },
      { value: 'difficulty', label: 'Difficulty' },
    ]);
  });

  it('should update filters when form values change', () => {
    jest.spyOn(component.filtersChanged, 'emit');

    // Simulate form input changes
    component.filters.update((filters) => ({
      ...filters,
      searchText: 'mountain trail',
    }));

    component.onFilterChange();

    expect(component.filtersChanged.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        searchText: 'mountain trail',
      }),
    );
  });
});
