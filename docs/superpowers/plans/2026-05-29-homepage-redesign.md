# Homepage Redesign — "Gurden's Garden" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the block-grid homepage with an organic, garden-like landing page — a giant bold "Gurden's Garden", six zone links scattered across the field each with a bespoke botanical glyph and hover-reveal description, ambient swaying flora, no nav logo on home, and all emojis removed site-wide.

**Architecture:** Static Astro 5 page. No new client JS and no canvas — flora sway and hover-reveal are pure CSS (`@keyframes` + `:hover`/`:focus-within`), gated by `prefers-reduced-motion`. Two new presentational components (`ZoneGlyph.astro`, `GardenFlora.astro`) keep `index.astro` focused. The `emoji` field is removed from the `zones.ts` data model after all consumers stop referencing it.

**Tech Stack:** Astro 5, TypeScript, MaziusDisplay/NectoMono web fonts, Playwright E2E (chromium + webkit, baseURL `http://localhost:4321`), Vitest, Lighthouse CI. Package manager: `pnpm`.

---

## Reference: zone data (current `src/lib/zones.ts`)

All six zones have a non-null `href`. Visible label = `zone.name`; hover hint = `zone.longDesc`:

| id | name | longDesc | href | emoji (to delete) |
|----|------|----------|------|-------------------|
| polyculture | The Polyculture | Work & projects | /polyculture | 🌿 |
| canopy | The Canopy | Art, poetry & essays | /canopy | 🌳 |
| hive | The Hive | Now & contact | /hive | 🐝 |
| compost | The Compost | Story & origins | /compost | 🪱 |
| mycelium | The Mycelium | Collaborators & network | /mycelium | 🍄 |
| beds | The Beds | Colophon & care | /beds | 🛠 |

## File Structure

**Create**
- `src/components/home/ZoneGlyph.astro` — renders the correct inline SVG botanical glyph for a given `id: ZoneId`. Stroke/fill colors come from palette CSS vars via scoped classes.
- `src/components/home/GardenFlora.astro` — ambient decorative sprigs (all `aria-hidden`), owns the `@keyframes flora-sway` + `prefers-reduced-motion` guard.

**Modify**
- `src/styles/tokens.css` — add `--text-display`.
- `src/pages/index.astro` — full body + style rewrite.
- `src/lib/zones.ts` — remove `emoji` (interface + 6 entries) — LAST, after consumers stop using it.
- `src/layouts/Garden.astro` — pass `home` to `<Nav>`; preload `ExtraItalicBold` font.
- `src/components/Nav.astro` — accept `home` prop; render nothing when `home`.
- `src/components/map/MapOverlay.astro` — remove `zone-emoji` spans + CSS.
- `src/pages/{canopy,compost,hive,mycelium,beds}/index.astro` — remove `zone-emoji` `<p>` + CSS.

**Modify (tests)**
- `e2e/map.spec.ts` — new homepage selectors + assertions.
- `e2e/accessibility.spec.ts` — move nav-landmark/logo tests to an inner page; add home-has-no-nav-logo + hover-reveal tests.

---

## Task 0: Preflight — clean tree + green baseline

**Files:** none (verification only)

- [ ] **Step 1: Confirm a clean working tree**

Run: `git status --short`
Expected: no output (clean). If there are unrelated changes, stop and ask the user.

- [ ] **Step 2: Run the unit suite (baseline)**

Run: `pnpm test`
Expected: all Vitest tests pass (this is the green starting point).

- [ ] **Step 3: Run the homepage E2E baseline**

Run: `pnpm exec playwright test e2e/map.spec.ts e2e/accessibility.spec.ts`
Expected: all pass against the CURRENT (pre-redesign) homepage. This confirms the harness works before we change anything.

---

## Task 1: Add the `--text-display` token

**Files:**
- Modify: `src/styles/tokens.css` (type-scale block, after `--text-4xl`)

- [ ] **Step 1: Add the token**

In `src/styles/tokens.css`, immediately after the `--text-4xl` line, add:

