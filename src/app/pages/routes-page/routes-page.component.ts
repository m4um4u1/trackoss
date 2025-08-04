import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { BackendApiService } from '../../services/backend-api.service';
import { PageResponse, RouteResponse } from '../../models/backend-api';
import { RouteFilters, RouteFiltersComponent } from '../../components/route-filters/route-filters.component';
import { RouteCardComponent } from '../../components/route-card/route-card.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-routes-page',
  standalone: true,
  imports: [CommonModule, RouteFiltersComponent, RouteCardComponent, ConfirmationDialogComponent],
  templateUrl: './routes-page.component.html',
  styleUrl: './routes-page.component.scss',
})
export class RoutesPageComponent implements OnInit {
  private readonly backendApiService = inject(BackendApiService);
  private readonly router = inject(Router);

  // State signals
  routes = signal<RouteResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  pageSize = signal(12);
  deleteError = signal<string | null>(null);
  showDeleteConfirmation = signal(false);
  routeToDelete = signal<string | null>(null);

  // Current filters
  currentFilters = signal<RouteFilters>({
    searchText: '',
    routeType: '',
    difficulty: '',
    minDistance: 0,
    maxDistance: 100,
    surfaceType: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Computed properties
  hasRoutes = computed(() => this.routes().length > 0);
  hasNextPage = computed(() => this.currentPage() < this.totalPages() - 1);
  hasPreviousPage = computed(() => this.currentPage() > 0);
  showPagination = computed(() => this.totalPages() > 1);

  ngOnInit() {
    this.loadRoutes();
  }

  onFiltersChanged(filters: RouteFilters) {
    this.currentFilters.set(filters);
    this.currentPage.set(0); // Reset to first page when filters change
    this.loadRoutes();
  }

  onFiltersReset() {
    this.currentPage.set(0);
    this.loadRoutes();
  }

  onRouteViewed(routeId: string) {
    // Navigate to map page with the specific route
    this.router.navigate(['/map'], { queryParams: { routeId } });
  }

  onRouteDeleted(routeId: string) {
    this.routeToDelete.set(routeId);
    this.showDeleteConfirmation.set(true);
  }

  confirmDelete() {
    const routeId = this.routeToDelete();
    if (!routeId) return;

    this.loading.set(true);
    this.deleteError.set(null);
    this.showDeleteConfirmation.set(false);

    this.backendApiService.deleteRoute(routeId).subscribe({
      next: () => {
        // Remove the deleted route from the list
        this.routes.set(this.routes().filter((route) => route.id !== routeId));
        this.totalElements.set(this.totalElements() - 1);
        this.routeToDelete.set(null);

        // If we deleted the last route on the page, go back one page
        if (this.routes().length === 0 && this.currentPage() > 0) {
          this.currentPage.set(this.currentPage() - 1);
          this.loadRoutes();
        }
      },
      error: (error) => {
        console.error('Error deleting route:', error);
        this.deleteError.set('Failed to delete route. Please try again.');
        this.loading.set(false);
        this.routeToDelete.set(null);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  cancelDelete() {
    this.showDeleteConfirmation.set(false);
    this.routeToDelete.set(null);
  }

  loadRoutes() {
    this.loading.set(true);
    this.error.set(null);

    // Get current filters
    const filters = this.currentFilters();

    // Prepare params for getRoutes
    const params: any = {
      page: this.currentPage(),
      size: this.pageSize(),
      search: filters.searchText || undefined,
      routeType: filters.routeType || undefined,
      difficulty: filters.difficulty || undefined,
      minDistance: filters.minDistance ? filters.minDistance * 1000 : undefined,
      maxDistance: filters.maxDistance ? filters.maxDistance * 1000 : 100000,
      surfaceType: filters.surfaceType || undefined,
    };

    // Add sort parameter
    if (filters.sortBy) {
      params.sort = `${filters.sortBy},${filters.sortOrder}`;
    }

    // Use getRoutes with filter parameters
    this.backendApiService
      .getRoutes(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: PageResponse<RouteResponse>) => {
          this.routes.set(response.content);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
          this.currentPage.set(response.number);
        },
        error: (error) => {
          console.error('Error loading routes:', error);
          this.error.set('Failed to load routes. Please try again.');
          this.routes.set([]);
        },
      });
  }
  onPageChange(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      this.loadRoutes();
    }
  }

  onNextPage() {
    if (this.hasNextPage()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadRoutes();
    }
  }

  onPreviousPage() {
    if (this.hasPreviousPage()) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadRoutes();
    }
  }

  onRefresh() {
    this.loadRoutes();
  }

  // Helper methods for template
  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Show up to 5 page numbers around current page
    const start = Math.max(0, current - 2);
    const end = Math.min(total, start + 5);

    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    return pages;
  }

  getResultsText(): string {
    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min((this.currentPage() + 1) * this.pageSize(), this.totalElements());
    const total = this.totalElements();

    if (total === 0) {
      return 'No routes found';
    }

    return `Showing ${start}-${end} of ${total} routes`;
  }
}
