import { expect, test } from '@playwright/test';
import { MapPage } from '../pages/map-page';

// Test sidepanel functionality on tablet
test.describe('Sidepanel Behavior on Tablet', () => {
  test('should handle sidepanel interactions on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // On tablet, sidepanel should be visible by default and use desktop-sidepanel class
    const sidepanelContainer = await mapPage.getTabletSidepanelContainer();
    await expect(sidepanelContainer).toBeVisible();
    await expect(sidepanelContainer).toHaveClass(/desktop-sidepanel/);
    await expect(sidepanelContainer).not.toHaveClass(/mobile-sidepanel/);

    // Test that sidepanel can be toggled on tablet
    const toggleButton = page.getByRole('button', { name: /(open|close) sidepanel/i });
    await toggleButton.click();

    // Wait for toggle animation
    await page.waitForTimeout(300);

    // Check sidepanel state after toggle
    const isOpen = await mapPage.isTabletSidepanelOpen();

    // Toggle again to test both states
    await toggleButton.click();
    await page.waitForTimeout(300);

    const isOpenAfterSecondToggle = await mapPage.isTabletSidepanelOpen();
    expect(isOpenAfterSecondToggle).toBe(!isOpen);
  });

  test('should support touch interactions on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // On tablet, sidepanel should be open by default
    const sidepanelContainer = await mapPage.getTabletSidepanelContainer();
    await expect(sidepanelContainer).toBeVisible();

    // Test touch scrolling on tablet
    const scrollInfo = await sidepanelContainer.evaluate((element) => {
      return {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        canScroll: element.scrollHeight > element.clientHeight,
      };
    });

    if (scrollInfo.canScroll) {
      await sidepanelContainer.evaluate((element) => {
        element.scrollTop = Math.min(50, element.scrollHeight - element.clientHeight);
      });

      const scrollTop = await sidepanelContainer.evaluate((element) => element.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    } else {
      // If not scrollable, just verify the element is functional
      await expect(sidepanelContainer).toBeVisible();
    }

    // Test form interactions work on tablet
    await mapPage.selectTransportationMode('pedestrian');

    const costingSelect = page.getByRole('combobox', { name: /transportation mode/i });
    const selectedValue = await costingSelect.inputValue();
    expect(selectedValue).toContain('pedestrian');
  });

  test('should have appropriate CSS properties for tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Check CSS properties for tablet
    const cssProperties = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container');
      if (!sidepanel) return null;

      const computedStyle = window.getComputedStyle(sidepanel);
      return {
        display: computedStyle.display,
        position: computedStyle.position,
        width: computedStyle.width,
        height: computedStyle.height,
        touchAction: computedStyle.touchAction,
        overflowY: computedStyle.overflowY,
      };
    });

    expect(cssProperties).not.toBeNull();
    expect(cssProperties?.display).not.toBe('none');
    expect(cssProperties?.position).toBe('static'); // Tablet uses static positioning, not fixed

    // On tablet, width should be different from mobile
    const widthValue = parseInt(cssProperties?.width || '0');
    expect(widthValue).toBeGreaterThan(300); // Should be wider than mobile
  });

  test('should maintain sidebar functionality across viewport changes', async ({ page }) => {
    // Start with tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Test functionality on tablet - sidepanel should be open by default
    const sidepanelContainer = await mapPage.getTabletSidepanelContainer();
    await expect(sidepanelContainer).toBeVisible();

    const waypointToggle = page.getByRole('checkbox', { name: /waypoint mode/i });
    await waypointToggle.click();
    await expect(mapPage.waypointModeToggleLocator.isChecked()).resolves.toBe(true);

    // Change to landscape tablet
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(1000); // Wait longer for viewport change to take effect

    // Verify sidepanel still works after viewport change
    await expect(mapPage.isTabletSidepanelOpen()).resolves.toBe(true);

    // Verify the sidepanel container is still properly styled for tablet
    const tabletSidepanelContainer = await mapPage.getTabletSidepanelContainer();
    await expect(tabletSidepanelContainer).toBeVisible();
    await expect(tabletSidepanelContainer).toHaveClass(/desktop-sidepanel/);
  });

  test('should handle tablet-specific gestures', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // On tablet, sidepanel should be open by default
    const sidepanelContainer = await mapPage.getTabletSidepanelContainer();
    await expect(sidepanelContainer).toBeVisible();

    // Test multi-touch scrolling (common on tablets)
    await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container');
      if (!sidepanel) return;

      // Simulate multi-touch scroll
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          new Touch({
            identifier: 0,
            target: sidepanel,
            clientX: 400,
            clientY: 300,
          }),
          new Touch({
            identifier: 1,
            target: sidepanel,
            clientX: 450,
            clientY: 300,
          }),
        ],
        bubbles: true,
      });

      sidepanel.dispatchEvent(touchStart);
    });

    // Verify sidepanel remains responsive
    await expect(mapPage.isTabletSidepanelOpen()).resolves.toBe(true);
  });

  test('should work correctly on tablet (no mobile-specific touch handling)', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 900, height: 800 });

    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // On tablet, sidepanel should be open by default and not be mobile-sidepanel
    const sidepanelContainer = page.locator('.sidepanel-container');
    await expect(sidepanelContainer).not.toHaveClass(/mobile-sidepanel/);
    await expect(sidepanelContainer).toHaveClass(/col-[34]/); // Tablet uses col-3 or col-4 depending on viewport

    // Should not have backdrop on tablet
    const backdrop = page.locator('.backdrop');
    await expect(backdrop).not.toBeVisible();

    // Test normal scrolling works
    const scrollInfo = await sidepanelContainer.evaluate((element) => {
      return {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        canScroll: element.scrollHeight > element.clientHeight,
      };
    });

    if (scrollInfo.canScroll) {
      await sidepanelContainer.evaluate((element) => {
        element.scrollTop = Math.min(100, element.scrollHeight - element.clientHeight);
      });

      const scrollTop = await sidepanelContainer.evaluate((element) => element.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    } else {
      // If not scrollable, just verify the element is functional
      await expect(sidepanelContainer).toBeVisible();
    }
  });

  test('should show sidepanel as side panel (not overlay) on tablet', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // On tablet, sidepanel should be open by default and not be mobile-sidepanel
    const sidepanelContainer = page.locator('.sidepanel-container');
    await expect(sidepanelContainer).not.toHaveClass(/mobile-sidepanel/);
    await expect(sidepanelContainer).toHaveClass(/col-[34]/); // Tablet uses col-3 or col-4 depending on viewport

    // Should not have backdrop on tablet
    const backdrop = page.locator('.backdrop');
    await expect(backdrop).not.toBeVisible();
  });

  test('should allow normal scrolling on tablet', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Test that scrolling works normally on tablet (no special touch handling needed)
    const sidepanelContainer = page.locator('.sidepanel-container');

    // Check if element is scrollable and has content
    const scrollInfo = await sidepanelContainer.evaluate((element) => {
      return {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        canScroll: element.scrollHeight > element.clientHeight,
      };
    });

    if (scrollInfo.canScroll) {
      // Simulate scroll event
      await sidepanelContainer.evaluate((element) => {
        element.scrollTop = Math.min(100, element.scrollHeight - element.clientHeight);
      });

      // Verify scroll position changed
      const scrollTop = await sidepanelContainer.evaluate((element) => element.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    } else {
      // If not scrollable, just verify the element is present and functional
      await expect(sidepanelContainer).toBeVisible();
    }
  });

  test('should have appropriate CSS for tablet viewport', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    // Check that tablet doesn't use mobile-specific CSS
    const cssProperties = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container');
      if (!sidepanel) return null;

      const computedStyle = window.getComputedStyle(sidepanel);
      return {
        position: computedStyle.position,
        touchAction: computedStyle.touchAction,
        hasMobileClass: sidepanel.classList.contains('mobile-sidepanel'),
        hasDesktopClass: sidepanel.classList.contains('desktop-sidepanel'),
      };
    });

    expect(cssProperties).not.toBeNull();
    expect(cssProperties?.hasMobileClass).toBe(false);
    expect(cssProperties?.hasDesktopClass).toBe(true);
    expect(cssProperties?.position).not.toBe('fixed'); // Should not be fixed positioned like mobile
  });

  test('should have proper scrolling CSS for tablet', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.navigateToMap();

    const scrollingProperties = await page.evaluate(() => {
      const sidepanel = document.querySelector('.sidepanel-container');
      if (!sidepanel) return null;

      const computedStyle = window.getComputedStyle(sidepanel);
      return {
        overflowY: computedStyle.overflowY,
        overflowX: computedStyle.overflowX,
        scrollBehavior: computedStyle.scrollBehavior,
      };
    });

    expect(scrollingProperties).not.toBeNull();
    expect(scrollingProperties?.overflowY).toBe('auto');
    expect(scrollingProperties?.overflowX).toBe('hidden');
    expect(scrollingProperties?.scrollBehavior).toBe('smooth');
  });
});