```css
--text-display: clamp(4rem, 16vw, 11rem); /* homepage masthead — far larger than --text-4xl */
```

- [ ] **Step 2: Verify the build still compiles**

Run: `pnpm exec astro check`
Expected: 0 errors (token addition is pure CSS; this just confirms nothing broke).

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat: add --text-display token for homepage masthead"
```

---

## Task 2: Create `ZoneGlyph.astro`

A focused presentational component: given a `ZoneId`, render that zone's botanical SVG glyph. Colors are applied via scoped classes bound to palette tokens (CSS custom properties cannot be used inside SVG presentation attributes, so we use classes, not `stroke="var(--…)"`).

**Files:**
- Create: `src/components/home/ZoneGlyph.astro`

- [ ] **Step 1: Create the component**

Create `src/components/home/ZoneGlyph.astro` with exactly this content:

```astro
---
import type { ZoneId } from '../../lib/zones';

interface Props {
  id: ZoneId;
}

const { id } = Astro.props;
---

<span class="zone-glyph" aria-hidden="true">
  {id === 'polyculture' && (
    <svg viewBox="0 0 36 36" role="presentation">
      <path class="s-moss" d="M18 34 V14" />
      <path class="s-moss" d="M18 22 Q8 18 6 9" />
      <path class="s-moss" d="M18 18 Q28 14 30 6" />
      <circle class="f-ochre" cx="6" cy="9" r="2" />
      <circle class="f-ochre" cx="30" cy="6" r="2" />
    </svg>
  )}
  {id === 'canopy' && (
    <svg viewBox="0 0 36 36" role="presentation">
      <path class="s-soil" d="M18 34 V20" />
      <circle class="f-moss" cx="18" cy="13" r="11" />
    </svg>
  )}
  {id === 'hive' && (
    <svg viewBox="0 0 36 36" role="presentation">
      <path class="s-ochre" d="M18 3 L31 10.5 V25.5 L18 33 L5 25.5 V10.5 Z" />
    </svg>
  )}
  {id === 'compost' && (
    <svg viewBox="0 0 36 36" role="presentation">
      <path class="s-soil" d="M4 11 H32 M4 20 H32 M4 29 H32" />
      <path class="s-chart" d="M9 29 q4 -6 8 0 t8 0" />
    </svg>
  )}
  {id === 'mycelium' && (
    <svg viewBox="0 0 36 36" role="presentation">
      <path class="s-moss" d="M18 32 V18 M18 18 L7 7 M18 18 L29 8 M18 18 V4" />
      <circle class="f-moss" cx="7" cy="7" r="2.5" />
      <circle class="f-moss" cx="29" cy="8" r="2.5" />
      <circle class="f-moss" cx="18" cy="4" r="2.5" />
    </svg>
  )}
  {id === 'beds' && (
    <svg viewBox="0 0 36 36" role="presentation">
      <path class="s-soil" d="M5 28 H31" />
      <path class="s-moss" d="M18 28 V14" />
      <path class="s-moss" d="M18 20 Q10 17 9 10" />
      <path class="s-moss" d="M18 18 Q26 15 27 9" />
    </svg>
  )}
</span>

