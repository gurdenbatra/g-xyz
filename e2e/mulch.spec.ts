import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ── Structure ─────────────────────────────────────────────────────────────────

test.describe('Mulch index — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/mulch');
    await expect(page.getByRole('heading', { name: /The Mulch/i, level: 1 })).toBeVisible();
  });

  test('shows intro text', async ({ page }) => {
    await page.goto('/mulch');
    await expect(page.getByText(/leaf litter/i).first()).toBeVisible();
  });

  test('note cards are visible', async ({ page }) => {
    await page.goto('/mulch');
    const notes = page.locator('[data-note]');
    await expect(notes.first()).toBeVisible();
    const count = await notes.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('colour key is visible', async ({ page }) => {
    await page.goto('/mulch');
    await expect(page.locator('[data-colour-key]')).toBeVisible();
  });
});

// ── Wind animation ────────────────────────────────────────────────────────────

test.describe('Mulch index — wind animation', () => {
  test('notes receive wind drift transform when motion is allowed', async ({ page }) => {
    await page.goto('/mulch');
    // SSG emits rotate(Xdeg) only; the wind script adds translateY via rAF
    const note = page.locator('[data-note]').first();
    await expect(async () => {
      const transform = await note.evaluate(el => (el as HTMLElement).style.transform);
      expect(transform).toMatch(/translateY/);
    }).toPass({ timeout: 2000 });
  });
});

// ── Reduced motion ────────────────────────────────────────────────────────────

test.describe('Mulch index — reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('notes are visible under reduced motion', async ({ page }) => {
    await page.goto('/mulch');
    await expect(page.locator('[data-note]').first()).toBeVisible();
  });

  test('note positions are set without animation under reduced motion', async ({ page }) => {
    await page.goto('/mulch');
    // Notes should have non-empty left/top inline styles from build time
    const note = page.locator('[data-note]').first();
    const style = await note.getAttribute('style');
    expect(style).toMatch(/left:\d/);   // should always be non-negative percentage
    expect(style).toMatch(/top:\d/);    // should always be non-negative px
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

test.describe('Mulch — accessibility', () => {
  test('mulch index passes axe audit', async ({ page }) => {
    await page.goto('/mulch');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

// ── Link-out ──────────────────────────────────────────────────────────────────

test.describe('Mulch index — external links', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('notes link out to where the work lives', async ({ page }) => {
    await page.goto('/mulch');
    const notes = page.locator('[data-note]');
    const count = await notes.count();
    expect(count).toBeGreaterThanOrEqual(10);
    for (let i = 0; i < count; i++) {
      const note = notes.nth(i);
      await expect(note).toHaveAttribute('href', /^https?:\/\//);
      await expect(note).toHaveAttribute('target', '_blank');
      await expect(note).toHaveAttribute('rel', /noopener/);
    }
  });

  test('the three media live where expected (tumblr, soundcloud, instagram)', async ({ page }) => {
    await page.goto('/mulch');
    const hrefs = await page.locator('[data-note]').evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).href),
    );
    expect(hrefs.some((h) => h.includes('eternalnoises.tumblr.com'))).toBe(true);
    expect(hrefs.some((h) => h.includes('soundcloud.com'))).toBe(true);
    expect(hrefs.some((h) => h.includes('instagram.com'))).toBe(true);
  });
});
