# Garden Re-narration — Phase 3 (Local-hour Day/Night) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. The night palette is visible — verify it in the browser preview (light AND dark) before finalizing.

**Goal:** Theme the whole site by the visitor's local hour (dawn / day / dusk / night), with the OS `prefers-color-scheme` and a manual toggle able to override, mirroring the existing seasonal system.

**Architecture:** A pure, Node-safe `daytime.ts` (`timeOfDay(hour)` + `resolveDaytime(pref, prefersDark, hour)`) — Vitest-tested. A `daytime.css` layer of `[data-daytime='…']` token overrides (mirrors `seasonal.css`). `Garden.astro` bakes a build-time default (`data-daytime="day"`) and adds a tiny **pre-paint inline head script** that resolves the real phase before first paint (no flash) and re-applies on `astro:after-swap`. A small accessible `DaytimeToggle` cycles auto → light → dark, persisted in `localStorage`. Layers on top of seasonal accents — they compose.

**Tech Stack:** Astro 5, TypeScript, Vitest, scoped CSS / token overrides, Playwright (`emulateMedia`, `localStorage`), Lighthouse CI, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-11-garden-renarration-and-ambient-ecology-design.md` (§ "Day/night by local hour").
**Builds on:** Phase 1 (structure) + Phase 2 (visual) — landed.

---

## Reference — the established pattern to mirror

- `src/lib/season.ts` → `seasonFor(date): Season` + `season.test.ts`.
- `src/styles/seasonal.css` → `[data-season='spring'] { --accent: … }` token overrides; imported by `global.css`.
- `src/layouts/Garden.astro` → `const season = seasonFor(new Date());` and `<html lang="en" data-season={season}>` (build-time). The head already hosts an inline `<script>` block (the map logic) and an `astro:page-load` listener; we add a separate pre-paint script.
- Palette tokens in `src/styles/tokens.css`: `--c-paper #F1E8D0`, `--c-soil #8A4F2E`, `--c-ochre #D9A857`, `--c-moss #5A7A4A`, `--c-chartreuse #C4D670`, `--c-ink #1A1A1A`; semantic `--ground`, `--ink`, `--ink-muted #4A4A48`, `--ink-faint #B8B0A0`; **reserved night surfaces already defined**: `--art-ground #0D0F10`, `--art-ink #E8E4DD`.
- Zone labels and many UI bits reference `var(--c-soil)` directly, so the night layer must lighten `--c-soil` (and peers) for contrast, not just swap `--ground`/`--ink`.

## File Structure

**Create:** `src/lib/daytime.ts`, `src/lib/daytime.test.ts`, `src/styles/daytime.css`, `src/components/DaytimeToggle.astro`, `e2e/daytime.spec.ts`.
**Modify:** `src/styles/global.css` (import the layer), `src/layouts/Garden.astro` (default attr + pre-paint script + toggle mount + after-swap re-apply).

---

## Task 0: Preflight

- [ ] **Step 1:** `git status --short` → clean. `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`.
- [ ] **Step 2:** `pnpm test` → 139 pass.
- [ ] **Step 3:** `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → pass.

---

## Task 1: `daytime.ts` pure module (TDD)

**Files:** Create `src/lib/daytime.ts`, `src/lib/daytime.test.ts`.

- [ ] **Step 1: Write the failing tests** — create `src/lib/daytime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { timeOfDay, resolveDaytime, DAYTIMES, type Daytime } from './daytime';

describe('timeOfDay', () => {
  it('maps hours to the four phases', () => {
    expect(timeOfDay(0)).toBe('night');
    expect(timeOfDay(4)).toBe('night');
    expect(timeOfDay(5)).toBe('dawn');
    expect(timeOfDay(7)).toBe('dawn');
    expect(timeOfDay(8)).toBe('day');
    expect(timeOfDay(16)).toBe('day');
    expect(timeOfDay(17)).toBe('dusk');
    expect(timeOfDay(19)).toBe('dusk');
    expect(timeOfDay(20)).toBe('night');
    expect(timeOfDay(23)).toBe('night');
  });

  it('only ever returns a known phase, for every hour 0–23', () => {
    for (let h = 0; h < 24; h++) {
      expect(DAYTIMES).toContain(timeOfDay(h));
    }
  });
});