<style>
  .zone-glyph {
    display: block;
  }

  .zone-glyph svg {
    width: 34px;
    height: 34px;
    display: block;
  }

  /* Strokes (outlines) */
  .zone-glyph path,
  .zone-glyph circle {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .s-moss  { stroke: var(--c-moss); }
  .s-soil  { stroke: var(--c-soil); }
  .s-ochre { stroke: var(--c-ochre); }
  .s-chart { stroke: var(--c-chartreuse); }

  /* Solid fills (dots, crown) */
  .f-moss  { fill: var(--c-moss);  stroke: none; }
  .f-ochre { fill: var(--c-ochre); stroke: none; }
</style>
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm exec astro check`
Expected: 0 errors (the `Props.id` is typed to `ZoneId`).

- [ ] **Step 3: Commit**

```bash
git add src/components/home/ZoneGlyph.astro
git commit -m "feat: add ZoneGlyph botanical glyph component"
```

---

## Task 3: Create `GardenFlora.astro`

Ambient decorative sprigs that sway gently. Pure ornament: `aria-hidden`, no links, no JS. Owns the sway keyframes and the reduced-motion guard.

**Files:**
- Create: `src/components/home/GardenFlora.astro`

- [ ] **Step 1: Create the component**

Create `src/components/home/GardenFlora.astro` with exactly this content:

```astro
---
// Decorative botanical sprigs for the homepage. Purely ornamental — no
// semantic content, hidden from assistive tech, motion disabled under
// prefers-reduced-motion.
---

<div class="garden-flora" aria-hidden="true">
  <!-- tall sprigs rooted along the bottom -->
  <svg class="garden-flora__sprig" style="left:4%;bottom:0;width:64px;height:160px;animation-delay:0s" viewBox="0 0 64 160">
    <path d="M32 160 Q32 76 32 22" stroke="var(--c-moss)" stroke-width="2" fill="none" />
    <path d="M32 96 Q6 86 4 54 Q28 62 32 96" fill="var(--c-moss)" opacity="0.75" />
    <path d="M32 74 Q58 64 60 32 Q36 40 32 74" fill="var(--c-moss)" opacity="0.55" />
    <circle cx="32" cy="22" r="7" stroke="var(--c-ochre)" stroke-width="2" fill="none" />
  </svg>
  <svg class="garden-flora__sprig" style="right:4%;bottom:0;width:54px;height:140px;animation-delay:1.3s" viewBox="0 0 54 140">
    <path d="M27 140 Q27 60 27 16" stroke="var(--c-soil)" stroke-width="2" fill="none" />
    <path d="M27 84 Q6 74 5 46 Q24 54 27 84" fill="var(--c-chartreuse)" />
    <circle cx="27" cy="16" r="6" fill="var(--c-ochre)" />
  </svg>
  <svg class="garden-flora__sprig" style="left:30%;bottom:0;width:40px;height:110px;animation-delay:2.4s" viewBox="0 0 40 110">
    <path d="M20 110 Q20 50 20 14" stroke="var(--c-moss)" stroke-width="1.6" fill="none" />
    <path d="M20 60 Q4 54 4 34 Q18 40 20 60" fill="var(--c-moss)" opacity="0.6" />
    <circle cx="20" cy="14" r="5" fill="var(--c-ochre)" />
  </svg>
  <svg class="garden-flora__sprig" style="right:33%;bottom:0;width:34px;height:96px;animation-delay:0.6s" viewBox="0 0 34 96">
    <path d="M17 96 Q17 44 17 12" stroke="var(--c-soil)" stroke-width="1.5" fill="none" />
    <path d="M17 52 Q30 46 31 28 Q19 34 17 52" fill="var(--c-chartreuse)" opacity="0.85" />
  </svg>
  <!-- small seed-heads drifting in the upper field -->
  <svg class="garden-flora__sprig" style="left:46%;top:8%;width:22px;height:46px;animation-delay:1.9s" viewBox="0 0 22 46">
    <path d="M11 46 Q11 18 11 6" stroke="var(--c-moss)" stroke-width="1.2" fill="none" />
    <circle cx="11" cy="6" r="4" fill="var(--c-ochre)" />
  </svg>
  <svg class="garden-flora__sprig" style="left:8%;top:30%;width:20px;height:40px;animation-delay:3.1s" viewBox="0 0 20 40">
    <path d="M10 40 Q10 16 10 6" stroke="var(--c-soil)" stroke-width="1.1" fill="none" />
    <path d="M10 22 Q2 18 2 9 Q8 13 10 22" fill="var(--c-moss)" opacity="0.7" />
  </svg>
  <svg class="garden-flora__sprig" style="right:9%;top:34%;width:20px;height:42px;animation-delay:1.1s" viewBox="0 0 20 42">
    <path d="M10 42 Q10 18 10 6" stroke="var(--c-moss)" stroke-width="1.1" fill="none" />
    <circle cx="10" cy="6" r="3.5" stroke="var(--c-ochre)" stroke-width="1.4" fill="none" />
  </svg>
</div>

<style>
  @keyframes flora-sway {
    0%, 100% { transform: rotate(-4deg); }
    50%      { transform: rotate(4deg); }
  }

  .garden-flora {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .garden-flora__sprig {
    position: absolute;
    transform-origin: bottom center;
    animation: flora-sway 5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .garden-flora__sprig {
      animation: none;
    }
  }
</style>
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm exec astro check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/GardenFlora.astro
git commit -m "feat: add GardenFlora ambient swaying sprigs"
```

---

## Task 4: Rewrite `index.astro` + update `map.spec.ts`

The big one. New homepage: giant title, scattered zone links (≥768px) / centered stack (<768px), per-zone glyphs, hover/focus-reveal hints, ambient flora. No emoji usage here. We update `e2e/map.spec.ts` in the SAME task because the selectors change (`.garden-map`/`.zone-patch` are gone).

Note: at this point `zones.ts` still has the `emoji` field — that's fine, the new `index.astro` simply stops referencing it. The field is deleted in Task 8.

**Files:**
- Modify (full rewrite): `src/pages/index.astro`
- Modify: `e2e/map.spec.ts`

- [ ] **Step 1: Rewrite the failing test first (`e2e/map.spec.ts`)**

Replace the ENTIRE contents of `e2e/map.spec.ts` with:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ZONE_HREFS = [
  '/polyculture',
  '/canopy',
  '/hive',
  '/compost',
  '/mycelium',
  '/beds',
] as const;

const EMOJI = ['🌿', '🌳', '🐝', '🪱', '🍄', '🛠'];

test.describe('Garden home page', () => {
  test('renders the giant garden title as the h1', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1.garden-title');
    await expect(h1).toBeAttached();
    await expect(h1).toHaveText("Gurden's Garden");
  });

  test('garden title is rendered very large', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const fontSizePx = await page.evaluate(() => {
      const el = document.querySelector('h1.garden-title') as HTMLElement;
      return parseFloat(getComputedStyle(el).fontSize);
    });
    // clamp(4rem, 16vw, 11rem) at 1280px -> 11rem (176px). Guard "way bigger".
    expect(fontSizePx).toBeGreaterThan(60);
  });

  test('all 6 zones are present as links with correct hrefs', async ({ page }) => {
    await page.goto('/');
    for (const href of ZONE_HREFS) {
      await expect(page.locator(`a.zone-link[href="${href}"]`)).toBeAttached();
    }
    await expect(page.locator('a.zone-link')).toHaveCount(6);
  });

  test('zones carry data-zone identifiers', async ({ page }) => {
    await page.goto('/');
    for (const id of ['polyculture', 'canopy', 'hive', 'compost', 'mycelium', 'beds']) {
      await expect(page.locator(`a.zone-link[data-zone="${id}"]`)).toBeAttached();
    }
  });

  test('focusing a zone reveals its description hint', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a.zone-link[data-zone="polyculture"]');
    await link.focus();
    const opacity = await link.locator('.zone-hint').evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0);
  });

  test('no emoji characters appear on the homepage', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('#main-content').innerText();
    for (const e of EMOJI) {
      expect(text).not.toContain(e);
    }
  });

  test('flora sway is suppressed under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const animName = await page.evaluate(() => {
      const el = document.querySelector('.garden-flora__sprig') as HTMLElement | null;
      return el ? getComputedStyle(el).animationName : null;
    });
    expect(animName).toBe('none');
  });

  test('home page passes axe accessibility audit', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it FAILS**

Run: `pnpm exec playwright test e2e/map.spec.ts --project=chromium`
Expected: FAIL — the current homepage has no `h1.garden-title` / `a.zone-link`, and still renders emoji.

- [ ] **Step 3: Rewrite `src/pages/index.astro`**

Replace the ENTIRE contents of `src/pages/index.astro` with:

```astro
---
import Garden from '@layouts/Garden.astro';
import { zones, type ZoneId } from '../lib/zones';
import ZoneGlyph from '../components/home/ZoneGlyph.astro';
import GardenFlora from '../components/home/GardenFlora.astro';

// Authored scatter coordinates (≥768px). Each link is centered on its anchor
// via translate(-50%,-50%). Positions hug the edges to clear the centered title.
const zonePos: Record<ZoneId, { x: string; y: string }> = {
  polyculture: { x: '11%', y: '14%' },
  canopy: { x: '86%', y: '12%' },
  hive: { x: '7%', y: '55%' },
  compost: { x: '92%', y: '57%' },
  mycelium: { x: '22%', y: '86%' },
  beds: { x: '77%', y: '85%' },
};
---

<Garden title="Home">
  <section class="garden-home" aria-label="Garden home">
    <GardenFlora />

    <h1 class="garden-title"><span>Gurden's</span> <span>Garden</span></h1>

    <ul class="zone-field" role="list">
      {zones.map((zone) => {
        const pos = zonePos[zone.id];
        return (
          <li>
            <a
              class="zone-link"
              href={zone.href ?? '#'}
              data-zone={zone.id}
              style={`--zx:${pos.x};--zy:${pos.y};`}
            >
              <ZoneGlyph id={zone.id} />
              <span class="zone-name">{zone.name}</span>
              <span class="zone-hint">{zone.longDesc}</span>
            </a>
          </li>
        );
      })}
    </ul>
  </section>
</Garden>

<style>
  .garden-home {
    position: relative;
    min-height: calc(100dvh - 4rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    padding: var(--space-12) var(--gutter);
    overflow: hidden;
    text-align: center;
  }

  /* ── GIANT TITLE ── */
  .garden-title {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 700; /* resolves to MaziusDisplay ExtraItalicBold */
    font-size: var(--text-display);
    line-height: 0.82;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 0;
    z-index: 1;
  }

  .garden-title span {
    display: block;
  }

  /* ── ZONE FIELD ── */
  .zone-field {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    z-index: 1;
  }

  .zone-field li {
    margin: 0;
  }

  .zone-link {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    text-decoration: none;
    color: var(--ink);
  }

  .zone-name {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: var(--text-lg);
    line-height: 1.1;
  }

  .zone-hint {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--c-soil);
    opacity: 0;
    transition: opacity var(--duration-base) var(--easing);
  }

  .zone-link:hover .zone-name,
  .zone-link:focus-visible .zone-name {
    text-decoration: underline;
  }

  .zone-link:hover .zone-hint,
  .zone-link:focus-within .zone-hint {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .zone-hint {
      transition: none;
    }
  }

  /* ── SCATTER (≥768px) ── */
  @media (min-width: 768px) {
    .zone-field {
      position: absolute;
      inset: 0;
      display: block;
      pointer-events: none;
    }

    .zone-field li {
      position: absolute;
      left: var(--zx, 50%);
      top: var(--zy, 50%);
      transform: translate(-50%, -50%);
    }

    .zone-link {
      pointer-events: auto;
      width: max-content;
    }
  }
</style>
```

Note: `<li>` carries `--zx`/`--zy` via the child `<a>`'s inline `style`. Because the inline custom properties are set on the `<a>`, they cascade and are also readable on the `<li>` only if set there. To keep positioning on the `<li>`, the inline style is on the `<a>`; move positioning to the `<a>` to match. See Step 3a.

- [ ] **Step 3a: Fix positioning target (apply scatter to the link, not the li)**

In the `@media (min-width: 768px)` block of `src/pages/index.astro`, replace the `.zone-field li` and `.zone-link` rules with:

```css
    .zone-field li {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .zone-link {
      position: absolute;
      left: var(--zx, 50%);
      top: var(--zy, 50%);
      transform: translate(-50%, -50%);
      pointer-events: auto;
      width: max-content;
    }
```

This keeps each `<li>` as a zero-cost full-bleed container and positions the `<a>` (which actually carries `--zx`/`--zy`) at its scatter coordinate.

- [ ] **Step 4: Run the homepage tests to verify they PASS**

Run: `pnpm exec playwright test e2e/map.spec.ts --project=chromium`
Expected: all 8 tests PASS.

- [ ] **Step 5: Verify it type-checks**

Run: `pnpm exec astro check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro e2e/map.spec.ts
git commit -m "feat: redesign homepage as scattered garden field"
```

---

## Task 5: Hide nav on home + preload display font + update accessibility tests

`Nav.astro` gains a `home` prop and renders nothing on the homepage. `Garden.astro` passes `home={title === 'Home'}` and preloads the ExtraItalicBold face (the giant title is the LCP element). `accessibility.spec.ts` moves nav-landmark/logo assertions to an inner page and adds a home-has-no-nav assertion.

**Files:**
- Modify: `src/components/Nav.astro`
- Modify: `src/layouts/Garden.astro`
- Modify: `e2e/accessibility.spec.ts`

- [ ] **Step 1: Write the failing tests first (`e2e/accessibility.spec.ts`)**

In `e2e/accessibility.spec.ts`, make these four edits:

(a) The `nav landmark is present` test (currently goes to `/`) — change its navigation to an inner page:

```ts
  test('nav landmark is present', async ({ page }) => {
    await page.goto('/polyculture');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeAttached();
  });
```

(b) The `nav contains the logo link` test — change to an inner page:

```ts
  test('nav contains the logo link', async ({ page }) => {
    await page.goto('/polyculture');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('a[href="/"]')).toBeAttached();
  });
```

(c) The `nav does not contain old zone links` test — change to an inner page (so it tests a nav that actually exists):

```ts
  test('nav does not contain old zone links (navigation is via map overlay)', async ({ page }) => {
    await page.goto('/polyculture');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('a[href="/polyculture"]')).not.toBeAttached();
    await expect(nav.locator('a[href="/compost"]')).not.toBeAttached();
  });
```

(d) Add a NEW test inside the `Nav component` describe block:

```ts
  test('homepage has no main nav and no gurden.xyz logo', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
    await expect(page.getByText('gurden.xyz')).toHaveCount(0);
  });
