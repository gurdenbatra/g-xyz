import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Garden map — home page', () => {
  test('home page renders the garden map section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.garden-map')).toBeAttached();
  });

  test('all 6 zone patches are present', async ({ page }) => {
    await page.goto('/');
    const map = page.locator('.garden-map');
    await expect(map.locator('[data-zone="polyculture"]')).toBeAttached();
    await expect(map.locator('[data-zone="canopy"]')).toBeAttached();
    await expect(map.locator('[data-zone="hive"]')).toBeAttached();
    await expect(map.locator('[data-zone="compost"]')).toBeAttached();
    await expect(map.locator('[data-zone="mycelium"]')).toBeAttached();
    await expect(map.locator('[data-zone="beds"]')).toBeAttached();
  });

  test('active zones are keyboard-navigable links', async ({ page }) => {
    await page.goto('/');
    const map = page.locator('.garden-map');
    await expect(map.locator('[data-zone="polyculture"] a[href="/work"]')).toBeAttached();
    await expect(map.locator('[data-zone="compost"] a[href="/about"]')).toBeAttached();
    await expect(map.locator('[data-zone="beds"] a[href="/colophon"]')).toBeAttached();
  });

  test('inactive zones have no interactive link', async ({ page }) => {
    await page.goto('/');
    const map = page.locator('.garden-map');
    await expect(map.locator('[data-zone="canopy"] a')).not.toBeAttached();
    await expect(map.locator('[data-zone="hive"] a')).not.toBeAttached();
    await expect(map.locator('[data-zone="mycelium"] a')).not.toBeAttached();
  });

  test('zone breathing animation is suppressed under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const animName = await page.evaluate(() => {
      const el = document.querySelector('.zone-patch') as HTMLElement | null;
      return el ? getComputedStyle(el).animationName : null;
    });
    expect(animName).toBe('none');
  });

  test('home page passes axe accessibility audit', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
