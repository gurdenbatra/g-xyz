import { test, expect } from '@playwright/test';

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

  test('shows background timeline', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText(/Georgia Tech/i).first()).toBeVisible();
    await expect(page.getByText(/Aalto/i).first()).toBeVisible();
    await expect(page.getByText(/Dark Matter Labs/i).first()).toBeVisible();
  });
});

test.describe('Colophon page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/colophon');
    expect(r?.status()).toBe(200);
  });

  test('mentions Astro and Mazius', async ({ page }) => {
    await page.goto('/colophon');
    await expect(page.getByText(/Astro/i).first()).toBeVisible();
    await expect(page.getByText(/Mazius/i).first()).toBeVisible();
  });
});
