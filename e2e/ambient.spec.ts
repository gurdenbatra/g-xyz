import { test, expect } from '@playwright/test';

test.describe('Ambient ecology', () => {
  test('spawns a pass on the homepage when motion is allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    // First pass is scheduled ~1.8s after the idle callback; allow headroom.
    await expect(page.locator('.ambient-ecology .ambient-sprite').first()).toBeAttached({
      timeout: 8000,
    });
  });

  test('the ambient layer is decorative (aria-hidden)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-ambient-root]')).toHaveAttribute('aria-hidden', 'true');
  });

  test('produces no passes under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(3000);
    const count = await page.locator('.ambient-ecology .ambient-sprite').count();
    expect(count).toBe(0);
  });

  test('does not run the ambient layer on interior pages (homepage only)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/roots');
    await page.waitForTimeout(2500);
    expect(await page.locator('.ambient-ecology').count()).toBe(0);
  });
});