```

- [ ] **Step 2: Run the tests to verify they FAIL**

Run: `pnpm exec playwright test e2e/accessibility.spec.ts --project=chromium`
Expected: FAIL — the homepage currently still renders the `gurden.xyz` nav, so the new "no main nav" test fails (and inner-page tests pass already, which is fine).

- [ ] **Step 3: Add the `home` prop to `Nav.astro`**

Replace the ENTIRE contents of `src/components/Nav.astro` with:

```astro
---
interface Props {
  home?: boolean;
}

const { home = false } = Astro.props;
---

{!home && (
  <nav aria-label="Main navigation">
    <div class="nav-inner page-wrap">
      <a href="/" class="nav-logo">
        gurden.xyz
      </a>
    </div>
  </nav>
)}

<style>
  nav {
    border-bottom: 1px solid var(--ink-faint);
    position: sticky;
    top: 0;
    background: var(--ground);
    z-index: 10;
  }

  .nav-inner {
    display: flex;
    align-items: center;
    padding-block: var(--space-4);
  }

  .nav-logo {
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: var(--text-base);
    color: var(--ink);
    text-decoration: none;
    line-height: 1;
    transition: color var(--duration-fast) var(--easing);
  }

  .nav-logo:hover {
    color: var(--ink-muted);
  }
