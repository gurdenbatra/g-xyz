import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ZONE_HREFS = [
  '/polyculture',
  '/canopy',
  '/hive',
  '/compost',
  '/mycelium',
  '/beds',
] as const;

const EMOJI = ['🌿', '🌳', '🐝', '🪱', '🍄', '🛠'];

test.describe('Garden home page', () => {
  test('renders the giant garden title as the h1', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1.garden-title');
    await expect(h1).toBeAttached();
    await expect(h1).toHaveText("Gurden's Garden");
  });

  test('garden title is rendered very large', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const fontSizePx = await page.evaluate(() => {
      const el = document.querySelector('h1.garden-title') as HTMLElement;
      return parseFloat(getComputedStyle(el).fontSize);
    });
    // clamp(4rem, 16vw, 11rem) at 1280px -> 11rem (176px). Guard "way bigger".
    expect(fontSizePx).toBeGreaterThan(60);
  });

  test('all 6 zones are present as links with correct hrefs', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('#main-content');
    for (const href of ZONE_HREFS) {
      await expect(main.locator(`a.zone-link[href="${href}"]`)).toBeAttached();
    }
    await expect(main.locator('a.zone-link')).toHaveCount(6);
  });

  test('zones carry data-zone identifiers', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('#main-content');
    for (const id of ['polyculture', 'canopy', 'hive', 'compost', 'mycelium', 'beds']) {
      await expect(main.locator(`a.zone-link[data-zone="${id}"]`)).toBeAttached();
    }
  });

  test('focusing a zone reveals its description hint', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('#main-content a.zone-link[data-zone="polyculture"]');
    await link.focus();
    // Wait for the CSS opacity transition to settle (cross-browser)
    await page.waitForFunction(
      () => {
        const hint = document.querySelector(
          '#main-content a.zone-link[data-zone="polyculture"] .zone-hint',
        ) as HTMLElement | null;
        return hint ? parseFloat(getComputedStyle(hint).opacity) > 0 : false;
      },
      { timeout: 2000 },
    );
    const opacity = await link.locator('.zone-hint').evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0);
  });

  test('no emoji characters appear on the homepage', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('#main-content').innerText();
    for (const e of EMOJI) {
      expect(text).not.toContain(e);
    }
  });

  test('flora sway is suppressed under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const animName = await page.evaluate(() => {
      const el = document.querySelector('.garden-flora__sprig') as HTMLElement | null;
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
