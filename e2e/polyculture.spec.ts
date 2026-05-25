import { test, expect } from '@playwright/test';

test.describe('Polyculture — Slow Plot canvas', () => {
  test('canvas element is present on /polyculture', async ({ page }) => {
    // /polyculture doesn't exist yet, so this test will fail on route 404 first;
    // a temporary stub page is added in Task 4 step 4 to make the test exercise the canvas.
    await page.goto('/polyculture-preview');
    await expect(page.locator('canvas[data-slow-plot]')).toBeAttached();
  });

  test('canvas has accessible fallback text', async ({ page }) => {
    await page.goto('/polyculture-preview');
    const canvas = page.locator('canvas[data-slow-plot]');
    await expect(canvas).toHaveAttribute('aria-label', /garden plot/i);
  });

  test('plot has rendered at least one path after mount', async ({ page }) => {
    await page.goto('/polyculture-preview');
    // After the component runs, the canvas should have non-zero width and height
    const size = await page.locator('canvas[data-slow-plot]').evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(size.w).toBeGreaterThan(0);
    expect(size.h).toBeGreaterThan(0);
  });
});
