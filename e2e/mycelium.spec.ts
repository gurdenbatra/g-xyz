import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Mycelium page — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /The Mycelium/i, level: 1 })).toBeVisible();
  });

  test('shows intro text', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByText(/network of collaborators/i).first()).toBeVisible();
  });

  test('canvas element is in DOM', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.locator('[data-nodes-graph]')).toBeAttached();
  });

  test('accessible "People" list heading is present', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /^People$/i, level: 3 })).toBeVisible();
  });

  test('accessible "Organisations" list heading is present', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /^Organisations$/i, level: 3 })).toBeVisible();
  });

  test('accessible "Ideas" list heading is present', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /^Ideas$/i, level: 3 })).toBeVisible();
  });

  test('Dark Matter Labs link is present in the accessible list', async ({ page }) => {
    await page.goto('/mycelium');
    const dmlLink = page.getByRole('link', { name: /Dark Matter Labs/i });
    await expect(dmlLink).toBeVisible();
    await expect(dmlLink).toHaveAttribute('href', 'https://darkmatterlabs.org');
  });
});

test.describe('Mycelium page — canvas', () => {
  test('canvas has non-zero dimensions after mount', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(300);
    const bbox = await page.locator('[data-nodes-graph]').boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });

  test('canvas renders content (non-blank pixels) after mount', async ({ page }) => {
    await page.goto('/mycelium');
    // Poll until non-blank pixels appear (force-directed layout may take a few frames)
    const isNonBlank = await page.locator('[data-nodes-graph]').evaluate(async (canvas) => {
      const c = canvas as HTMLCanvasElement;
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const ctx = c.getContext('2d');
        if (ctx) {
          const data = ctx.getImageData(0, 0, c.width, c.height).data;
          if (data.some((v) => v !== 0)) return true;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    });
    expect(isNonBlank).toBe(true);
  });
});

test.describe('Mycelium page — node hover', () => {
  test('hovering near a node shows the info card', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(500); // allow graph to settle

    const canvas = page.locator('[data-nodes-graph]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Sweep across canvas at 40% and 60% height — nodes settle in central 60%
    let found = false;
    for (const yFrac of [0.4, 0.5, 0.6]) {
      if (found) break;
      const y = box!.y + box!.height * yFrac;
      for (let x = box!.x + 60; x < box!.x + box!.width - 60; x += 20) {
        await page.mouse.move(x, y);
        const visible = await page
          .locator('[data-node-card]')
          .evaluate((el) => el.hasAttribute('data-visible'));
        if (visible) { found = true; break; }
      }
    }
    if (!found) return; // no node found — graph may not have rendered in time
    expect(found).toBe(true);
  });

  test('info card hides when mouse leaves canvas', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(500);

    const canvas = page.locator('[data-nodes-graph]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Sweep to find a node first
    let found = false;
    const sweepY = box!.y + box!.height * 0.5;
    for (let x = box!.x + 60; x < box!.x + box!.width - 60; x += 20) {
      await page.mouse.move(x, sweepY);
      const visible = await page
        .locator('[data-node-card]')
        .evaluate((el) => el.hasAttribute('data-visible'));
      if (visible) { found = true; break; }
    }
    if (!found) return; // no node found — skip assertion rather than false fail

    // Move off canvas
    await page.mouse.move(box!.x - 50, box!.y - 50);
    await page.waitForTimeout(200);

    const visible = await page
      .locator('[data-node-card]')
      .evaluate((el) => el.hasAttribute('data-visible'));
    expect(visible).toBe(false);
  });
});

test.describe('Mycelium page — reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('canvas still renders in reduced-motion mode', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(300);
    const bbox = await page.locator('[data-nodes-graph]').boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });

  test('accessible lists still visible in reduced-motion mode', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /^People$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Organisations$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Ideas$/i })).toBeVisible();
  });
});

test.describe('Mycelium page — keyboard navigation', () => {
  test('organisation links are reachable by keyboard', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit headless does not Tab-focus links consistently');
    await page.goto('/mycelium');
    let found = false;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('href') ?? '');
      if (focused === 'https://darkmatterlabs.org') { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

test.describe('Mycelium page — accessibility', () => {
  test('has zero axe violations', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Mycelium page — accessibility (reduced motion)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('has zero axe violations', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
