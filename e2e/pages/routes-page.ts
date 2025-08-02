import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class RoutesPage extends BasePage {
  // Page elements
  readonly pageHeader: Locator;
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;
  readonly refreshButton: Locator;

  // Filter elements
  readonly filtersSection: Locator;
  readonly filtersTitle: Locator;
  readonly resetFiltersButton: Locator;
  readonly searchInput: Locator;
  readonly routeTypeSelect: Locator;
  readonly difficultySelect: Locator;
  readonly minDistanceInput: Locator;
  readonly maxDistanceInput: Locator;
  readonly surfaceTypeSelect: Locator;
  readonly visibilitySelect: Locator;
  readonly sortBySelect: Locator;
  readonly sortOrderSelect: Locator;

  // Results elements
  readonly resultsSummary: Locator;
  readonly routesGrid: Locator;
  readonly routeCards: Locator;
  readonly emptyState: Locator;
  readonly emptyStateTitle: Locator;
  readonly emptyStateMessage: Locator;
  readonly createRouteButton: Locator;

  // Loading and error states
  readonly loadingState: Locator;
  readonly errorState: Locator;

  // Pagination elements
  readonly pagination: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageNumbers: Locator;

  // Navigation elements
  readonly navbar: Locator;
  readonly navbarToggler: Locator;
  readonly mapLink: Locator;
  readonly routesLink: Locator;

  constructor(page: Page) {
    super(page);

    // Page elements
    this.pageHeader = page.locator('.page-header');
    this.pageTitle = page
      .getByRole('heading', { name: 'Routes', exact: true })
      .or(page.locator('h1:has-text("Routes")'));
    this.pageDescription = page.getByText('Discover and explore routes from the community');
    this.refreshButton = page.getByRole('button', { name: /refresh/i });

    // Filter elements
    this.filtersSection = page.locator('.route-filters');
    this.filtersTitle = page.getByRole('heading', { name: /filters/i });
    this.resetFiltersButton = page.locator('.route-filters').getByRole('button', { name: /reset/i });
    this.searchInput = page.getByRole('textbox', { name: /search routes/i });
    this.routeTypeSelect = page.getByRole('combobox', { name: /route type/i });
    this.difficultySelect = page.getByRole('combobox', { name: /difficulty/i });
    this.minDistanceInput = page.locator('input[placeholder="0"]');
    this.maxDistanceInput = page.locator('input[placeholder="100"]');
    this.surfaceTypeSelect = page.getByRole('combobox', { name: /surface type/i });
    this.visibilitySelect = page.getByRole('combobox', { name: /visibility/i });
    this.sortBySelect = page.getByRole('combobox', { name: /sort by/i });
    this.sortOrderSelect = page.getByRole('combobox', { name: /order/i });

    // Results elements
    this.resultsSummary = page.locator('.results-summary');
    this.routesGrid = page.locator('.routes-grid');
    this.routeCards = page.locator('app-route-card');
    this.emptyState = page.locator('.empty-state');
    this.emptyStateTitle = page.getByRole('heading', { name: 'No routes found', exact: true });
    this.emptyStateMessage = page.getByText(/no routes match your current filters/i);
    this.createRouteButton = page.getByRole('button', { name: /create your first route/i });

    // Loading and error states
    this.loadingState = page.locator('.loading-state');
    this.errorState = page.locator('.error-state');

    // Pagination elements
    this.pagination = page.getByRole('navigation', { name: /routes pagination/i });
    this.previousPageButton = page.getByRole('button', { name: /previous/i });
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.pageNumbers = page.locator('.pagination .page-item');

    // Navigation elements
    this.navbar = page.getByRole('navigation');
    this.navbarToggler = page.getByRole('button', { name: /toggle navigation/i });
    this.mapLink = page.getByRole('link', { name: /map/i });
    this.routesLink = page.getByRole('link', { name: /routes/i });
  }

  /**
   * Navigate to the routes page
   */
  async navigateToRoutes() {
    await this.goto('/routes');
    await this.waitForPageLoad();
  }

  /**
   * Wait for the routes page to load completely
   */
  async waitForPageLoad() {
    await this.pageTitle.waitFor({ state: 'visible' });
    await this.filtersSection.waitFor({ state: 'visible' });
    // Wait for either routes to load or empty state to appear
    await Promise.race([
      this.routesGrid.waitFor({ state: 'visible' }),
      this.emptyState.waitFor({ state: 'visible' }),
      this.loadingState.waitFor({ state: 'visible' }),
    ]);
  }

  /**
   * Wait for routes to finish loading
   */
  async waitForRoutesToLoad() {
    // Wait for loading state to disappear
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 });
    // Wait for either routes or empty state
    await Promise.race([this.routesGrid.waitFor({ state: 'visible' }), this.emptyState.waitFor({ state: 'visible' })]);
  }

  /**
   * Search for routes by text
   */
  async searchRoutes(searchText: string) {
    await this.searchInput.fill(searchText);
    await this.waitForRoutesToLoad();
  }

  /**
   * Filter routes by type
   */
  async filterByRouteType(routeType: string) {
    await this.routeTypeSelect.selectOption(routeType);
    await this.waitForRoutesToLoad();
  }

  /**
   * Filter routes by difficulty
   */
  async filterByDifficulty(difficulty: string) {
    await this.difficultySelect.selectOption(difficulty);
    await this.waitForRoutesToLoad();
  }

  /**
   * Set distance range filter
   */
  async setDistanceRange(min: string, max: string) {
    // Ensure filters section is expanded
    await this.ensureFiltersExpanded();

    await this.minDistanceInput.fill(min);
    await this.maxDistanceInput.fill(max);
    await this.waitForRoutesToLoad();
  }

  /**
   * Ensure filters section is expanded
   */
  async ensureFiltersExpanded() {
    const filterCollapse = this.page.locator('#filterCollapse');
    const isExpanded = await filterCollapse.evaluate((el) => el.classList.contains('show'));

    if (!isExpanded) {
      // Click the toggle button to expand filters (only visible on mobile)
      const toggleButton = this.page.locator('.route-filters .btn-outline-primary.d-md-none');
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        await filterCollapse.waitFor({ state: 'visible' });
      }
    }
  }

  /**
   * Reset all filters
   */
  async resetFilters() {
    await this.resetFiltersButton.click();
    await this.waitForRoutesToLoad();
  }

  /**
   * Click refresh button
   */
  async refreshRoutes() {
    await this.refreshButton.click();
    await this.waitForRoutesToLoad();
  }

  /**
   * Get the number of route cards displayed
   */
  async getRouteCardCount(): Promise<number> {
    return await this.routeCards.count();
  }

  /**
   * Click on a route card by index
   */
  async clickRouteCard(index: number) {
    await this.routeCards.nth(index).click();
  }

  /**
   * Click "View on Map" button for a route card
   */
  async clickViewOnMapButton(index: number) {
    const routeCard = this.routeCards.nth(index);
    const viewButton = routeCard.getByRole('button', { name: /view on map/i });
    await viewButton.click();
  }

  /**
   * Get results summary text
   */
  async getResultsSummaryText(): Promise<string> {
    return (await this.resultsSummary.textContent()) || '';
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Check if loading state is visible
   */
  async isLoadingStateVisible(): Promise<boolean> {
    return await this.loadingState.isVisible();
  }

  /**
   * Check if error state is visible
   */
  async isErrorStateVisible(): Promise<boolean> {
    return await this.errorState.isVisible();
  }

  /**
   * Navigate to map page using the "Create Your First Route" button
   */
  async navigateToMapViaCreateButton() {
    await this.createRouteButton.click();
    await this.page.waitForURL('**/map');
  }

  /**
   * Toggle navbar on mobile
   */
  async toggleNavbar() {
    await this.navbarToggler.click();
  }

  /**
   * Navigate to map page via navbar
   */
  async navigateToMapViaNavbar() {
    // Check if navbar is collapsed (mobile)
    const isNavbarCollapsed = await this.navbarToggler.isVisible();
    if (isNavbarCollapsed) {
      await this.toggleNavbar();
    }
    await this.mapLink.click();
    await this.page.waitForURL('**/map');
  }

  /**
   * Verify page elements are visible
   */
  async verifyPageElements() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.pageDescription).toBeVisible();
    await expect(this.refreshButton).toBeVisible();
    await expect(this.filtersSection).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.routeTypeSelect).toBeVisible();
    await expect(this.difficultySelect).toBeVisible();
  }

  /**
   * Verify filter options are correct
   */
  async verifyFilterOptions() {
    // Verify route type options
    const routeTypeOptions = await this.routeTypeSelect.locator('option').allTextContents();
    const trimmedRouteOptions = routeTypeOptions.map((option) => option.trim());
    expect(trimmedRouteOptions).toContain('All Types');
    expect(trimmedRouteOptions).toContain('Cycling');
    expect(trimmedRouteOptions).toContain('Hiking');
    expect(trimmedRouteOptions).toContain('Running');

    // Verify difficulty options
    const difficultyOptions = await this.difficultySelect.locator('option').allTextContents();
    const trimmedDifficultyOptions = difficultyOptions.map((option) => option.trim());
    expect(trimmedDifficultyOptions).toContain('Any Difficulty');
    expect(trimmedDifficultyOptions).toContain('1 - Very Easy');
    expect(trimmedDifficultyOptions).toContain('5 - Very Hard');
  }
}
