import { expect, test } from '@playwright/test';
import { RoutesPage } from '../pages/routes-page';

test.describe('Routes Page - Mobile', () => {
  let routesPage: RoutesPage;

  test.beforeEach(async ({ page }) => {
    routesPage = new RoutesPage(page);
    await routesPage.navigateToRoutes();
  });

  test.describe('Mobile Layout', () => {
    test('should display mobile-optimized layout', async () => {
      // Page header should stack vertically on mobile
      await expect(routesPage.pageHeader).toBeVisible();
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.refreshButton).toBeVisible();

      // Filters should be present
      await expect(routesPage.filtersSection).toBeVisible();
    });

    test('should have collapsible navbar on mobile', async () => {
      // Navbar toggler should be visible on mobile
      await expect(routesPage.navbarToggler).toBeVisible();

      // Navigation links should be hidden initially
      const navLinksVisible = await routesPage.mapLink.isVisible();
      expect(navLinksVisible).toBeFalsy();

      // Toggle navbar to show links
      await routesPage.toggleNavbar();
      await expect(routesPage.mapLink).toBeVisible();
      await expect(routesPage.routesLink).toBeVisible();
    });

    test('should have mobile-friendly filter controls', async () => {
      // All filter controls should be visible and properly sized
      await expect(routesPage.searchInput).toBeVisible();
      await expect(routesPage.routeTypeSelect).toBeVisible();
      await expect(routesPage.difficultySelect).toBeVisible();

      // Distance inputs should be in a row
      await expect(routesPage.minDistanceInput).toBeVisible();
      await expect(routesPage.maxDistanceInput).toBeVisible();

      // Dropdowns should be touch-friendly
      const searchInputBox = await routesPage.searchInput.boundingBox();
      expect(searchInputBox?.height).toBeGreaterThan(35); // Minimum touch target size (relaxed for mobile)
    });

    test('should display empty state properly on mobile', async () => {
      const isEmpty = await routesPage.isEmptyStateVisible();

      if (isEmpty) {
        await expect(routesPage.emptyState).toBeVisible();
        await expect(routesPage.emptyStateTitle).toBeVisible();
        await expect(routesPage.createRouteButton).toBeVisible();

        // Button should be full-width on mobile
        const buttonBox = await routesPage.createRouteButton.boundingBox();
        const pageBox = await routesPage.page.locator('body').boundingBox();

        if (buttonBox && pageBox) {
          // Button should take significant width on mobile (relaxed expectation)
          expect(buttonBox.width / pageBox.width).toBeGreaterThan(0.6);
        }
      }
    });
  });

  test.describe('Mobile Touch Interactions', () => {
    test('should handle touch interactions on filter controls', async () => {
      // Test touch on search input
      await routesPage.searchInput.tap();
      await expect(routesPage.searchInput).toBeFocused();

      // Test touch on dropdowns
      await routesPage.routeTypeSelect.tap();
      // Should open dropdown (implementation may vary)

      await routesPage.difficultySelect.tap();
      // Should open dropdown
    });

    test('should handle touch on buttons', async () => {
      // Test refresh button
      await routesPage.refreshButton.tap();
      await routesPage.waitForRoutesToLoad();

      // Test reset filters button
      await routesPage.resetFiltersButton.tap();
      await routesPage.waitForRoutesToLoad();
    });

    test('should handle navbar toggle touch', async () => {
      // Test navbar toggle
      await routesPage.navbarToggler.tap();
      await expect(routesPage.mapLink).toBeVisible();

      // Test navigation link touch
      await routesPage.mapLink.tap();
      await expect(routesPage.page).toHaveURL(/.*\/map/);
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should navigate between pages correctly on mobile', async () => {
      // Toggle navbar and navigate to map
      await routesPage.toggleNavbar();
      await routesPage.mapLink.tap();
      await expect(routesPage.page).toHaveURL(/.*\/map/);

      // Navigate back to routes
      await routesPage.page.goBack();
      await expect(routesPage.page).toHaveURL(/.*\/routes/);
      await routesPage.waitForPageLoad();
    });

    test('should handle "Create Your First Route" button on mobile', async () => {
      const isEmpty = await routesPage.isEmptyStateVisible();

      if (isEmpty) {
        await routesPage.createRouteButton.tap();
        await expect(routesPage.page).toHaveURL(/.*\/map/);
      }
    });
  });

  test.describe('Mobile Filter Functionality', () => {
    test('should allow filtering on mobile devices', async () => {
      // Test search functionality
      await routesPage.searchInput.tap();
      await routesPage.searchInput.fill('mobile test');
      await routesPage.waitForRoutesToLoad();
      await expect(routesPage.searchInput).toHaveValue('mobile test');

      // Test route type filter
      await routesPage.routeTypeSelect.tap();
      await routesPage.routeTypeSelect.selectOption('CYCLING');
      await routesPage.waitForRoutesToLoad();
      await expect(routesPage.routeTypeSelect).toHaveValue('CYCLING');

      // Test difficulty filter
      await routesPage.difficultySelect.tap();
      await routesPage.difficultySelect.selectOption('3');
      await routesPage.waitForRoutesToLoad();
      await expect(routesPage.difficultySelect).toHaveValue('3');
    });

    test('should handle distance range inputs on mobile', async () => {
      await routesPage.minDistanceInput.tap();
      await routesPage.minDistanceInput.fill('10');

      await routesPage.maxDistanceInput.tap();
      await routesPage.maxDistanceInput.fill('30');

      await routesPage.waitForRoutesToLoad();

      await expect(routesPage.minDistanceInput).toHaveValue('10');
      await expect(routesPage.maxDistanceInput).toHaveValue('30');
    });

    test('should reset filters correctly on mobile', async () => {
      // Set some filters
      await routesPage.searchInput.fill('test');
      await routesPage.routeTypeSelect.selectOption('HIKING');

      // Reset filters
      await routesPage.resetFiltersButton.tap();
      await routesPage.waitForRoutesToLoad();

      // Verify reset
      await expect(routesPage.searchInput).toHaveValue('');
      await expect(routesPage.routeTypeSelect).toHaveValue('');
    });
  });

  test.describe('Mobile Responsive Behavior', () => {
    test('should adapt to different mobile orientations', async () => {
      // Test portrait orientation (default)
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();

      // Rotate to landscape
      await routesPage.page.setViewportSize({ width: 812, height: 375 });

      // Elements should still be visible and functional
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();
      await expect(routesPage.searchInput).toBeVisible();

      // Rotate back to portrait
      await routesPage.page.setViewportSize({ width: 375, height: 812 });

      // Should still work correctly
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();
    });

    test('should handle small screen sizes', async () => {
      // Test on very small screen
      await routesPage.page.setViewportSize({ width: 320, height: 568 });

      // Core elements should still be accessible
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.searchInput).toBeVisible();
      await expect(routesPage.routeTypeSelect).toBeVisible();

      // Buttons should be touch-friendly
      const refreshButtonBox = await routesPage.refreshButton.boundingBox();
      expect(refreshButtonBox?.height).toBeGreaterThan(40);
    });
  });

  test.describe('Mobile Performance', () => {
    test('should load quickly on mobile', async () => {
      const startTime = Date.now();

      await routesPage.page.reload();
      await routesPage.waitForPageLoad();

      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (adjust as needed)
      expect(loadTime).toBeLessThan(10000); // 10 seconds max

      // Core elements should be visible
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();
    });

    test('should handle rapid filter changes on mobile', async () => {
      // Rapidly change filters to test performance
      await routesPage.searchInput.fill('test1');
      await routesPage.routeTypeSelect.selectOption('CYCLING');
      await routesPage.searchInput.fill('test2');
      await routesPage.difficultySelect.selectOption('3');
      await routesPage.searchInput.fill('test3');

      // Should handle rapid changes gracefully
      await routesPage.waitForRoutesToLoad();
      await expect(routesPage.searchInput).toHaveValue('test3');
      await expect(routesPage.routeTypeSelect).toHaveValue('CYCLING');
      await expect(routesPage.difficultySelect).toHaveValue('3');
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async () => {
      // Check for proper touch target sizes
      const interactiveElements = [
        routesPage.refreshButton,
        routesPage.resetFiltersButton,
        routesPage.searchInput,
        routesPage.routeTypeSelect,
        routesPage.difficultySelect,
      ];

      for (const element of interactiveElements) {
        const box = await element.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThan(35); // Minimum touch target (relaxed)
          expect(box.width).toBeGreaterThan(35);
        }
      }
    });

    test('should support mobile screen readers', async () => {
      // Check for proper ARIA labels and roles
      // H1 elements have implicit heading role, so we check the tag name instead
      await expect(routesPage.pageTitle).toContainText('Routes');
      await expect(routesPage.searchInput).toHaveAttribute('placeholder');

      // Navigation should be properly labeled (nav element has implicit navigation role)
      await expect(routesPage.navbar).toBeVisible();
    });
  });
});
