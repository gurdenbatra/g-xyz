import { test, expect, type Page } from '@playwright/test';

const phase = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttribute('data-daytime'));

test.describe('Day/night', () => {
  test('sets a known data-daytime phase on load', async ({ page }) => {
    await page.goto('/');
    expect(['dawn', 'day', 'dusk', 'night']).toContain(await phase(page));
  });

  test('OS dark preference yields night (auto)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('gg-daytime');
      } catch (e) {
        /* ignore */
      }
    });
    await page.goto('/');
    expect(await phase(page)).toBe('night');
  });

  test('manual light preference overrides OS dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      try {
        localStorage.setItem('gg-daytime', 'light');
      } catch (e) {
        /* ignore */
      }
    });
    await page.goto('/');
    expect(await phase(page)).toBe('day');
  });

  test('toggle cycles auto → light → dark and persists', async ({ page }) => {
    // Fresh context starts with empty localStorage; do NOT use addInitScript to
    // clear it — that re-runs on page.reload() and would wipe the persisted pref
    // we're asserting survives the reload.
    await page.goto('/');
    const btn = page.locator('#daytime-toggle');
    await expect(btn).toHaveAttribute('data-pref', 'auto');
    await btn.click();
    await expect(btn).toHaveAttribute('data-pref', 'light');
    expect(await phase(page)).toBe('day');
    await btn.click();
    await expect(btn).toHaveAttribute('data-pref', 'dark');
    expect(await phase(page)).toBe('night');
    await page.reload();
    await expect(btn).toHaveAttribute('data-pref', 'dark');
  });

  test('night mode passes axe (dark contrast)', async ({ page }) => {
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    await page.addInitScript(() => {
      try {
        localStorage.setItem('gg-daytime', 'dark');
      } catch (e) {
        /* ignore */
      }
    });
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
