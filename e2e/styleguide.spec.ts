import { test, expect } from '@playwright/test';

test.describe('Styleguide page', () => {
  test('page loads with 200', async ({ page }) => {
    const response = await page.goto('/styleguide');
    expect(response?.status()).toBe(200);
  });

  test('shows type specimens for both typefaces', async ({ page }) => {
    await page.goto('/styleguide');
    await expect(page.getByText('MaziusDisplay')).toBeVisible();
    await expect(page.getByText('NectoMono')).toBeVisible();
  });

  test('shows color swatches section', async ({ page }) => {
    await page.goto('/styleguide');
    await expect(page.getByText('Color Tokens')).toBeVisible();
  });

  test('shows spacing scale section', async ({ page }) => {
    await page.goto('/styleguide');
    await expect(page.getByText('Spacing')).toBeVisible();
  });
});
