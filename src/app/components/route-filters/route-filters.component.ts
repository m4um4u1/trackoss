import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouteType } from '../../models/backend-api';
import { DifficultyLevel, SurfaceType } from '../../models/route-metadata';

export interface RouteFilters {
  searchText: string;
  routeType: RouteType | '';
  difficulty: DifficultyLevel | '';
  minDistance: number;
  maxDistance: number;
  surfaceType: SurfaceType | '';
  sortBy: 'name' | 'createdAt' | 'totalDistance' | 'difficulty';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-route-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './route-filters.component.html',
  styleUrl: './route-filters.component.scss',
})
export class RouteFiltersComponent {
  @Output() filtersChanged = new EventEmitter<RouteFilters>();
  @Output() resetFilters = new EventEmitter<void>();

  // Expose enums to template
  RouteType = RouteType;
  SurfaceType = SurfaceType;

  // Filter state
  filters = signal<RouteFilters>({
    searchText: '',
    routeType: '',
    difficulty: '',
    minDistance: 0,
    maxDistance: 100,
    surfaceType: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // UI state
  isCollapsed = signal(false);

  // Difficulty options for dropdown
  difficultyOptions = [
    { value: 1, label: '1 - Very Easy' },
    { value: 2, label: '2 - Easy' },
    { value: 3, label: '3 - Moderate' },
    { value: 4, label: '4 - Hard' },
    { value: 5, label: '5 - Very Hard' },
  ];

  // Sort options
  sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'createdAt', label: 'Date Created' },
    { value: 'totalDistance', label: 'Distance' },
    { value: 'difficulty', label: 'Difficulty' },
  ];

  onFilterChange() {
    this.filtersChanged.emit(this.filters());
  }

  onReset() {
    this.filters.set({
      searchText: '',
      routeType: '',
      difficulty: '',
      minDistance: 0,
      maxDistance: 100,
      surfaceType: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    this.resetFilters.emit();
  }

  toggleCollapse() {
    this.isCollapsed.update((collapsed) => !collapsed);
  }

  // Helper methods for template
  getRouteTypeKeys(): string[] {
    return Object.keys(RouteType);
  }

  getRouteTypeValue(key: string): RouteType {
    return RouteType[key as keyof typeof RouteType];
  }

  getSurfaceTypeKeys(): string[] {
    return Object.keys(SurfaceType);
  }

  getSurfaceTypeValue(key: string): SurfaceType {
    return SurfaceType[key as keyof typeof SurfaceType];
  }

  // Format enum values for display
  formatEnumValue(value: string): string {
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