</style>
```

- [ ] **Step 4: Pass `home` and preload the font in `Garden.astro`**

In `src/layouts/Garden.astro`:

(a) Change the Nav usage (currently `<Nav />`) to:

```astro
      <Nav home={title === 'Home'} />
```

(b) In `<head>`, immediately after the existing `MaziusDisplay-Extraitalic` preload line, add:

```astro
    <link rel="preload" href="/fonts/MaziusDisplay-ExtraItalicBold.woff2" as="font" type="font/woff2" crossorigin />
```

- [ ] **Step 5: Run the accessibility tests to verify they PASS**

Run: `pnpm exec playwright test e2e/accessibility.spec.ts --project=chromium`
Expected: all PASS.

- [ ] **Step 6: Re-run the homepage tests (no regression)**

Run: `pnpm exec playwright test e2e/map.spec.ts --project=chromium`
Expected: all PASS (axe still clean now that the home nav is gone).

- [ ] **Step 7: Commit**

```bash
git add src/components/Nav.astro src/layouts/Garden.astro e2e/accessibility.spec.ts
git commit -m "feat: hide nav logo on homepage, preload display font"
```

---

## Task 6: Remove emoji from `MapOverlay.astro`

**Files:**
- Modify: `src/components/map/MapOverlay.astro`

- [ ] **Step 1: Remove the emoji spans**

In `src/components/map/MapOverlay.astro`, delete BOTH occurrences of this line (one in the `zone.href` branch, one in the `--soon` branch):

```astro
                <span class="zone-emoji" aria-hidden="true">{zone.emoji}</span>
