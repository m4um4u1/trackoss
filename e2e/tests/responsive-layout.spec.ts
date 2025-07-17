import { expect, test } from '@playwright/test';
import { MapPage } from '../pages/map-page';

// Test responsive CSS behavior across different viewport sizes
test.describe('Responsive CSS Behavior', () => {
  test('should update CSS classes when viewport changes', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Start with mobile viewport
    await page.setViewportSize({ width: 400, height: 800 });
    await page.waitForTimeout(100); // Allow time for resize handling

    let cssClasses = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container');
      return sidepanel ? Array.from(sidepanel.classList) : [];
    });

    expect(cssClasses).toContain('mobile-sidepanel');
    expect(cssClasses).not.toContain('desktop-sidepanel');

    // Change to desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(100); // Allow time for resize handling

    cssClasses = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container');
      return sidepanel ? Array.from(sidepanel.classList) : [];
    });

    expect(cssClasses).toContain('desktop-sidepanel');
    expect(cssClasses).not.toContain('mobile-sidepanel');

    // Change to tablet viewport
    await page.setViewportSize({ width: 900, height: 800 });
    await page.waitForTimeout(100); // Allow time for resize handling

    cssClasses = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container');
      return sidepanel ? Array.from(sidepanel.classList) : [];
    });

    expect(cssClasses).toContain('desktop-sidepanel');
    expect(cssClasses).not.toContain('mobile-sidepanel');
  });

  test('should not have mobile-specific CSS on desktop sidepanel', async ({ page }) => {
    // Change viewport to desktop size
    await page.setViewportSize({ width: 1200, height: 800 });

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Check that desktop sidepanel doesn't have mobile-specific classes
    const hasDesktopClass = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container');
      return sidepanel?.classList.contains('desktop-sidepanel');
    });

    const hasMobileClass = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container');
      return sidepanel?.classList.contains('mobile-sidepanel');
    });

    expect(hasDesktopClass).toBe(true);
    expect(hasMobileClass).toBe(false);
  });
});
