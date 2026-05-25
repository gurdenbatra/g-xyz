import { test, expect } from '@playwright/test';

test.describe('Garden layout accessibility', () => {
  test('skip link is present in DOM', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a.skip-link[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test('skip link is visible when focused', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a.skip-link');
    // Focus the skip link directly (avoids webkit Tab-key quirks)
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    // Wait for the CSS transform transition to complete
    await page.waitForTimeout(300);
    const box = await skipLink.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThan(-1);
  });

  test('main content landmark has correct id', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main#main-content');
    await expect(main).toBeAttached();
  });

  test('html element has lang="en"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('page has a title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Gurden Batra/);
  });

  test('nav landmark is present', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeAttached();
  });

  test('footer landmark is present', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeAttached();
  });

  test('navigation between pages completes without error', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/work"]');
    await expect(page).toHaveURL(/\/work/);
    await expect(page.locator('main#main-content')).toBeVisible();
  });
});

test.describe('Nav component', () => {
  test('nav contains links to all main sections', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('a[href="/work"]')).toBeAttached();
    await expect(nav.locator('a[href="/art"]')).toBeAttached();
    await expect(nav.locator('a[href="/writing"]')).toBeAttached();
    await expect(nav.locator('a[href="/about"]')).toBeAttached();
  });

  test('nav logo links to home', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    const logoLink = nav.locator('a[href="/"]');
    await expect(logoLink).toBeAttached();
  });
});

test.describe('MapToggle', () => {
  test('map toggle button is present on every page', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#map-toggle');
    await expect(toggle).toBeAttached();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-controls', 'map-overlay');
  });

  test('map toggle has accessible label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#map-toggle')).toHaveAttribute('aria-label', 'Open garden map');
  });

  test('map toggle is present on non-home pages too', async ({ page }) => {
    await page.goto('/work');
    await expect(page.locator('#map-toggle')).toBeAttached();
  });
});

test.describe('MapOverlay', () => {
  test('overlay element is in the DOM with correct ARIA attributes', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#map-overlay');
    await expect(overlay).toBeAttached();
    await expect(overlay).toHaveAttribute('role', 'dialog');
    await expect(overlay).toHaveAttribute('aria-modal', 'true');
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  test('overlay contains links for the three active zones', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#map-overlay');
    await expect(overlay.locator('a[href="/work"]')).toBeAttached();
    await expect(overlay.locator('a[href="/about"]')).toBeAttached();
    await expect(overlay.locator('a[href="/colophon"]')).toBeAttached();
  });

  test('overlay contains entries for all 6 zones', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#map-overlay');
    await expect(overlay.locator('[data-zone="polyculture"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="canopy"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="hive"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="compost"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="mycelium"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="beds"]')).toBeAttached();
  });

  test('clicking map toggle opens the overlay', async ({ page }) => {
    await page.goto('/');
    await page.locator('#map-toggle').click();
    await expect(page.locator('#map-overlay')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#map-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  test('toggle aria-label changes to "Close" when overlay is open', async ({ page }) => {
    await page.goto('/');
    await page.locator('#map-toggle').click();
    await expect(page.locator('#map-toggle')).toHaveAttribute('aria-label', 'Close garden map');
  });

  test('pressing Escape closes the overlay', async ({ page }) => {
    await page.goto('/');
    await page.locator('#map-toggle').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#map-overlay')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#map-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  test('clicking the backdrop closes the overlay', async ({ page }) => {
    await page.goto('/');
    await page.locator('#map-toggle').click();
    await page.locator('.map-overlay-backdrop').click();
    await expect(page.locator('#map-overlay')).toHaveAttribute('aria-hidden', 'true');
  });

  test('map toggle stays functional after view-transition navigation', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/work"]');
    await expect(page).toHaveURL(/\/work/);
    await page.locator('#map-toggle').click();
    await expect(page.locator('#map-overlay')).toHaveAttribute('aria-hidden', 'false');
  });
});