describe('resolveDaytime', () => {
  it("manual 'light' wins over everything", () => {
    expect(resolveDaytime('light', true, 23)).toBe('day');
  });
  it("manual 'dark' wins over everything", () => {
    expect(resolveDaytime('dark', false, 12)).toBe('night');
  });
  it("auto + OS dark → night", () => {
    expect(resolveDaytime('auto', true, 12)).toBe('night');
  });
  it("auto + no OS pref → follows the local hour", () => {
    expect(resolveDaytime('auto', false, 12)).toBe('day');
    expect(resolveDaytime('auto', false, 22)).toBe('night');
    expect(resolveDaytime('auto', false, 6)).toBe('dawn');
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `pnpm test src/lib/daytime.test.ts` → module not found.

- [ ] **Step 3: Implement** — create `src/lib/daytime.ts`:

```ts
// Pure, Node-safe day/night logic. Mirrors lib/season.ts. No DOM access:
// the hour and preferences are injected, so it unit-tests in Node and is
// reused verbatim by the pre-paint script in Garden.astro.

export const DAYTIMES = ['dawn', 'day', 'dusk', 'night'] as const;
export type Daytime = (typeof DAYTIMES)[number];

export type DaytimePref = 'auto' | 'light' | 'dark';

/** Local-hour → phase. dawn 5–7, day 8–16, dusk 17–19, night 20–4. */
export function timeOfDay(hour: number): Daytime {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

/** Precedence: manual toggle > OS dark preference > local hour. */
export function resolveDaytime(
  pref: DaytimePref,
  prefersDark: boolean,
  hour: number,
): Daytime {
  if (pref === 'light') return 'day';
  if (pref === 'dark') return 'night';
  if (prefersDark) return 'night';
  return timeOfDay(hour);
}
```

- [ ] **Step 4: Run to verify PASS** — `pnpm test src/lib/daytime.test.ts` → pass; `pnpm test` → all pass (139 + new).
- [ ] **Step 5: Commit**

```bash
git add src/lib/daytime.ts src/lib/daytime.test.ts
git commit -m "feat: daytime pure module (timeOfDay + resolveDaytime precedence)"
```

---

## Task 2: `daytime.css` token-override layer

Mirrors `seasonal.css`. `day` is the default (paper). `dawn`/`dusk` warm the paper slightly. `night` flips to dark surfaces (using the reserved `--art-ground`/`--art-ink`) and lightens the earth palette tokens so existing `var(--c-soil)`/`var(--c-moss)` references stay legible on dark.

**Files:** Create `src/styles/daytime.css`; modify `src/styles/global.css`.

- [ ] **Step 1:** Create `src/styles/daytime.css`:

```css
/*
 * Day/night modifier. Garden.astro bakes data-daytime on <html> at build and
 * a pre-paint script corrects it to the visitor's local hour (OS + manual
 * toggle override). Layers on top of seasonal.css — seasons tint accents,
 * daytime sets light/dark surfaces + warmth. A short transition makes the
 * toggle feel intentional (disabled under reduced motion).
 */
:root {
  --daytime-wash: transparent; /* sky/light wash, per phase */
}

html {
  transition: background-color var(--duration-slow) var(--easing),
    color var(--duration-slow) var(--easing);
}

[data-daytime='dawn'] {
  --ground: #F3E9D6;
  --daytime-wash: rgba(217, 168, 87, 0.05);
}

[data-daytime='day'] {
  /* defaults from tokens.css — explicit for clarity */
  --ground: var(--c-paper);
  --daytime-wash: transparent;
}

[data-daytime='dusk'] {
  --ground: #EDDBC0;
  --daytime-wash: rgba(138, 79, 46, 0.06);
}

[data-daytime='night'] {
  --ground: var(--art-ground);
  --ink: var(--art-ink);
  --ink-muted: #B9B3A8;
  --ink-faint: #3A3D40;
  /* lighten the earth palette so existing var(--c-*) refs stay legible */
  --c-soil: #C9A06E;
  --c-moss: #8FB079;
  --c-ochre: #E6BE73;
  --c-chartreuse: #D2E08A;
  --c-ink: var(--art-ink);
  --daytime-wash: rgba(42, 58, 90, 0.18);
  color-scheme: dark;
}

@media (prefers-reduced-motion: reduce) {
  html { transition: none; }
}
```

- [ ] **Step 2:** Import it in `src/styles/global.css` immediately AFTER the `seasonal.css` import (so daytime surfaces layer over seasonal accents). Add:

```css
@import './daytime.css';
```

- [ ] **Step 3:** Verify the body uses `--ground`/`--ink`. Run `grep -n "background\|color" src/styles/global.css | head`. If `body` already sets `background: var(--ground)` and `color: var(--ink)`, no change. If it hardcodes paper/ink, change those to the tokens. (Report what you find.)
- [ ] **Step 4:** Build → `pnpm build` succeeds. No test change yet.
- [ ] **Step 5: Commit**

```bash
git add src/styles/daytime.css src/styles/global.css
git commit -m "feat: daytime.css — dawn/day/dusk/night token overrides + night dark surfaces"
```

---

## Task 3: Wire the default + pre-paint resolve in `Garden.astro`

The build-time attribute prevents a flash for no-JS / first paint; the pre-paint inline script (runs synchronously in `<head>`, before body paints) corrects it to the visitor's real phase; `astro:after-swap` re-applies after each view transition (the swapped-in `<html>` carries the SSG default).

**Files:** Modify `src/layouts/Garden.astro`.

- [ ] **Step 1:** Import the helper + compute the build default. In the frontmatter, after the `seasonFor` import add:

```ts
import { resolveDaytime } from '../lib/daytime';
```

and after `const season = …` add:

```ts
// SSG default; the pre-paint script below corrects it to the visitor's local
// hour (and OS / manual-toggle override) before first paint.
const daytime = 'day';
```

- [ ] **Step 2:** Add the attribute to `<html>`: change `<html lang="en" data-season={season}>` to `<html lang="en" data-season={season} data-daytime={daytime}>`.

- [ ] **Step 3:** Add a pre-paint inline script as the FIRST child of `<head>` (before `<meta charset>` is fine; it must be a plain non-module `<script is:inline>` so it runs before paint and is not deferred). Insert immediately after `<head>`:

```astro
    <script is:inline>
      (function () {
        function timeOfDay(h) {
          h = ((Math.floor(h) % 24) + 24) % 24;
          if (h >= 5 && h < 8) return 'dawn';
          if (h >= 8 && h < 17) return 'day';
          if (h >= 17 && h < 20) return 'dusk';
          return 'night';
        }
        function resolve() {
          var pref = null;
          try { pref = localStorage.getItem('gg-daytime'); } catch (e) {}
          if (pref === 'light') return 'day';
          if (pref === 'dark') return 'night';
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'night';
          return timeOfDay(new Date().getHours());
        }
        function apply() { document.documentElement.setAttribute('data-daytime', resolve()); }
        apply();
        document.addEventListener('astro:after-swap', apply);
      })();
    </script>
```

(The `timeOfDay` here is a deliberate inline mirror of `lib/daytime.ts` — it must run before any module loads, so it can't import. The two are kept in sync; the unit tests pin the boundaries. Keep them identical if you change the thresholds.)

- [ ] **Step 4:** Build + smoke. `pnpm build` succeeds. `preview_start` (or `pnpm dev`); load `/`; in the console, `document.documentElement.dataset.daytime` returns a phase. Toggle OS dark (preview_resize colorScheme:dark) → reload → `night`.
- [ ] **Step 5: Commit**

```bash
git add src/layouts/Garden.astro
git commit -m "feat: resolve daytime by local hour before paint (OS override, view-transition re-apply)"
```

---

## Task 4: `DaytimeToggle` control (auto → light → dark)

A small, accessible button that cycles the manual preference, persists it, and applies it live. Sits in the footer region.

**Files:** Create `src/components/DaytimeToggle.astro`; modify `src/layouts/Garden.astro` (mount it).

- [ ] **Step 1:** Create `src/components/DaytimeToggle.astro`:

```astro
---
// Cycles the day/night preference: auto → light → dark → auto. Persists to
// localStorage('gg-daytime'); applies immediately by re-running the same
// resolve the pre-paint script uses. Purely an override — 'auto' defers to
// OS preference, then the visitor's local hour.
---

<button
  id="daytime-toggle"
  class="daytime-toggle label"
  type="button"
  data-pref="auto"
  aria-label="Lighting: automatic (follows your local time). Activate to switch."
>
  <span class="daytime-toggle__icon" aria-hidden="true">◐</span>
  <span class="daytime-toggle__text">Auto</span>
</button>

<style>
  .daytime-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: none;
    border: 1px solid var(--ink-faint);
    border-radius: 999px;
    padding: var(--space-1) var(--space-3);
    color: var(--ink-muted);
    cursor: pointer;
    font-size: var(--text-xs);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: border-color var(--duration-fast) var(--easing),
      color var(--duration-fast) var(--easing);
  }
  .daytime-toggle:hover,
  .daytime-toggle:focus-visible {
    border-color: var(--ink);
    color: var(--ink);
  }
  .daytime-toggle__icon { font-size: 1em; line-height: 1; }
</style>

<script>
  import { resolveDaytime, type DaytimePref } from '../lib/daytime';

  const CYCLE: DaytimePref[] = ['auto', 'light', 'dark'];
  const ICON: Record<DaytimePref, string> = { auto: '◐', light: '☀', dark: '☾' };
  const TEXT: Record<DaytimePref, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

  function readPref(): DaytimePref {
    try {
      const v = localStorage.getItem('gg-daytime');
      if (v === 'light' || v === 'dark' || v === 'auto') return v;
    } catch (e) {}
    return 'auto';
  }

  function apply(pref: DaytimePref) {
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const phase = resolveDaytime(pref, prefersDark, new Date().getHours());
    document.documentElement.setAttribute('data-daytime', phase);
  }

  function sync(btn: HTMLButtonElement) {
    const pref = readPref();
    btn.dataset.pref = pref;
    const icon = btn.querySelector<HTMLElement>('.daytime-toggle__icon');
    const text = btn.querySelector<HTMLElement>('.daytime-toggle__text');
    if (icon) icon.textContent = ICON[pref];
    if (text) text.textContent = TEXT[pref];
    btn.setAttribute(
      'aria-label',
      `Lighting: ${TEXT[pref].toLowerCase()}${pref === 'auto' ? ' (follows your local time)' : ''}. Activate to switch.`,
    );
  }

  function bind() {
    const btn = document.getElementById('daytime-toggle') as HTMLButtonElement | null;
    if (!btn) return;
    sync(btn);
    btn.addEventListener('click', () => {
      const current = readPref();
      const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
      try { localStorage.setItem('gg-daytime', next); } catch (e) {}
      apply(next);
      sync(btn);
    });
  }

  bind();
  document.addEventListener('astro:page-load', bind);
</script>
```

- [ ] **Step 2:** Mount it in `Garden.astro`. Import in frontmatter: `import DaytimeToggle from '../components/DaytimeToggle.astro';` and render it inside the `<Footer />` area — place `<DaytimeToggle />` on the line immediately before `<Footer />` (or inside the footer if the Footer accepts a slot; otherwise just before it is fine).
- [ ] **Step 3: Preview + verify.** Reload `/`; the pill shows "◐ Auto". Click → "☀ Light" (page goes light/day), click → "☾ Dark" (page goes dark), click → back to "Auto". Reload → the chosen pref persists. Keyboard: Tab to it, Enter cycles. `preview_console_logs` level error → none.
- [ ] **Step 4:** Build + type-check. `pnpm build` succeeds; `pnpm exec astro check` → no NEW errors.
- [ ] **Step 5: Commit**

```bash
git add src/components/DaytimeToggle.astro src/layouts/Garden.astro
git commit -m "feat: daytime toggle (auto/light/dark) with persistence"
```

---

## Task 5: E2E — day/night behavior

**Files:** Create `e2e/daytime.spec.ts`.

- [ ] **Step 1:** Create `e2e/daytime.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

const phase = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.getAttribute('data-daytime'));

test.describe('Day/night', () => {
  test('sets a known data-daytime phase on load', async ({ page }) => {
    await page.goto('/');
    expect(['dawn', 'day', 'dusk', 'night']).toContain(await phase(page));
  });

  test('OS dark preference yields night (auto)', async ({ page, context }) => {
    await context.clearCookies();
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => { try { localStorage.removeItem('gg-daytime'); } catch (e) {} });
    await page.goto('/');
    expect(await phase(page)).toBe('night');
  });

  test('manual light preference overrides OS dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => { try { localStorage.setItem('gg-daytime', 'light'); } catch (e) {} });
    await page.goto('/');
    expect(await phase(page)).toBe('day');
  });

  test('toggle cycles auto → light → dark and persists', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.removeItem('gg-daytime'); } catch (e) {} });
    await page.goto('/');
    const btn = page.locator('#daytime-toggle');
    await expect(btn).toHaveAttribute('data-pref', 'auto');
    await btn.click();
    await expect(btn).toHaveAttribute('data-pref', 'light');
    await expect(page).toHaveURL('/');
    expect(await phase(page)).toBe('day');
    await btn.click();
    await expect(btn).toHaveAttribute('data-pref', 'dark');
    expect(await phase(page)).toBe('night');
    await page.reload();
    await expect(btn).toHaveAttribute('data-pref', 'dark');
  });

  test('night mode passes axe (dark contrast)', async ({ page }) => {
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    await page.addInitScript(() => { try { localStorage.setItem('gg-daytime', 'dark'); } catch (e) {} });
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** — `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`, then `pnpm exec playwright test e2e/daytime.spec.ts --project=chromium`. Expected: all pass.
  - If the **night axe** test fails on contrast, the offending element's color is referenced from a palette token not yet lightened in `daytime.css [data-daytime='night']`. Inspect the failing node (axe reports the selector + colors), then lighten that token (or add a night override) in `daytime.css` until contrast ≥ 4.5:1 (text) / 3:1 (large). Re-run. Do NOT weaken the axe assertion.
- [ ] **Step 3: Commit**

```bash
git add e2e/daytime.spec.ts src/styles/daytime.css
git commit -m "test: day/night phase, OS/manual precedence, toggle persistence, night axe"
```

---

## Task 6: Final sweep — Phase 3

- [ ] **Step 1:** `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm test` → all pass (139 + daytime units).
- [ ] **Step 2:** `pnpm exec astro check` → only the pre-existing `mulch/[slug].astro` error.
- [ ] **Step 3:** `pnpm exec playwright test` → all pass on chromium AND webkit (1 pre-existing skip). The existing axe tests run in the default (day) phase; the night axe is covered by `daytime.spec.ts`.
- [ ] **Step 4:** `pnpm lhci` → error-budgets green on `/` and the five routes. (The pre-paint script is a tiny synchronous inline; if `total-blocking-time` or `script` budget regresses, confirm the inline is minimal — it is — and re-run.)
- [ ] **Step 5: Visual confirmation** (`pnpm dev`): toggle through Auto/Light/Dark on `/` and on an interior page (e.g. `/roots`). Day = paper; dawn/dusk = warmer paper; night = dark surfaces with legible moss/soil/ochre and a readable toggle. No flash of light on a dark reload (the pre-paint script runs first). Reduced-motion: no transition flash.
- [ ] **Step 6 (only if fixups were made):**

```bash
git add -A
git commit -m "chore: phase 3 sweep — day/night verified across E2E, axe, Lighthouse"
```

---

## Self-Review (filled in by plan author)

**1. Spec coverage:** Pure `timeOfDay` + precedence `resolveDaytime` (Task 1). `data-daytime` drives palette/light via `daytime.css` with dawn/day/dusk/night + night dark surfaces (Task 2). Pre-paint resolve before first paint + `astro:after-swap` re-apply + SSG default (Task 3). Manual toggle (auto/light/dark) with localStorage, precedence toggle > OS > hour (Tasks 1, 3, 4). Composes with seasonal (import order, Task 2). Tests: phase set, OS→night, manual override, toggle+persist, **night axe** (Task 5). No-JS renders the SSG `day` default. Sunlight wash exposed as `--daytime-wash` for the ambient layer (Phase 4) to consume. Out of scope: the ambient ecology passes (Phase 4).

**2. Placeholder scan:** none — full module, full CSS, full component, full tests, exact insertion points. The one duplicated logic (inline `timeOfDay` in Garden.astro vs `lib/daytime.ts`) is called out explicitly with the reason (must run pre-module) and pinned by the unit tests.

**3. Type consistency:** `Daytime = 'dawn'|'day'|'dusk'|'night'` and `DaytimePref = 'auto'|'light'|'dark'` are identical across `daytime.ts`, the toggle, and the tests. The `localStorage` key `gg-daytime` and its values match across the pre-paint script (Task 3), the toggle (Task 4), and the E2E (Task 5). `data-daytime` attribute name matches `daytime.css` selectors, the script, the toggle, and the spec. The CSS phase names match `DAYTIMES`.
