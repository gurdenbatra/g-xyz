import { test, expect } from '@playwright/test';

test.describe('Story page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/story');
    expect(r?.status()).toBe(200);
  });

  test('has h1 heading', async ({ page }) => {
    await page.goto('/story');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

test.describe('About page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/about');
    expect(r?.status()).toBe(200);
  });

  test('shows name and contact', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText(/Gurden/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /gurden@darkmatterlabs/i })).toBeVisible();
  });
});

test.describe('Colophon page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/colophon');
    expect(r?.status()).toBe(200);
  });

  test('mentions Astro and Mazius', async ({ page }) => {
    await page.goto('/colophon');
    await expect(page.getByText(/Astro/i)).toBeVisible();
    await expect(page.getByText(/Mazius/i)).toBeVisible();
  });
});
