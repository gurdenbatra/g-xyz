import { test, expect } from '@playwright/test';

test.describe('Legacy redirects', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['/about', '/roots'],
    ['/compost', '/roots'],
    ['/colophon', '/castings'],
    ['/beds', '/castings'],
    ['/canopy', '/mulch'],
    ['/polyculture', '/flora'],
    ['/work', '/flora'],
    ['/mycelium', '/hive'],
  ];
  for (const [from, to] of cases) {
    test(`${from} redirects to ${to}`, async ({ page }) => {
      await page.goto(from);
      expect(page.url()).toContain(to);
    });
  }
});

test.describe('Roots page (story & origins)', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/roots');
    expect(r?.status()).toBe(200);
  });

  test('shows name and biographical strata', async ({ page }) => {
    await page.goto('/roots');
    await expect(page.getByText(/Gurden/i).first()).toBeVisible();
    await expect(page.getByText(/Dark Matter Labs/i).first()).toBeVisible();
    await expect(page.getByText(/Georgia Tech/i).first()).toBeVisible();
    await expect(page.getByText(/Aalto/i).first()).toBeVisible();
    await expect(page.getByText(/Delhi/i).first()).toBeVisible();
  });

  test('points to the Hive for contact instead of duplicating it', async ({ page }) => {
    await page.goto('/roots');
    await expect(page.getByRole('link', { name: /the hive/i })).toHaveAttribute('href', '/hive');
  });
});

test.describe('Castings page (design, tech & care)', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/castings');
    expect(r?.status()).toBe(200);
  });

  test('shows stack + care content', async ({ page }) => {
    await page.goto('/castings');
    await expect(page.getByText(/Astro/i).first()).toBeVisible();
    await expect(page.getByText(/Netlify/i).first()).toBeVisible();
    await expect(page.getByText(/Mazius/i).first()).toBeVisible();
  });
});
