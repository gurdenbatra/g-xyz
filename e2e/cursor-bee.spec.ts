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
    // The bee is suppressed under reduced motion; pin it so the test is
    // deterministic regardless of the CI environment's default.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
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
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.mouse.move(500, 300);
    // Navigate client-side via ClientRouter by clicking a homepage zone link.
    await page.locator('#main-content a.zone-link[data-zone="flora"]').click();
    await page.waitForURL('**/flora');
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
    expect(x).not.toBeNull();
    expect(x as number).toBeGreaterThan(0);
  });
});
