import { test, expect } from '@playwright/test';

test.describe('Garden layout accessibility', () => {
  test('skip link is present in DOM', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a.skip-link[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test('skip link is visible when focused', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a.skip-link');
    // Focus the skip link directly (avoids webkit Tab-key quirks)
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    // Wait for the CSS transform transition to complete
    await page.waitForTimeout(300);
    const box = await skipLink.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThan(-1);
  });

  test('main content landmark has correct id', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main#main-content');
    await expect(main).toBeAttached();
  });

  test('html element has lang="en"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('page has a title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Gurden Batra/);
  });

  test('nav landmark is present', async ({ page }) => {
    await page.goto('/flora');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeAttached();
  });

  test('footer landmark is present', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeAttached();
  });

  test('navigation between pages completes without error', async ({ page }) => {
    await page.goto('/');
    await page.locator('#main-content a.zone-link[href="/flora"]').first().click();
    await expect(page).toHaveURL(/\/flora/);
    await expect(page.locator('main#main-content')).toBeVisible();
  });

  test('navigation still completes after PortalShader is added', async ({ page }) => {
    await page.goto('/flora');
    await page.goto('/');
    await expect(page.locator('main#main-content')).toBeVisible();
  });
});

test.describe('Nav component', () => {
  test('nav contains the logo link', async ({ page }) => {
    await page.goto('/flora');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('a[href="/"]')).toBeAttached();
  });

  test('nav does not contain old zone links (navigation is via the homepage garden)', async ({ page }) => {
    await page.goto('/flora');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('a[href="/flora"]')).not.toBeAttached();
    await expect(nav.locator('a[href="/roots"]')).not.toBeAttached();
  });

  test('homepage has no main nav and no gurden.garden logo', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
    await expect(page.getByText('gurden.garden')).toHaveCount(0);
  });

  test('active zones are reachable from the homepage garden', async ({ page }) => {
    await page.goto('/');
    for (const href of ['/flora', '/hive', '/mulch', '/roots', '/castings']) {
      await expect(page.locator(`#main-content a.zone-link[href="${href}"]`)).toBeAttached();
    }
  });
});
