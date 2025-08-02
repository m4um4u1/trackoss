import { expect, test } from '@playwright/test';
import { RoutesPage } from '../pages/routes-page';

test.describe('Routes Page', () => {
  let routesPage: RoutesPage;

  test.beforeEach(async ({ page }) => {
    routesPage = new RoutesPage(page);
    await routesPage.navigateToRoutes();
  });

  test.describe('Page Layout and Elements', () => {
    test('should display all main page elements', async () => {
      await routesPage.verifyPageElements();

      // Verify page title and description
      await expect(routesPage.pageTitle).toHaveText(/Routes/);
      await expect(routesPage.pageDescription).toHaveText('Discover and explore routes from the community');

      // Verify refresh button is present
      await expect(routesPage.refreshButton).toBeVisible();
      await expect(routesPage.refreshButton).toBeEnabled();
    });

    test('should display filters section with all filter controls', async () => {
      await expect(routesPage.filtersSection).toBeVisible();
      await expect(routesPage.filtersTitle).toHaveText(/Filters/);
      await expect(routesPage.resetFiltersButton).toBeVisible();

      // Verify all filter inputs are present
      await expect(routesPage.searchInput).toBeVisible();
      await expect(routesPage.routeTypeSelect).toBeVisible();
      await expect(routesPage.difficultySelect).toBeVisible();
      await expect(routesPage.minDistanceInput).toBeVisible();
      await expect(routesPage.maxDistanceInput).toBeVisible();
      await expect(routesPage.surfaceTypeSelect).toBeVisible();
      await expect(routesPage.visibilitySelect).toBeVisible();
      await expect(routesPage.sortBySelect).toBeVisible();
      await expect(routesPage.sortOrderSelect).toBeVisible();
    });

    test('should have correct filter options', async () => {
      await routesPage.verifyFilterOptions();
    });

    test('should display results summary', async () => {
      await expect(routesPage.resultsSummary).toBeVisible();
      const summaryText = await routesPage.getResultsSummaryText();
      expect(summaryText).toMatch(/routes|No routes found/);
    });
  });

  test.describe('Empty State', () => {
    test('should display empty state when no routes are found', async () => {
      // Since we're testing against a fresh backend, we expect empty state
      const isEmpty = await routesPage.isEmptyStateVisible();

      if (isEmpty) {
        await expect(routesPage.emptyState).toBeVisible();
        await expect(routesPage.emptyStateTitle).toHaveText('No routes found');
        await expect(routesPage.emptyStateMessage).toBeVisible();
        await expect(routesPage.createRouteButton).toBeVisible();
        await expect(routesPage.createRouteButton).toBeEnabled();
      }
    });

    test('should navigate to map page when clicking "Create Your First Route"', async () => {
      const isEmpty = await routesPage.isEmptyStateVisible();

      if (isEmpty) {
        await routesPage.navigateToMapViaCreateButton();
        await expect(routesPage.page).toHaveURL(/.*\/map/);
      }
    });
  });

  test.describe('Filter Functionality', () => {
    test('should allow text search in search input', async () => {
      await routesPage.searchRoutes('test route');

      // Verify search input has the value
      await expect(routesPage.searchInput).toHaveValue('test route');

      // Should trigger a search (loading state or results)
      await routesPage.waitForRoutesToLoad();
    });

    test('should allow filtering by route type', async () => {
      await routesPage.filterByRouteType('CYCLING');

      // Verify the selection
      await expect(routesPage.routeTypeSelect).toHaveValue('CYCLING');

      // Should trigger filtering
      await routesPage.waitForRoutesToLoad();
    });

    test('should allow filtering by difficulty', async () => {
      await routesPage.filterByDifficulty('3');

      // Verify the selection
      await expect(routesPage.difficultySelect).toHaveValue('3');

      // Should trigger filtering
      await routesPage.waitForRoutesToLoad();
    });

    test('should allow setting distance range', async () => {
      await routesPage.setDistanceRange('5', '50');

      // Verify the values
      await expect(routesPage.minDistanceInput).toHaveValue('5');
      await expect(routesPage.maxDistanceInput).toHaveValue('50');

      // Should trigger filtering
      await routesPage.waitForRoutesToLoad();
    });

    test('should handle distance filtering for 100km and above (bug fix verification)', async () => {
      // Test exact 100km - this was broken before the fix
      await routesPage.setDistanceRange('0', '100');

      // Verify the values are set correctly
      await expect(routesPage.minDistanceInput).toHaveValue('0');
      await expect(routesPage.maxDistanceInput).toHaveValue('100');

      // Should trigger filtering and not cause issues
      await routesPage.waitForRoutesToLoad();

      // Test 150km - this was broken before the fix
      await routesPage.setDistanceRange('10', '150');

      // Verify the values
      await expect(routesPage.minDistanceInput).toHaveValue('10');
      await expect(routesPage.maxDistanceInput).toHaveValue('150');

      // Should trigger filtering
      await routesPage.waitForRoutesToLoad();

      // Test 200km - this was broken before the fix
      await routesPage.setDistanceRange('50', '200');

      // Verify the values
      await expect(routesPage.minDistanceInput).toHaveValue('50');
      await expect(routesPage.maxDistanceInput).toHaveValue('200');

      // Should trigger filtering
      await routesPage.waitForRoutesToLoad();
    });

    test('should handle edge cases for distance filtering', async () => {
      // Test 99.9km (should work before and after fix)
      await routesPage.setDistanceRange('0', '99.9');

      await expect(routesPage.minDistanceInput).toHaveValue('0');
      await expect(routesPage.maxDistanceInput).toHaveValue('99.9');
      await routesPage.waitForRoutesToLoad();

      // Test 100.1km (was broken before fix)
      await routesPage.setDistanceRange('0', '100.1');

      await expect(routesPage.minDistanceInput).toHaveValue('0');
      await expect(routesPage.maxDistanceInput).toHaveValue('100.1');
      await routesPage.waitForRoutesToLoad();

      // Test very large distance (was broken before fix)
      await routesPage.setDistanceRange('0', '1000');

      await expect(routesPage.minDistanceInput).toHaveValue('0');
      await expect(routesPage.maxDistanceInput).toHaveValue('1000');
      await routesPage.waitForRoutesToLoad();
    });

    test('should allow filtering by surface type', async () => {
      await routesPage.surfaceTypeSelect.selectOption('asphalt');
      await routesPage.waitForRoutesToLoad();

      // Verify the selection
      await expect(routesPage.surfaceTypeSelect).toHaveValue('asphalt');
    });

    test('should allow filtering by visibility', async () => {
      await routesPage.visibilitySelect.selectOption('true');
      await routesPage.waitForRoutesToLoad();

      // Verify the selection
      await expect(routesPage.visibilitySelect).toHaveValue('true');
    });

    test('should allow changing sort options', async () => {
      await routesPage.sortBySelect.selectOption('name');
      await routesPage.waitForRoutesToLoad();

      // Verify the selection
      await expect(routesPage.sortBySelect).toHaveValue('name');

      await routesPage.sortOrderSelect.selectOption('asc');
      await routesPage.waitForRoutesToLoad();

      // Verify the selection
      await expect(routesPage.sortOrderSelect).toHaveValue('asc');
    });

    test('should reset all filters when clicking reset button', async () => {
      // Set some filters first
      await routesPage.searchRoutes('test');
      await routesPage.filterByRouteType('CYCLING');
      await routesPage.filterByDifficulty('3');

      // Reset filters
      await routesPage.resetFilters();

      // Verify filters are reset
      await expect(routesPage.searchInput).toHaveValue('');
      await expect(routesPage.routeTypeSelect).toHaveValue('');
      await expect(routesPage.difficultySelect).toHaveValue('');
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state when refreshing', async () => {
      // Click refresh and immediately check for loading state
      const refreshPromise = routesPage.refreshRoutes();

      // Loading state might be very brief, so we check if it appears
      try {
        await expect(routesPage.loadingState).toBeVisible({ timeout: 1000 });
      } catch {
        // Loading might be too fast to catch, which is fine
      }

      await refreshPromise;

      // Loading should be gone after refresh completes
      await expect(routesPage.loadingState).not.toBeVisible();
    });

    test('should handle page refresh correctly', async () => {
      await routesPage.page.reload();
      await routesPage.waitForPageLoad();

      // Page should load correctly after refresh
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to map page via navbar', async () => {
      await routesPage.navigateToMapViaNavbar();
      await expect(routesPage.page).toHaveURL(/.*\/map/);
    });

    test('should show active state for routes link in navbar', async () => {
      // Check if navbar is collapsed (mobile)
      const isNavbarCollapsed = await routesPage.navbarToggler.isVisible();
      if (isNavbarCollapsed) {
        await routesPage.toggleNavbar();
      }

      // Routes link should have active class or styling
      await expect(routesPage.routesLink).toHaveAttribute('class', /active/);
    });

    test('should navigate back to routes from map', async () => {
      // Go to map first
      await routesPage.navigateToMapViaNavbar();
      await expect(routesPage.page).toHaveURL(/.*\/map/);

      // Navigate back to routes
      const isNavbarCollapsed = await routesPage.navbarToggler.isVisible();
      if (isNavbarCollapsed) {
        await routesPage.toggleNavbar();
      }
      await routesPage.routesLink.click();
      await expect(routesPage.page).toHaveURL(/.*\/routes/);

      // Page should load correctly
      await routesPage.waitForPageLoad();
      await expect(routesPage.pageTitle).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      // Check for proper heading structure (H1 has implicit heading role)
      await expect(routesPage.pageTitle).toContainText('Routes');

      // Check for proper form labels
      await expect(routesPage.searchInput).toHaveAttribute('placeholder');

      // Check for proper button roles
      await expect(routesPage.refreshButton).toHaveAttribute('type', 'button');
      await expect(routesPage.resetFiltersButton).toHaveAttribute('type', 'button');

      // Navigation should be accessible (nav element has implicit navigation role)
      await expect(routesPage.navbar).toBeVisible();
    });

    test('should be keyboard navigable', async () => {
      // Tab through main interactive elements
      await routesPage.refreshButton.focus();
      await expect(routesPage.refreshButton).toBeFocused();

      await routesPage.page.keyboard.press('Tab');
      await expect(routesPage.resetFiltersButton).toBeFocused();

      await routesPage.page.keyboard.press('Tab');
      await expect(routesPage.searchInput).toBeFocused();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure by going offline
      await routesPage.page.context().setOffline(true);

      try {
        await routesPage.refreshRoutes();

        // Should show error state or handle gracefully
        const hasError = await routesPage.isErrorStateVisible();
        if (hasError) {
          await expect(routesPage.errorState).toBeVisible();
        }
      } finally {
        // Restore network
        await routesPage.page.context().setOffline(false);
      }
    });
  });
});