```

- [ ] **Step 2: Remove the emoji CSS rule**

In the same file's `<style>`, delete the entire `.zone-emoji` rule:

```css
  .zone-emoji {
    font-size: 1.5rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
  }
```

- [ ] **Step 3: Verify it type-checks and overlay tests still pass**

Run: `pnpm exec astro check`
Expected: 0 errors.

Run: `pnpm exec playwright test e2e/accessibility.spec.ts --project=chromium -g "MapOverlay"`
Expected: all MapOverlay tests PASS (structure/hrefs/`data-zone` unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/components/map/MapOverlay.astro
git commit -m "refactor: remove emoji from garden map overlay"
```

---

## Task 7: Remove emoji from the five zone index pages

Each of these pages has a `<p class="label zone-emoji" aria-hidden="true">EMOJI</p>` inside its `<header>` and a `.zone-emoji` CSS block. Remove both from each.

**Files:**
- Modify: `src/pages/canopy/index.astro`
- Modify: `src/pages/compost/index.astro`
- Modify: `src/pages/hive/index.astro`
- Modify: `src/pages/mycelium/index.astro`
- Modify: `src/pages/beds/index.astro`

- [ ] **Step 1: `canopy/index.astro`**

Delete the line `<p class="label zone-emoji" aria-hidden="true">🌳</p>` and the `.zone-emoji { … }` CSS rule.

