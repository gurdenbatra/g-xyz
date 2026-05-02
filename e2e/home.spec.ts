import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('skills tagline is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#role-top')).toBeVisible();
    await expect(page.locator('#role-bottom')).toBeVisible();
  });

  test('Marginalia bio paragraph is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Civic Tech Lead at Dark Matter Labs/)).toBeVisible();
  });

  test('Marginalia annotation notes are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Berlin — since 2020')).toBeVisible();
    await expect(page.getByText('Amsterdam municipality & EU')).toBeVisible();
  });

  test('projects section has all three featured projects', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /CircuLaw/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /TreesAI/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dark Matter Labs/i })).toBeVisible();
  });

  test('all projects link points to /work', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /all projects/i })).toHaveAttribute('href', '/work');
  });

  test('art portal has a link to /art', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Enter/i })).toHaveAttribute('href', '/art');
  });
});
