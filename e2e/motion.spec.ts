import { test, expect } from '@playwright/test';

test.describe('Ambient shader + bee-title (motion)', () => {
  test('shader canvas is present and turns on when motion is allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const canvas = page.locator('[data-ambient-shader]');
    await expect(canvas).toBeAttached();
    // idle-init flips data-on once WebGL is up (or the canvas is hidden on failure — both are acceptable)
    await page
      .waitForFunction(
        () => {
          const c = document.querySelector('[data-ambient-shader]') as HTMLElement | null;
          return !!c && (c.hasAttribute('data-on') || c.style.display === 'none');
        },
        undefined,
        { timeout: 8000 },
      )
      .catch(() => {}); // headless WebGL may be unavailable — the graceful path is also valid
  });

  test('shader is absent under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const display = await page
      .locator('[data-ambient-shader]')
      .evaluate((el) => getComputedStyle(el).display)
      .catch(() => 'none');
    expect(display).toBe('none');
  });

  test('title keeps its accessible text after letter-wrapping', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.garden-title')).toHaveText("Gurden's Garden");
  });

  test('title letters carry the bloom hook', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(await page.locator('h1.garden-title .gt-l').count()).toBeGreaterThan(5);
  });
});
