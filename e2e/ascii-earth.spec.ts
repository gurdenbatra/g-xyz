import { test, expect } from '@playwright/test';

test.describe('ASCII earth', () => {
  test('animates the horizon when motion is allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const initial = await page.locator('[data-earth-line]').textContent();
    await page.waitForFunction(
      (prev) => document.querySelector('[data-earth-line]')?.textContent !== prev,
      initial,
      { timeout: 8000 },
    );
  });

  test('resumes animating after leaving the homepage and returning', async ({ page }) => {
    // Regression guard: the ripple used to start once at module top-level, so a
    // view-transition round-trip (leave /, come back) cancelled its rAF and it
    // never restarted — frozen for the rest of the session.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const first = await page.locator('[data-earth-line]').textContent();
    await page.waitForFunction(
      (prev) => document.querySelector('[data-earth-line]')?.textContent !== prev,
      first,
      { timeout: 8000 },
    );
    // Client-side (view-transition) navigation away and back.
    await page.locator('#main-content a.zone-link[data-zone="roots"]').click();
    await page.waitForURL((url) => url.pathname === '/roots');
    await page.goBack();
    await page.waitForURL((url) => url.pathname === '/');
    // Must animate again — with the old bug this would stay frozen and time out.
    const afterReturn = await page.locator('[data-earth-line]').textContent();
    await page.waitForFunction(
      (prev) => document.querySelector('[data-earth-line]')?.textContent !== prev,
      afterReturn,
      { timeout: 8000 },
    );
  });

  test('stays static under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const initial = await page.locator('[data-earth-line]').textContent();
    await page.waitForTimeout(1200);
    const after = await page.locator('[data-earth-line]').textContent();
    expect(after).toBe(initial);
  });
});
