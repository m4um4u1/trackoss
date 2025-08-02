import { expect, test } from '@playwright/test';
import { RoutesPage } from '../pages/routes-page';

test.describe('Routes Page - Tablet', () => {
  let routesPage: RoutesPage;

  test.beforeEach(async ({ page }) => {
    routesPage = new RoutesPage(page);
    await routesPage.navigateToRoutes();
  });

  test.describe('Tablet Layout', () => {
    test('should display tablet-optimized layout', async () => {
      // Page header should be horizontal on tablet
      await expect(routesPage.pageHeader).toBeVisible();
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.refreshButton).toBeVisible();

      // Filters should be expanded by default on tablet
      await expect(routesPage.filtersSection).toBeVisible();
      await expect(routesPage.searchInput).toBeVisible();
    });

    test('should have expanded navbar on tablet', async () => {
      // Navbar should be expanded by default on tablet
      await expect(routesPage.mapLink).toBeVisible();
      await expect(routesPage.routesLink).toBeVisible();

      // Navbar toggler might not be visible on tablet
      const togglerVisible = await routesPage.navbarToggler.isVisible();
      if (togglerVisible) {
        // If toggler is visible, navbar should still work
        await routesPage.toggleNavbar();
        await expect(routesPage.mapLink).toBeVisible();
      }
    });

    test('should display filters in grid layout on tablet', async () => {
      // Filters should be arranged in a grid on tablet
      await expect(routesPage.searchInput).toBeVisible();
      await expect(routesPage.routeTypeSelect).toBeVisible();
      await expect(routesPage.difficultySelect).toBeVisible();

      // Distance inputs should be side by side
      await expect(routesPage.minDistanceInput).toBeVisible();
      await expect(routesPage.maxDistanceInput).toBeVisible();

      // Additional filters should be visible
      await expect(routesPage.surfaceTypeSelect).toBeVisible();
      await expect(routesPage.visibilitySelect).toBeVisible();
      await expect(routesPage.sortBySelect).toBeVisible();
      await expect(routesPage.sortOrderSelect).toBeVisible();
    });

    test('should display route cards in grid layout', async () => {
      // If routes exist, they should be in a grid layout
      const routeCount = await routesPage.getRouteCardCount();

      if (routeCount > 0) {
        await expect(routesPage.routesGrid).toBeVisible();

        // Cards should be arranged in columns on tablet
        const firstCard = routesPage.routeCards.first();
        await expect(firstCard).toBeVisible();
      } else {
        // Empty state should be properly displayed
        await expect(routesPage.emptyState).toBeVisible();
        await expect(routesPage.createRouteButton).toBeVisible();
      }
    });
  });

  test.describe('Tablet Interactions', () => {
    test('should handle touch and mouse interactions', async () => {
      // Test mouse hover on buttons (tablets support hover)
      await routesPage.refreshButton.hover();

      // Test click interactions
      await routesPage.refreshButton.click();
      await routesPage.waitForRoutesToLoad();

      // Test form interactions
      await routesPage.searchInput.click();
      await routesPage.searchInput.fill('tablet test');
      await expect(routesPage.searchInput).toHaveValue('tablet test');
    });

    test('should handle dropdown interactions on tablet', async () => {
      // Test route type dropdown
      await routesPage.routeTypeSelect.click();
      await routesPage.routeTypeSelect.selectOption('CYCLING');
      await routesPage.waitForRoutesToLoad();
      await expect(routesPage.routeTypeSelect).toHaveValue('CYCLING');

      // Test difficulty dropdown
      await routesPage.difficultySelect.click();
      await routesPage.difficultySelect.selectOption('4');
      await routesPage.waitForRoutesToLoad();
      await expect(routesPage.difficultySelect).toHaveValue('4');

      // Test surface type dropdown
      await routesPage.surfaceTypeSelect.click();
      await routesPage.surfaceTypeSelect.selectOption('GRAVEL');
      await routesPage.waitForRoutesToLoad();
      await expect(routesPage.surfaceTypeSelect).toHaveValue('GRAVEL');
    });

    test('should handle complex filter combinations', async () => {
      // Set multiple filters simultaneously
      await routesPage.searchInput.fill('mountain trail');
      await routesPage.routeTypeSelect.selectOption('HIKING');
      await routesPage.difficultySelect.selectOption('5');
      await routesPage.minDistanceInput.fill('15');
      await routesPage.maxDistanceInput.fill('25');
      await routesPage.surfaceTypeSelect.selectOption('DIRT');
      await routesPage.visibilitySelect.selectOption('true');
      await routesPage.sortBySelect.selectOption('difficulty');
      await routesPage.sortOrderSelect.selectOption('desc');

      await routesPage.waitForRoutesToLoad();

      // Verify all filters are applied
      await expect(routesPage.searchInput).toHaveValue('mountain trail');
      await expect(routesPage.routeTypeSelect).toHaveValue('HIKING');
      await expect(routesPage.difficultySelect).toHaveValue('5');
      await expect(routesPage.minDistanceInput).toHaveValue('15');
      await expect(routesPage.maxDistanceInput).toHaveValue('25');
      await expect(routesPage.surfaceTypeSelect).toHaveValue('DIRT');
      await expect(routesPage.visibilitySelect).toHaveValue('true');
      await expect(routesPage.sortBySelect).toHaveValue('difficulty');
      await expect(routesPage.sortOrderSelect).toHaveValue('desc');
    });
  });

  test.describe('Tablet Navigation', () => {
    test('should navigate between pages smoothly', async () => {
      // Navigate to map page
      await routesPage.mapLink.click();
      await expect(routesPage.page).toHaveURL(/.*\/map/);

      // Navigate back to routes
      await routesPage.page.goBack();
      await expect(routesPage.page).toHaveURL(/.*\/routes/);
      await routesPage.waitForPageLoad();

      // Page should load correctly
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();
    });

    test('should handle browser navigation correctly', async () => {
      // Set some filters
      await routesPage.searchInput.fill('test route');
      await routesPage.routeTypeSelect.selectOption('CYCLING');

      // Navigate away and back
      await routesPage.mapLink.click();
      await expect(routesPage.page).toHaveURL(/.*\/map/);

      await routesPage.page.goBack();
      await expect(routesPage.page).toHaveURL(/.*\/routes/);
      await routesPage.waitForPageLoad();

      // Filters should be reset (depending on implementation)
      // This tests that the page loads fresh
      await expect(routesPage.pageTitle).toBeVisible();
    });

    test('should show active navigation state', async () => {
      // Routes link should be active
      await expect(routesPage.routesLink).toHaveAttribute('class', /active/);

      // Navigate to map
      await routesPage.mapLink.click();
      await expect(routesPage.page).toHaveURL(/.*\/map/);

      // Navigate back to routes via navbar
      const routesLink = routesPage.page.getByRole('link', { name: /routes/i });
      await routesLink.click();
      await expect(routesPage.page).toHaveURL(/.*\/routes/);

      // Routes link should be active again
      await expect(routesPage.routesLink).toHaveAttribute('class', /active/);
    });
  });

  test.describe('Tablet Performance', () => {
    test('should handle multiple simultaneous filter changes', async () => {
      // Rapidly change multiple filters
      const filterPromises = [
        routesPage.searchInput.fill('performance test'),
        routesPage.routeTypeSelect.selectOption('RUNNING'),
        routesPage.difficultySelect.selectOption('2'),
        routesPage.minDistanceInput.fill('5'),
        routesPage.maxDistanceInput.fill('15'),
      ];

      await Promise.all(filterPromises);
      await routesPage.waitForRoutesToLoad();

      // All filters should be applied correctly
      await expect(routesPage.searchInput).toHaveValue('performance test');
      await expect(routesPage.routeTypeSelect).toHaveValue('RUNNING');
      await expect(routesPage.difficultySelect).toHaveValue('2');
    });

    test('should handle page refresh with filters', async () => {
      // Set some filters
      await routesPage.searchInput.fill('refresh test');
      await routesPage.routeTypeSelect.selectOption('WALKING');
      await routesPage.waitForRoutesToLoad();

      // Refresh the page
      await routesPage.page.reload();
      await routesPage.waitForPageLoad();

      // Page should load correctly (filters may or may not persist)
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();
      await expect(routesPage.searchInput).toBeVisible();
    });
  });

  test.describe('Tablet Responsive Behavior', () => {
    test('should adapt to different tablet orientations', async () => {
      // Test landscape orientation (default for iPad Pro)
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();

      // Rotate to portrait
      await routesPage.page.setViewportSize({ width: 834, height: 1194 });

      // Elements should still be visible and functional
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();
      await expect(routesPage.searchInput).toBeVisible();

      // Filters should still be in a reasonable layout
      await expect(routesPage.routeTypeSelect).toBeVisible();
      await expect(routesPage.difficultySelect).toBeVisible();

      // Rotate back to landscape
      await routesPage.page.setViewportSize({ width: 1194, height: 834 });

      // Should still work correctly
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();
    });

    test('should handle different tablet sizes', async () => {
      // Test smaller tablet size (iPad Mini)
      await routesPage.page.setViewportSize({ width: 768, height: 1024 });

      // Core elements should still be accessible
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.searchInput).toBeVisible();
      await expect(routesPage.routeTypeSelect).toBeVisible();

      // Test larger tablet size (iPad Pro 12.9")
      await routesPage.page.setViewportSize({ width: 1366, height: 1024 });

      // Should have more space for content
      await expect(routesPage.pageTitle).toBeVisible();
      await expect(routesPage.filtersSection).toBeVisible();

      // All filter controls should be visible
      await expect(routesPage.searchInput).toBeVisible();
      await expect(routesPage.routeTypeSelect).toBeVisible();
      await expect(routesPage.difficultySelect).toBeVisible();
      await expect(routesPage.surfaceTypeSelect).toBeVisible();
      await expect(routesPage.visibilitySelect).toBeVisible();
    });
  });

  test.describe('Tablet User Experience', () => {
    test('should provide smooth scrolling experience', async () => {
      // If there are many routes, test scrolling
      const routeCount = await routesPage.getRouteCardCount();

      if (routeCount === 0) {
        // Test scrolling with empty state
        await expect(routesPage.emptyState).toBeVisible();

        // Scroll down and up
        await routesPage.page.mouse.wheel(0, 500);
        await routesPage.page.mouse.wheel(0, -500);

        // Elements should still be visible
        await expect(routesPage.pageTitle).toBeVisible();
        await expect(routesPage.emptyState).toBeVisible();
      }
    });

    test('should handle hover states appropriately', async () => {
      // Test hover on interactive elements
      await routesPage.refreshButton.hover();
      // Button should show hover state (visual feedback)

      await routesPage.resetFiltersButton.hover();
      // Button should show hover state

      // Test hover on form elements
      await routesPage.searchInput.hover();
      await routesPage.routeTypeSelect.hover();
    });

    test('should provide appropriate visual feedback', async () => {
      // Test focus states
      await routesPage.searchInput.focus();
      await expect(routesPage.searchInput).toBeFocused();

      await routesPage.routeTypeSelect.focus();
      await expect(routesPage.routeTypeSelect).toBeFocused();

      // Test button states
      await routesPage.refreshButton.focus();
      await expect(routesPage.refreshButton).toBeFocused();
    });
  });
});