- [ ] **Step 2: `compost/index.astro`**

Delete the line `<p class="label zone-emoji" aria-hidden="true">🪱</p>` and the `.zone-emoji { … }` CSS rule.

- [ ] **Step 3: `hive/index.astro`**

Delete the line `<p class="label zone-emoji" aria-hidden="true">🐝</p>` and the `.zone-emoji { … }` CSS rule.

- [ ] **Step 4: `mycelium/index.astro`**

Delete the line `<p class="label zone-emoji" aria-hidden="true">🍄</p>` and the `.zone-emoji { … }` CSS rule.

- [ ] **Step 5: `beds/index.astro`**

Delete the line `<p class="label zone-emoji" aria-hidden="true">🛠</p>` and the `.zone-emoji { … }` CSS rule.

- [ ] **Step 6: Verify there are no remaining `zone-emoji` references anywhere**

Run: `grep -rn "zone-emoji\|zone.emoji" src/`
Expected: NO output (every reference removed; `index.astro` and `MapOverlay.astro` were cleaned in earlier tasks).

- [ ] **Step 7: Verify it type-checks**

Run: `pnpm exec astro check`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/canopy/index.astro src/pages/compost/index.astro src/pages/hive/index.astro src/pages/mycelium/index.astro src/pages/beds/index.astro
git commit -m "refactor: remove emoji from zone index page headers"
```

---

## Task 8: Remove the `emoji` field from `zones.ts`

All consumers now stop referencing `zone.emoji` (homepage rewritten, overlay cleaned, zone pages cleaned). Delete the field from the data model so TypeScript guarantees it is unused.

**Files:**
- Modify: `src/lib/zones.ts`

- [ ] **Step 1: Remove from the interface**

In `src/lib/zones.ts`, delete this line from the `Zone` interface:

```ts
  emoji: string;
