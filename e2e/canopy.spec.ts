import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ── Structure ─────────────────────────────────────────────────────────────────

test.describe('Canopy index — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/canopy');
    await expect(page.getByRole('heading', { name: /The Canopy/i, level: 1 })).toBeVisible();
  });

  test('shows intro text', async ({ page }) => {
    await page.goto('/canopy');
    await expect(page.getByText(/Poems, essays, music/i).first()).toBeVisible();
  });

  test('note cards are visible', async ({ page }) => {
    await page.goto('/canopy');
    const notes = page.locator('[data-note]');
    await expect(notes.first()).toBeVisible();
    const count = await notes.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('colour key is visible', async ({ page }) => {
    await page.goto('/canopy');
    await expect(page.locator('[data-colour-key]')).toBeVisible();
  });
});

// ── Reduced motion (structure only — wind tests added in Task 4) ───────────────

test.describe('Canopy index — reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('notes are visible under reduced motion', async ({ page }) => {
    await page.goto('/canopy');
    await expect(page.locator('[data-note]').first()).toBeVisible();
  });

  test('note positions are set without animation under reduced motion', async ({ page }) => {
    await page.goto('/canopy');
    // Notes should have non-empty left/top inline styles from build time
    const note = page.locator('[data-note]').first();
    const style = await note.getAttribute('style');
    expect(style).toMatch(/left:-?\d/);
    expect(style).toMatch(/top:-?\d/);
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

test.describe('Canopy — accessibility', () => {
  test('canopy index passes axe audit', async ({ page }) => {
    await page.goto('/canopy');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
