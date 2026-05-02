import { test, expect } from '@playwright/test';

test.describe('Base layout accessibility', () => {
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
    const nav = page.locator('nav');
    await expect(nav).toBeAttached();
  });

  test('footer landmark is present', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeAttached();
  });
});

test.describe('Nav component', () => {
  test('nav contains links to all main sections', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav.locator('a[href="/work"]')).toBeAttached();
    await expect(nav.locator('a[href="/story"]')).toBeAttached();
    await expect(nav.locator('a[href="/art"]')).toBeAttached();
    await expect(nav.locator('a[href="/writing"]')).toBeAttached();
    await expect(nav.locator('a[href="/about"]')).toBeAttached();
  });

  test('nav logo links to home', async ({ page }) => {
    await page.goto('/');
    const logoLink = page.locator('nav a[href="/"]');
    await expect(logoLink).toBeAttached();
  });
});
