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

// ── Detail page — poem ────────────────────────────────────────────────────────

test.describe('Canopy detail — poem', () => {
  test('shows h1 and back link', async ({ page }) => {
    await page.goto('/canopy/elegy-for-the-undercommons');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /← The Canopy/i })).toBeVisible();
  });

  test('shows poem body text', async ({ page }) => {
    await page.goto('/canopy/elegy-for-the-undercommons');
    await expect(page.locator('.piece-body')).toBeVisible();
  });

  test('back link navigates to /canopy', async ({ page }) => {
    await page.goto('/canopy/elegy-for-the-undercommons');
    await page.getByRole('link', { name: /← The Canopy/i }).click();
    await expect(page).toHaveURL('/canopy');
  });
});

// ── Detail page — music/AV ────────────────────────────────────────────────────

test.describe('Canopy detail — music', () => {
  test('shows iframe embed', async ({ page }) => {
    await page.goto('/canopy/eternal-noises-iii');
    const iframe = page.locator('.piece-embed');
    await expect(iframe).toBeAttached();
    const src = await iframe.getAttribute('src');
    expect(src).toBeTruthy();
  });

  test('shows fallback source link', async ({ page }) => {
    await page.goto('/canopy/eternal-noises-iii');
    await expect(page.locator('.piece-source-link')).toBeVisible();
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

test.describe('Canopy index — navigation', () => {
  test('clicking a note navigates to its detail page', async ({ page }) => {
    await page.goto('/canopy');
    const firstNote = page.locator('[data-note]').first();
    const href = await firstNote.getAttribute('href');
    expect(href).toMatch(/^\/canopy\//);
    await firstNote.click({ force: true });
    await expect(page).toHaveURL(/\/canopy\/.+/);
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

test.describe('Canopy detail — accessibility', () => {
  test('poem detail passes axe audit', async ({ page }) => {
    await page.goto('/canopy/elegy-for-the-undercommons');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
