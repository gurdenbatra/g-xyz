import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ZONE_HREFS = [
  '/flora',
  '/hive',
  '/mulch',
  '/roots',
  '/castings',
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

  test('all 5 zones are present as links with correct hrefs', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('#main-content');
    for (const href of ZONE_HREFS) {
      await expect(main.locator(`a.zone-link[href="${href}"]`)).toBeAttached();
    }
    await expect(main.locator('a.zone-link')).toHaveCount(5);
  });

  test('zones carry data-zone identifiers', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('#main-content');
    for (const id of ['flora', 'hive', 'mulch', 'roots', 'castings']) {
      await expect(main.locator(`a.zone-link[data-zone="${id}"]`)).toBeAttached();
    }
  });

  test('each glyph renders non-empty crisp ASCII', async ({ page }) => {
    await page.goto('/');
    for (const id of ['flora', 'hive', 'mulch', 'roots', 'castings']) {
      const text = await page
        .locator(`#main-content a.zone-link[data-zone="${id}"] .zone-glyph pre.zone-ascii`)
        .first()
        .textContent();
      expect((text ?? '').trim().length, `zone ${id} should render ASCII`).toBeGreaterThan(0);
    }
  });

  test('zones appear in ecological order (sky → ground → soil)', async ({ page }) => {
    await page.goto('/');
    const order = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#main-content a.zone-link')).map(
        (a) => (a as HTMLElement).dataset.zone,
      ),
    );
    expect(order).toEqual(['flora', 'hive', 'mulch', 'roots', 'castings']);
  });

  test('flora glyph renders larger than a base-scale zone (prime focus)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const widthOf = async (id: string) =>
      (
        await page
          .locator(`#main-content a.zone-link[data-zone="${id}"] .zone-glyph pre.zone-ascii`)
          .first()
          .boundingBox()
      )?.width ?? 0;
    const flora = await widthOf('flora');
    const roots = await widthOf('roots');
    expect(flora).toBeGreaterThan(roots);
  });

  test('ascii earth horizon is present in static markup', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('.ascii-earth [data-earth-line]').textContent();
    expect((text ?? '').length).toBeGreaterThan(100);
  });

  test('each zone shows its description as an always-visible label', async ({ page }) => {
    await page.goto('/');
    const label = page.locator(
      '#main-content a.zone-link[data-zone="flora"] .zone-label',
    );
    await expect(label).toHaveText('Work & projects');
    const opacity = await label.evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBe(1);
  });

  test('zone names are not rendered on the homepage', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('#main-content').innerText();
    for (const name of [
      'The Flora & Fauna',
      'The Hive',
      'The Mulch',
      'The Roots',
      'The Compost',
    ]) {
      expect(text).not.toContain(name);
    }
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
