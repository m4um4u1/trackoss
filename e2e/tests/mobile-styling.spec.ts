import { expect, test } from '@playwright/test';
import { MapPage } from '../pages/map-page';

// Test CSS properties and hardware acceleration for mobile touch fix on Mobile Chrome
test.describe('Mobile Chrome - CSS Properties and Hardware Acceleration', () => {
  test('should have correct CSS properties for iOS touch fix', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Open sidepanel
    await mapPage.openMobileSidepanel();

    // Check CSS properties on mobile sidepanel
    const cssProperties = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container.mobile-sidepanel');
      if (!sidepanel) return null;

      const computedStyle = window.getComputedStyle(sidepanel);
      return {
        touchAction: computedStyle.touchAction,
        webkitOverflowScrolling: computedStyle.webkitOverflowScrolling,
        overscrollBehavior: computedStyle.overscrollBehavior,
        transform: computedStyle.transform,
        willChange: computedStyle.willChange,
      };
    });

    expect(cssProperties).not.toBeNull();
    expect(cssProperties?.touchAction).toBe('pan-y');
    // webkitOverflowScrolling might not be supported in all browsers
    if (cssProperties?.webkitOverflowScrolling) {
      expect(cssProperties?.webkitOverflowScrolling).toBe('touch');
    }
    expect(cssProperties?.overscrollBehavior).toBe('contain');
    expect(cssProperties?.willChange).toBe('transform');
    // Transform should include translate3d for hardware acceleration
    expect(cssProperties?.transform).toContain('matrix');
  });

  test('should have correct CSS properties on sidepanel content', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    await mapPage.openMobileSidepanel();

    // Check CSS properties on sidepanel content container
    const contentCssProperties = await page.evaluate(() => {
      const contentContainer = document.querySelector('.sidepanel-container .container-fluid');
      if (!contentContainer) return null;

      const computedStyle = window.getComputedStyle(contentContainer);
      return {
        touchAction: computedStyle.touchAction,
        webkitOverflowScrolling: computedStyle.webkitOverflowScrolling,
        transform: computedStyle.transform,
      };
    });

    expect(contentCssProperties).not.toBeNull();
    expect(contentCssProperties?.touchAction).toBe('pan-y');
    // webkitOverflowScrolling might not be supported in all browsers
    if (contentCssProperties?.webkitOverflowScrolling) {
      expect(contentCssProperties?.webkitOverflowScrolling).toBe('touch');
    }
    // Should have hardware acceleration
    expect(contentCssProperties?.transform).toContain('matrix');
  });
});

// Test Mobile Safari CSS properties
test.describe('Mobile Safari - iOS CSS Properties', () => {
  test('should have webkit-specific properties for iOS', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    await mapPage.openMobileSidepanel();

    // Check webkit-specific properties
    const webkitProperties = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container.mobile-sidepanel');
      if (!sidepanel) return null;

      const computedStyle = window.getComputedStyle(sidepanel);
      return {
        webkitOverflowScrolling: computedStyle.webkitOverflowScrolling,
        webkitTransform: computedStyle.webkitTransform,
        webkitBackfaceVisibility: computedStyle.webkitBackfaceVisibility,
      };
    });

    expect(webkitProperties).not.toBeNull();
    // webkitOverflowScrolling and webkitTransform might not be supported in all browsers
    if (webkitProperties?.webkitOverflowScrolling) {
      expect(webkitProperties?.webkitOverflowScrolling).toBe('touch');
    }
    // Should have webkit transform for hardware acceleration
    if (webkitProperties?.webkitTransform) {
      expect(webkitProperties?.webkitTransform).toContain('matrix');
    }
  });

  test('should maintain CSS properties during sidepanel state changes', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Test CSS properties when opening sidepanel
    await mapPage.openMobileSidepanel();

    let cssProperties = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container.mobile-sidepanel');
      if (!sidepanel) return null;
      const computedStyle = window.getComputedStyle(sidepanel);
      return {
        touchAction: computedStyle.touchAction,
        transform: computedStyle.transform,
      };
    });

    expect(cssProperties?.touchAction).toBe('pan-y');
    // Transform can be either matrix or matrix3d depending on browser implementation
    expect(cssProperties?.transform).toMatch(/matrix(3d)?\(/);

    // Test CSS properties when closing sidepanel
    await mapPage.closeMobileSidepanel();

    cssProperties = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container.mobile-sidepanel');
      if (!sidepanel) return null;
      const computedStyle = window.getComputedStyle(sidepanel);
      return {
        touchAction: computedStyle.touchAction,
        transform: computedStyle.transform,
      };
    });

    // Properties should still be present even when closed
    expect(cssProperties?.touchAction).toBe('pan-y');
    // Transform can be either matrix or matrix3d depending on browser implementation
    expect(cssProperties?.transform).toMatch(/matrix(3d)?\(/);
  });
});