```

- [ ] **Step 2: Remove from all 6 entries**

Delete the `emoji: '…',` line from each of the six zone objects (`🌿`, `🌳`, `🐝`, `🪱`, `🍄`, `🛠`).

- [ ] **Step 3: Verify the whole project type-checks**

Run: `pnpm exec astro check`
Expected: 0 errors. (If `astro check` reports `Property 'emoji' does not exist`, a consumer was missed — fix it before continuing.)

- [ ] **Step 4: Run unit tests**

Run: `pnpm test`
Expected: all Vitest tests pass (no test references `emoji`; if one does, update it to match the new model).

- [ ] **Step 5: Commit**

```bash
git add src/lib/zones.ts
git commit -m "refactor: drop emoji field from zone data model"
```

---

## Task 9: Final sweep — full E2E, units, Lighthouse

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 2: Type check**

Run: `pnpm exec astro check`
Expected: 0 errors, 0 warnings related to this work.

- [ ] **Step 3: Full E2E across both browsers**

Run: `pnpm exec playwright test`
Expected: all pass on chromium AND webkit (any pre-existing skips remain skips, no new failures). Pay attention to `map.spec.ts`, `accessibility.spec.ts`, and the five zone specs (`canopy/compost/hive/mycelium/beds`) — confirm none asserted emoji presence.

- [ ] **Step 4: Lighthouse CI**

Run: `pnpm lhci autorun`
Expected: budgets green on `/` and all six zones (the ExtraItalicBold preload protects homepage LCP).

- [ ] **Step 5: Manual visual confirmation**

Run: `pnpm dev` and open `http://localhost:4321/`
Confirm by eye:
- "Gurden's Garden" is huge, bold, italic, centered.
- Six zones scattered around the field, each with its botanical glyph; hovering/focusing reveals the description.
- Sprigs sway gently; no emoji anywhere; no `gurden.xyz` strip at the top.
- Resize narrow (<768px): zones collapse to a centered stack beneath the title.

- [ ] **Step 6: Final commit (if Steps 1–5 produced any fixups)**

```bash
git add -A
git commit -m "test: verify homepage redesign across E2E, units, and Lighthouse"
```

If no fixups were needed, skip this commit.

---

## Self-Review (filled in by plan author)

**1. Spec coverage:**
- Less block-based / garden feel → Task 4 (scattered field, flora). ✓
- Remove `gurden.xyz` from homepage top → Task 5 (Nav `home` prop). ✓
- Bigger/bold "Gurden's Garden" → Task 1 (`--text-display`) + Task 4 (weight 700 italic → ExtraItalicBold) + Task 5 (font preload). ✓
- Remove all emojis site-wide → Tasks 4 (home), 6 (overlay), 7 (zone pages), 8 (data model). ✓
- Scatter zone links → Task 4 (`zonePos` + ≥768px absolute). ✓
- Per-zone visual mark → Task 2 (`ZoneGlyph`). ✓
- More ambient flora → Task 3 (`GardenFlora`, 7 sprigs). ✓
- Responsive fallback, reduced-motion, hover-reveal → Task 4. ✓
- Test updates (nav off `/`, no-emoji, hover, axe) → Tasks 4 & 5. ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows full code; every command has expected output.

**3. Type consistency:** `ZoneId` imported from `../../lib/zones` in `ZoneGlyph.astro` and `../lib/zones` in `index.astro` (paths differ by depth — correct). `ZoneGlyph` prop is `id: ZoneId`; `index.astro` passes `id={zone.id}`. `zonePos: Record<ZoneId, …>` covers all six ids. CSS class `.garden-flora__sprig` is referenced identically in `GardenFlora.astro` and the reduced-motion test in `map.spec.ts`. `h1.garden-title`, `a.zone-link`, `.zone-hint`, `data-zone` selectors match between `index.astro` and `map.spec.ts`.
