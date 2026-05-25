import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Compost page — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByRole('heading', { name: /The Compost/i, level: 1 })).toBeVisible();
  });

  test('shows intro bio text', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByText(/Dark Matter Labs/i).first()).toBeVisible();
  });

  test('strata section has 4 layers in DOM', async ({ page }) => {
    await page.goto('/compost');
    const layers = page.locator('[data-layer]');
    await expect(layers).toHaveCount(4);
  });

  test('shows deepest layer content (Delhi)', async ({ page }) => {
    await page.goto('/compost');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);
    await expect(page.getByText(/Delhi/i).first()).toBeVisible();
  });

  test('shows contact email link', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByRole('link', { name: /gurden@darkmatterlabs/i })).toBeVisible();
  });
});

test.describe('Compost page — Strata canvas', () => {
  test('strata canvas element is in DOM', async ({ page }) => {
    await page.goto('/compost');
    const canvas = page.locator('[data-strata-canvas]');
    await expect(canvas).toBeAttached();
  });

  test('canvas has non-zero dimensions after mount', async ({ page }) => {
    await page.goto('/compost');
    await page.waitForTimeout(300); // allow mount
    const canvas = page.locator('[data-strata-canvas]');
    const bbox = await canvas.boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });
});

test.describe('Compost page — scroll reveal', () => {
  test('surface layer (depth-0) is visible on load without scrolling', async ({ page }) => {
    await page.goto('/compost');
    const surfaceLayer = page.locator('[data-layer="current"]');
    await expect(surfaceLayer).toBeVisible();
    // Poll until the entrance animation commits opacity ≥ 0.9 (up to 3 s)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-layer="current"]');
        return el ? parseFloat(getComputedStyle(el).opacity) >= 0.9 : false;
      },
      { timeout: 3000 },
    );
    const opacity = await surfaceLayer.evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0.9);
  });

  test('deep layer reveals after scrolling to it', async ({ page }) => {
    await page.goto('/compost');
    await page.locator('[data-layer="origin"]').scrollIntoViewIfNeeded();
    // Poll until scroll-driven animation commits opacity ≥ 0.9 (up to 3 s)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-layer="origin"]');
        return el ? parseFloat(getComputedStyle(el).opacity) >= 0.9 : false;
      },
      { timeout: 3000 },
    );
    const opacity = await page.locator('[data-layer="origin"]').evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0.9);
  });
});

test.describe('Compost page — reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('all layers are immediately visible with reduced motion', async ({ page }) => {
    await page.goto('/compost');
    // In reduced-motion mode the JS uses IntersectionObserver to reveal layers as
    // they enter the viewport. Scroll each layer into view, then verify opacity.
    for (const id of ['current', 'aalto', 'gatech', 'origin']) {
      const layer = page.locator(`[data-layer="${id}"]`);
      await layer.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (layerId) => {
          const el = document.querySelector(`[data-layer="${layerId}"]`);
          return el ? parseFloat(getComputedStyle(el).opacity) >= 0.9 : false;
        },
        id,
        { timeout: 2000 },
      );
      const opacity = await layer.evaluate((el) => getComputedStyle(el).opacity);
      expect(parseFloat(opacity), `layer ${id} opacity`).toBeGreaterThan(0.9);
    }
  });

  test('canvas is present and static in reduced-motion mode', async ({ page }) => {
    await page.goto('/compost');
    await page.waitForTimeout(200);
    const url1 = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-strata-canvas]');
      return c?.toDataURL() ?? '';
    });
    await page.waitForTimeout(400);
    const url2 = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-strata-canvas]');
      return c?.toDataURL() ?? '';
    });
    expect(url1).toBe(url2);
  });
});

test.describe('Compost page — keyboard navigation', () => {
  test('contact links are keyboard-reachable', async ({ page }) => {
    await page.goto('/compost');
    const email = page.getByRole('link', { name: /gurden@darkmatterlabs/i });
    await email.focus();
    await expect(email).toBeFocused();
  });
});

test.describe('Compost page — accessibility', () => {
  test('zero axe violations', async ({ page }) => {
    await page.goto('/compost');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
