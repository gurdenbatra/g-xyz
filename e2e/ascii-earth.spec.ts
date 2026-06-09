import { test, expect } from '@playwright/test';

test.describe('ASCII earth', () => {
  test('animates the horizon when motion is allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const initial = await page.locator('[data-earth-line]').textContent();
    await page.waitForFunction(
      (prev) => document.querySelector('[data-earth-line]')?.textContent !== prev,
      initial,
      { timeout: 8000 },
    );
  });

  test('stays static under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const initial = await page.locator('[data-earth-line]').textContent();
    await page.waitForTimeout(1200);
    const after = await page.locator('[data-earth-line]').textContent();
    expect(after).toBe(initial);
  });
});
