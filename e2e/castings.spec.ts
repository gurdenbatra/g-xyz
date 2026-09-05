import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Castings page — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/castings');
    await expect(page.getByRole('heading', { name: /The Compost/i, level: 1 })).toBeVisible();
  });

  test('shows intro text', async ({ page }) => {
    await page.goto('/castings');
    await expect(page.getByText(/cared for/i).first()).toBeVisible();
  });

  test('renders 5 bed articles', async ({ page }) => {
    await page.goto('/castings');
    await expect(page.locator('[data-bed]')).toHaveCount(5);
  });

  test('shows stack bed with Astro and Netlify', async ({ page }) => {
    await page.goto('/castings');
    await expect(page.getByText(/Astro/i).first()).toBeVisible();
    await expect(page.getByText(/Netlify/i).first()).toBeVisible();
  });

  test('shows typeface credit (Mazius)', async ({ page }) => {
    await page.goto('/castings');
    await expect(page.getByText(/Mazius/i).first()).toBeVisible();
  });

  test('shows source repository link', async ({ page }) => {
    await page.goto('/castings');
    const repoLink = page.getByRole('link', { name: /gurdenbatra\/gurden\.xyz/i });
    await expect(repoLink).toBeVisible();
    await expect(repoLink).toHaveAttribute('href', 'https://github.com/gurdenbatra/gurden.xyz');
  });
});

test.describe('Castings page — watering can', () => {
  test('watering can element is in DOM', async ({ page }) => {
    await page.goto('/castings');
    await expect(page.locator('[data-beds-can]')).toBeAttached();
  });

  test('watering can becomes visible after mount', async ({ page }) => {
    await page.goto('/castings');
    await page.waitForFunction(
      () => {
        const can = document.querySelector<HTMLElement>('[data-beds-can]');
        return can ? parseFloat(getComputedStyle(can).opacity) > 0 : false;
      },
      { timeout: 3000 },
    );
    const opacity = await page.locator('[data-beds-can]').evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0);
  });

  test('hovering a bed sets data-tended attribute', async ({ page }) => {
    await page.goto('/castings');
    await page.waitForTimeout(300);
    const accessibilityBed = page.locator('[data-bed="accessibility"]');
    await accessibilityBed.hover();
    await page.waitForTimeout(400);
    await expect(accessibilityBed).toHaveAttribute('data-tended', '');
  });

  test('hovering a different bed clears previous data-tended', async ({ page }) => {
    await page.goto('/castings');
    await page.waitForTimeout(300);
    await page.locator('[data-bed="stack"]').hover();
    await page.waitForTimeout(400);
    await page.locator('[data-bed="performance"]').hover();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-bed="stack"]')).not.toHaveAttribute('data-tended', '');
    await expect(page.locator('[data-bed="performance"]')).toHaveAttribute('data-tended', '');
  });
});

test.describe('Castings page — reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('all 5 beds visible with reduced motion', async ({ page }) => {
    await page.goto('/castings');
    for (const id of ['stack', 'accessibility', 'performance', 'source', 'sustainability']) {
      await expect(page.locator(`[data-bed="${id}"]`)).toBeVisible();
    }
  });

  test('no data-tended set after 3s with reduced motion (no auto-cycle)', async ({ page }) => {
    await page.goto('/castings');
    await page.waitForTimeout(3500);
    const tendedCount = await page.locator('[data-tended]').count();
    expect(tendedCount).toBe(0);
  });
});

test.describe('Castings page — keyboard navigation', () => {
  test('repository link is keyboard-reachable', async ({ page }) => {
    await page.goto('/castings');
    const link = page.getByRole('link', { name: /gurdenbatra\/gurden\.xyz/i });
    await link.focus();
    await expect(link).toBeFocused();
  });
});

test.describe('Castings page — accessibility', () => {
  test('zero axe violations', async ({ page }) => {
    await page.goto('/castings');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Castings page — ASCII bed icons', () => {
  const EMOJI = ['⚙️', '♿', '⚡', '📖', '🌱'];

  test('bed icons are ASCII, not emoji', async ({ page }) => {
    await page.goto('/castings');
    const icons = page.locator('.bed-icon');
    await expect(icons.first()).toBeVisible();
    const text = (await icons.allInnerTexts()).join(' ');
    expect(text).toContain('</>');
    const body = await page.locator('main').innerText();
    for (const e of EMOJI) expect(body).not.toContain(e);
  });
});
