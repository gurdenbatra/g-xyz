import { test, expect } from '@playwright/test';

/** Reads the bee's inline translate3d X (px), or null if unset. */
function beeX() {
  const el = document.getElementById('cursor-bee');
  if (!el) return null;
  const m = /translate3d\((-?\d+(?:\.\d+)?)px/.exec(el.style.transform);
  return m ? parseFloat(m[1]) : null;
}

test.describe('Cursor bee', () => {
  test('tracks the pointer on the homepage', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(500, 300);
    await page.waitForFunction(
      () => {
        const el = document.getElementById('cursor-bee');
        if (!el) return false;
        const m = /translate3d\((-?\d+(?:\.\d+)?)px/.exec(el.style.transform);
        return m ? parseFloat(m[1]) > 0 : false;
      },
      { timeout: 3000 },
    );
    const x = await page.evaluate(beeX);
    expect(x).not.toBeNull();
    expect(x as number).toBeGreaterThan(0);
  });

  test('keeps tracking after a client-side navigation', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(500, 300);
    // Navigate client-side via ClientRouter by clicking a homepage zone link.
    await page.locator('#main-content a.zone-link[data-zone="polyculture"]').click();
    await page.waitForURL('**/polyculture');
    await page.mouse.move(180, 420);
    await page.waitForFunction(
      () => {
        const el = document.getElementById('cursor-bee');
        if (!el) return false;
        const m = /translate3d\((-?\d+(?:\.\d+)?)px/.exec(el.style.transform);
        return m ? parseFloat(m[1]) > 0 : false;
      },
      { timeout: 3000 },
    );
    const x = await page.evaluate(beeX);
    expect(x as number).toBeGreaterThan(0);
  });
});
