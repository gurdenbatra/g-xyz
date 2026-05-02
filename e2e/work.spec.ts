import { test, expect } from '@playwright/test';

test.describe('Work index', () => {
  test('page loads with 200', async ({ page }) => {
    const r = await page.goto('/work');
    expect(r?.status()).toBe(200);
  });

  test('lists all three projects', async ({ page }) => {
    await page.goto('/work');
    await expect(page.getByRole('link', { name: /CircuLaw/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /TreesAI/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dark Matter Labs/i })).toBeVisible();
  });

  test('CircuLaw row links to /work/circulaw', async ({ page }) => {
    await page.goto('/work');
    await expect(page.getByRole('link', { name: /CircuLaw/i })).toHaveAttribute('href', '/work/circulaw');
  });
});

test.describe('Project detail', () => {
  test('CircuLaw page loads with 200', async ({ page }) => {
    const r = await page.goto('/work/circulaw');
    expect(r?.status()).toBe(200);
  });

  test('CircuLaw page shows title and description', async ({ page }) => {
    await page.goto('/work/circulaw');
    await expect(page.getByRole('heading', { name: 'CircuLaw' })).toBeVisible();
    await expect(page.getByText(/Legal tooling/i)).toBeVisible();
  });

  test('CircuLaw page shows role and year', async ({ page }) => {
    await page.goto('/work/circulaw');
    await expect(page.getByText(/Lead Developer/i)).toBeVisible();
    await expect(page.getByText('2021')).toBeVisible();
  });

  test('CircuLaw page has back link to /work', async ({ page }) => {
    await page.goto('/work/circulaw');
    await expect(page.getByRole('link', { name: /All projects/i })).toHaveAttribute('href', '/work');
  });
});
