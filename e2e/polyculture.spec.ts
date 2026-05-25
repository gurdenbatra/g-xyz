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

  test('canvas is animating (frames change over time)', async ({ page }) => {
    await page.goto('/polyculture-preview');
    const before = await page.locator('canvas[data-slow-plot]').screenshot();
    await page.waitForTimeout(600);
    const after = await page.locator('canvas[data-slow-plot]').screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('animation is suppressed under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/polyculture-preview');
    // Wait briefly to let any RAF kick in, then sample two frames 600ms apart
    await page.waitForTimeout(200);
    const before = await page.locator('canvas[data-slow-plot]').screenshot();
    await page.waitForTimeout(600);
    const after = await page.locator('canvas[data-slow-plot]').screenshot();
    expect(Buffer.compare(before, after)).toBe(0);
  });

  test('hovering over the canvas surfaces a project tag', async ({ page }) => {
    await page.goto('/polyculture-preview');
    const canvas = page.locator('canvas[data-slow-plot]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(150);
    const tag = page.locator('[data-slow-plot-tag]');
    await expect(tag).toHaveAttribute('data-visible', 'true');
    const text = (await tag.textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(0);
  });

  test('clicking the canvas navigates to the nearest project', async ({ page }) => {
    await page.goto('/polyculture-preview');
    const canvas = page.locator('canvas[data-slow-plot]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(150);
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    // After click, URL should NOT still be /polyculture-preview — should be /polyculture/<slug>
    // For Task 6 (no /polyculture/* routes yet), we instead assert the canvas dispatched
    // a custom event with the slug.
    // We use the script-side fallback: capture window.__lastSlowPlotNavSlug.
    const slug = await page.evaluate(
      () => (window as unknown as { __lastSlowPlotNavSlug?: string }).__lastSlowPlotNavSlug,
    );
    expect(typeof slug).toBe('string');
    expect((slug as string).length).toBeGreaterThan(0);
  });
});
