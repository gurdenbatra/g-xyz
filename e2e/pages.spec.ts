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

test.describe('Social preview meta', () => {
  test('home has Open Graph + Twitter card tags with an absolute image', async ({ page }) => {
    await page.goto('/');
    const og = (p: string) => page.locator(`meta[property="${p}"]`).getAttribute('content');
    expect(await og('og:type')).toBe('website');
    expect(await og('og:title')).toBeTruthy();
    const img = await og('og:image');
    expect(img).toMatch(/^https?:\/\/.+\/og\.png$/);
    expect(await page.locator('meta[name="twitter:card"]').getAttribute('content')).toBe(
      'summary_large_image',
    );
  });

  test('interior pages carry a page-specific og:title', async ({ page }) => {
    await page.goto('/hive');
    expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toMatch(
      /Hive/i,
    );
  });
});
