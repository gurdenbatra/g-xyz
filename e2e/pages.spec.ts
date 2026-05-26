import { test, expect } from '@playwright/test';

test.describe('About → Compost redirect', () => {
  test('/about redirects to /compost', async ({ page }) => {
    await page.goto('/about');
    expect(page.url()).toContain('/compost');
  });
});

test.describe('Compost page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/compost');
    expect(r?.status()).toBe(200);
  });

  test('shows name and intro text', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByText(/Gurden/i).first()).toBeVisible();
    await expect(page.getByText(/Dark Matter Labs/i).first()).toBeVisible();
  });

  test('shows strata layers with biographical content', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByText(/Georgia Tech/i).first()).toBeVisible();
    await expect(page.getByText(/Aalto/i).first()).toBeVisible();
    await expect(page.getByText(/Delhi/i).first()).toBeVisible();
  });

  test('shows contact email', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByRole('link', { name: /gurden@darkmatterlabs/i })).toBeVisible();
  });
});

test.describe('Colophon → Beds redirect', () => {
  test('/colophon redirects to /beds', async ({ page }) => {
    await page.goto('/colophon');
    expect(page.url()).toContain('/beds');
  });
});

test.describe('Beds page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/beds');
    expect(r?.status()).toBe(200);
  });

  test('shows stack bed content', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.getByText(/Astro/i).first()).toBeVisible();
    await expect(page.getByText(/Netlify/i).first()).toBeVisible();
  });

  test('shows Mazius typeface credit', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.getByText(/Mazius/i).first()).toBeVisible();
  });
});
