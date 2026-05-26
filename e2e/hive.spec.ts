import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Hive page — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /The Hive/i, level: 1 })).toBeVisible();
  });

  test('shows intro text', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByText(/carrying right now/i).first()).toBeVisible();
  });

  test('canvas element is in DOM', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.locator('[data-live-flock]')).toBeAttached();
  });

  test('accessible "Now" list heading is present', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /^Now$/i })).toBeVisible();
  });

  test('accessible "Reading" list heading is present', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /^Reading$/i })).toBeVisible();
  });

  test('accessible "Reach me" list heading is present', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /Reach me/i })).toBeVisible();
  });

  test('contact email link is present in the accessible list', async ({ page }) => {
    await page.goto('/hive');
    const emailLink = page.getByRole('link', { name: /gurden@darkmatterlabs/i });
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute('href', 'mailto:gurden@darkmatterlabs.org');
  });
});

test.describe('Hive page — canvas', () => {
  test('canvas has non-zero dimensions after mount', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(300);
    const bbox = await page.locator('[data-live-flock]').boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });

  test('canvas renders content (non-blank pixels) after mount', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(500);
    const isNonBlank = await page.locator('[data-live-flock]').evaluate((canvas) => {
      const c = canvas as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      return data.some((v) => v !== 0);
    });
    expect(isNonBlank).toBe(true);
  });
});

test.describe('Hive page — hover card', () => {
  test('hovering near a flower shows the content card', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(300);

    const canvas = page.locator('[data-live-flock]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Sweep horizontally at 50% canvas height — will pass over at least one flower
    const y = box!.y + box!.height * 0.5;
    let found = false;
    for (let x = box!.x + 60; x < box!.x + box!.width - 60; x += 25) {
      await page.mouse.move(x, y);
      const visible = await page
        .locator('[data-hive-card]')
        .evaluate((el) => el.hasAttribute('data-visible'));
      if (visible) { found = true; break; }
    }
    expect(found).toBe(true);
  });

  test('card hides when mouse leaves canvas', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(300);

    const canvas = page.locator('[data-live-flock]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // First hover to make card visible
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(100);

    // Move off-canvas
    await page.mouse.move(box!.x - 50, box!.y - 50);
    await page.waitForTimeout(100);

    const visible = await page
      .locator('[data-hive-card]')
      .evaluate((el) => el.hasAttribute('data-visible'));
    expect(visible).toBe(false);
  });
});

test.describe('Hive page — reduced motion', () => {
  test('canvas still renders in reduced-motion mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/hive');
    await page.waitForTimeout(300);
    const bbox = await page.locator('[data-live-flock]').boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });

  test('accessible list still visible in reduced-motion mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /^Now$/i })).toBeVisible();
  });
});

test.describe('Hive page — keyboard navigation', () => {
  test('contact links are reachable by keyboard', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit headless does not Tab-focus links consistently');
    await page.goto('/hive');
    // Tab repeatedly to find the email link
    let found = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('href') ?? '');
      if (focused === 'mailto:gurden@darkmatterlabs.org') { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

test.describe('Hive page — accessibility', () => {
  test('has zero axe violations', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('has zero axe violations in reduced-motion mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/hive');
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
