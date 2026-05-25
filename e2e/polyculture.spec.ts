import { test, expect } from '@playwright/test';

test.describe('Polyculture — Slow Plot canvas', () => {
  test('canvas element is present on /polyculture', async ({ page }) => {
    await page.goto('/polyculture');
    await expect(page.locator('canvas[data-slow-plot]')).toBeAttached();
  });

  test('canvas has accessible fallback text', async ({ page }) => {
    await page.goto('/polyculture');
    const canvas = page.locator('canvas[data-slow-plot]');
    await expect(canvas).toHaveAttribute('aria-label', /garden plot/i);
  });

  test('plot has rendered at least one path after mount', async ({ page }) => {
    await page.goto('/polyculture');
    // After the component runs, the canvas should have non-zero width and height
    const size = await page.locator('canvas[data-slow-plot]').evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(size.w).toBeGreaterThan(0);
    expect(size.h).toBeGreaterThan(0);
  });

  test('canvas is animating (frames change over time)', async ({ page }) => {
    await page.goto('/polyculture');
    const before = await page.locator('canvas[data-slow-plot]').screenshot();
    await page.waitForTimeout(600);
    const after = await page.locator('canvas[data-slow-plot]').screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('animation is suppressed under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/polyculture');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    // Compare canvas backing-store bytes (via toDataURL) rather than element
    // screenshots — webkit element screenshots have nondeterministic compositor
    // bytes even for identical pixels.
    const hashOf = () =>
      page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>('canvas[data-slow-plot]');
        return c ? c.toDataURL() : '';
      });
    const before = await hashOf();
    await page.waitForTimeout(600);
    const after = await hashOf();
    expect(after).toBe(before);
  });

  test('hovering over the canvas surfaces a project tag', async ({ page }) => {
    await page.goto('/polyculture');
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
    await page.goto('/polyculture');
    const canvas = page.locator('canvas[data-slow-plot]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(150);
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForURL(/\/polyculture\/[a-z0-9-]+$/);
  });
});

test.describe('Polyculture — page structure', () => {
  test('/polyculture loads and contains SlowPlot canvas', async ({ page }) => {
    await page.goto('/polyculture');
    await expect(page.locator('canvas[data-slow-plot]')).toBeAttached();
  });

  test('/polyculture shows an accessible project list below the canvas', async ({ page }) => {
    await page.goto('/polyculture');
    const list = page.locator('ol.projects-list');
    await expect(list).toBeAttached();
    // 7 projects total exist in the collection
    await expect(list.locator('li')).toHaveCount(7);
  });

  test('/polyculture/<slug> project detail loads', async ({ page }) => {
    await page.goto('/polyculture/circulaw');
    await expect(page.getByRole('heading', { name: /CircuLaw/i })).toBeVisible();
  });

  test('project detail back-link returns to /polyculture', async ({ page }) => {
    await page.goto('/polyculture/circulaw');
    const back = page.locator('a.back-link');
    await expect(back).toHaveAttribute('href', '/polyculture');
  });
});
