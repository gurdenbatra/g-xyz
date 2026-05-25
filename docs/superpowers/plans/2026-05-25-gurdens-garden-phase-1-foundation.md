# Gurden's Garden — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the foundation for Gurden's Garden v2 — upgrade Astro 4→5, install OGL + Motion One, introduce the earth-rooted riso palette with a seasonal modifier, add a display typography token, create the root `Garden.astro` layout, ship a cursor-bee that lives in every page, and enforce Lighthouse performance budgets in CI. No new routes; all existing pages keep working.

**Architecture:** New CSS palette layered on top of existing semantic tokens (backwards-compatible aliases). Seasonal logic is a pure TypeScript function with unit tests; injected into `<html>` as a `data-season` attribute via a tiny inline script in the root layout. Cursor bee is a pure-physics TS module (lerp-toward-pointer) with unit tests, wrapped in an Astro island that mounts globally and respects `prefers-reduced-motion`. All existing pages migrated to `Garden.astro`; old `Base.astro` deleted.

**Tech Stack:** Astro 5 + `@astrojs/mdx@4`, OGL (WebGL helper, ~10kb), Motion One (`motion@^11`, ~4kb), vanilla CSS tokens with `data-season` attribute selectors, Vitest for unit tests, Playwright + axe for E2E + a11y, `@lhci/cli` for performance budget enforcement, pnpm.

---

## File Structure

### Files created
- `src/styles/seasonal.css` — `[data-season=...]` selectors that swap accent tokens
- `src/lib/season.ts` — pure function: `Date → 'spring'|'summer'|'autumn'|'winter'`
- `src/lib/season.test.ts` — Vitest unit tests for season.ts
- `src/lib/bee.ts` — pure cursor-bee physics module (lerp + state)
- `src/lib/bee.test.ts` — Vitest unit tests for bee.ts
- `src/layouts/Garden.astro` — root layout (replaces Base.astro)
- `src/components/bee/CursorBee.astro` — Astro island for the global cursor bee
- `lighthouserc.json` — Lighthouse CI budget config

### Files modified
- `package.json` — bump Astro/MDX, add `ogl` + `motion`, add `lhci` script
- `astro.config.mjs` — enable Astro 5 view transitions readiness (no-op at this stage but verified)
- `src/styles/tokens.css` — add earth-rooted named-color palette + accent tokens
- `src/styles/global.css` — import `seasonal.css`
- `src/styles/typography.css` — add `--font-display` token
- `src/pages/index.astro` — switch from `Base` to `Garden`
- `src/pages/about.astro` — switch from `Base` to `Garden`
- `src/pages/colophon.astro` — switch from `Base` to `Garden`
- `src/pages/styleguide.astro` — switch from `Base` to `Garden`
- `src/pages/work/index.astro` — switch from `Base` to `Garden`
- `src/pages/work/[...slug].astro` — switch from `Base` to `Garden`

### Files deleted
- `src/layouts/Base.astro` — replaced by `Garden.astro`

---

## Pre-flight

Before starting tasks, verify a clean baseline. There is currently one uncommitted file (`src/components/Nav.astro`).

- [ ] **Step P1: Inspect uncommitted changes**

```bash
git status
git diff src/components/Nav.astro
```

Expected: shows `M src/components/Nav.astro` only.

- [ ] **Step P2: Commit the Nav change separately (it's unrelated to Phase 1)**

```bash
git add src/components/Nav.astro
git commit -m "chore: stash in-flight Nav change before Phase 1 foundation"
```

If the user prefers to stash instead, run `git stash push -m "nav-wip" src/components/Nav.astro`. Either way, Phase 1 starts from a clean tree.

- [ ] **Step P3: Verify the existing test suite is green**

```bash
pnpm test
pnpm test:e2e
```

Expected: all green. If anything fails, stop and surface the failure before continuing — Phase 1 assumes a green baseline.

---

## Task 1: Upgrade Astro + MDX, add OGL + Motion One

**Files:**
- Modify: `package.json`

- [ ] **Step 1.1: Edit package.json — bump astro/mdx, add ogl + motion**

Replace the `dependencies` block in `package.json` with:

```json
  "dependencies": {
    "@astrojs/mdx": "^4.0.0",
    "astro": "^5.0.0",
    "motion": "^11.0.0",
    "ogl": "^1.0.0"
  },
```

- [ ] **Step 1.2: Install + verify**

```bash
pnpm install
pnpm build
```

Expected: install succeeds; build succeeds with no errors. Astro 5 may emit warnings about the legacy content collections API — those are acceptable for Phase 1 and will be addressed later.

- [ ] **Step 1.3: Run the full existing test suite**

```bash
pnpm test
pnpm test:e2e
```

Expected: all green. If anything regressed under Astro 5, fix the regression before continuing (most likely candidates: removed integrations, changed `Astro.url` shape, MDX layout prop changes — none currently used, so likely no-op).

- [ ] **Step 1.4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: upgrade Astro 4→5, MDX 3→4; add ogl + motion"
```

---

## Task 2: Earth-rooted palette tokens

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 2.1: Extend tokens.css with named palette + accent tokens**

Replace the `── Color ──` block at the top of `src/styles/tokens.css` (lines 1–9) with:

```css
:root {
  /* ── Named palette (earth-rooted riso) ── */
  --c-paper:      #F1E8D0;
  --c-soil:       #8A4F2E;
  --c-ochre:      #D9A857;
  --c-moss:       #5A7A4A;
  --c-indigo:     #2A3A5A;
  --c-chartreuse: #C4D670;
  --c-ink:        #1A1A1A;

  /* ── Semantic tokens (mapped to palette) ── */
  --ground:      var(--c-paper);
  --ink:         var(--c-ink);
  --ink-muted:   #4A4A48;            /* neutral, contrast-safe muted text */
  --ink-faint:   #B8B0A0;            /* borders / dividers */
  --art-ground:  #0D0F10;            /* night surfaces, reserved for v2 */
  --art-ink:     #E8E4DD;

  /* ── Accent tokens (overridden by seasonal.css) ── */
  --accent:      var(--c-moss);
  --accent-2:    var(--c-ochre);
  --accent-3:    var(--c-indigo);
  --pollen:      var(--c-chartreuse);  /* used by generative layer */
```

Leave the rest of the file (type scale, spacing, layout, motion, focus) unchanged.

- [ ] **Step 2.2: Verify build + visual regression-by-eye**

```bash
pnpm build
pnpm dev
```

Open `http://localhost:4321/` and confirm pages still render. Background should be cream (`#F1E8D0`), body text should be near-black. Contrast should look comparable to the old `#F5F2ED` background. Stop the dev server when done.

- [ ] **Step 2.3: Run axe E2E suite to confirm no contrast regressions**

```bash
pnpm test:e2e -- e2e/axe.spec.ts e2e/accessibility.spec.ts
```

Expected: zero violations across all current pages. If contrast fails anywhere, adjust `--ink-muted` toward darker (#3A3A38) or `--ink-faint` toward darker until passing.

- [ ] **Step 2.4: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(tokens): introduce earth-rooted riso palette + semantic mapping"
```

---

## Task 3: Seasonal logic — write the failing test (TDD)

**Files:**
- Create: `src/lib/season.test.ts`

- [ ] **Step 3.1: Write the failing test**

Create `src/lib/season.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { seasonFor } from './season';

describe('seasonFor (northern hemisphere)', () => {
  it('returns spring for March', () => {
    expect(seasonFor(new Date('2026-03-15'))).toBe('spring');
  });

  it('returns spring for May', () => {
    expect(seasonFor(new Date('2026-05-31'))).toBe('spring');
  });

  it('returns summer for June', () => {
    expect(seasonFor(new Date('2026-06-01'))).toBe('summer');
  });

  it('returns summer for August', () => {
    expect(seasonFor(new Date('2026-08-31'))).toBe('summer');
  });

  it('returns autumn for September', () => {
    expect(seasonFor(new Date('2026-09-01'))).toBe('autumn');
  });

  it('returns autumn for November', () => {
    expect(seasonFor(new Date('2026-11-30'))).toBe('autumn');
  });

  it('returns winter for December', () => {
    expect(seasonFor(new Date('2026-12-15'))).toBe('winter');
  });

  it('returns winter for January', () => {
    expect(seasonFor(new Date('2026-01-15'))).toBe('winter');
  });

  it('returns winter for February (incl. leap day)', () => {
    expect(seasonFor(new Date('2024-02-29'))).toBe('winter');
  });
});
```

- [ ] **Step 3.2: Run the test and verify it fails**

```bash
pnpm test -- src/lib/season.test.ts
```

Expected: all tests FAIL with "Cannot find module './season'" or similar.

---

## Task 4: Seasonal logic — make the tests pass

**Files:**
- Create: `src/lib/season.ts`

- [ ] **Step 4.1: Implement the minimal module**

Create `src/lib/season.ts`:

```typescript
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Returns the season for a given Date in the northern hemisphere.
 * Months 3-5 = spring, 6-8 = summer, 9-11 = autumn, 12/1/2 = winter.
 */
export function seasonFor(date: Date): Season {
  const month = date.getMonth() + 1; // 1-indexed
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
```

- [ ] **Step 4.2: Run the test — verify it passes**

```bash
pnpm test -- src/lib/season.test.ts
```

Expected: 9 passed.

- [ ] **Step 4.3: Commit**

```bash
git add src/lib/season.ts src/lib/season.test.ts
git commit -m "feat(season): add seasonFor() with unit tests (northern hemisphere)"
```

---

## Task 5: Seasonal CSS modifier

**Files:**
- Create: `src/styles/seasonal.css`
- Modify: `src/styles/global.css`

- [ ] **Step 5.1: Create seasonal.css**

Create `src/styles/seasonal.css`:

```css
/*
 * Seasonal modifier. The root layout sets data-season on <html> on first
 * paint; these selectors swap accent tokens for the rest of the session.
 * Body text + structural tokens (--ink, --ground) never change.
 */

[data-season='spring'] {
  --accent:   var(--c-moss);
  --accent-2: var(--c-chartreuse);
  --accent-3: var(--c-ochre);
  --pollen:   var(--c-chartreuse);
}

[data-season='summer'] {
  --accent:   var(--c-ochre);
  --accent-2: var(--c-moss);
  --accent-3: var(--c-soil);
  --pollen:   #F5D050;
}

[data-season='autumn'] {
  --accent:   var(--c-soil);
  --accent-2: var(--c-ochre);
  --accent-3: var(--c-indigo);
  --pollen:   #D97732;
}

[data-season='winter'] {
  --accent:   var(--c-indigo);
  --accent-2: var(--c-soil);
  --accent-3: var(--c-moss);
  --pollen:   #6A8090;
}
```

- [ ] **Step 5.2: Import seasonal.css from global.css**

Modify `src/styles/global.css`: change the imports at the top from:

```css
@import './reset.css';
@import './tokens.css';
@import './motion.css';
@import './typography.css';
```

to:

```css
@import './reset.css';
@import './tokens.css';
@import './seasonal.css';
@import './motion.css';
@import './typography.css';
```

(`seasonal.css` must come after `tokens.css` so its accent overrides win.)

- [ ] **Step 5.3: Verify build still works**

```bash
pnpm build
```

Expected: success.

- [ ] **Step 5.4: Commit**

```bash
git add src/styles/seasonal.css src/styles/global.css
git commit -m "feat(tokens): add seasonal accent-token overrides via [data-season]"
```

---

## Task 6: Display typography token

**Files:**
- Modify: `src/styles/typography.css`

- [ ] **Step 6.1: Add --font-display token and class**

Modify `src/styles/typography.css`: replace the `html` block (lines 41–45) with the following, adding a token and a new `.font-poster` class for zone titles:

```css
:root {
  --font-serif:   'MaziusDisplay', Georgia, 'Times New Roman', serif;
  --font-mono:    'NectoMono', 'Courier New', monospace;
  --font-display: 'MaziusDisplay', Georgia, serif; /* Phase 1 stand-in; will swap to a geometric sans in Canopy phase */
}

html {
  font-family: var(--font-serif);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.font-poster {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
```

Leave the `.font-display`, `.font-display-italic`, `.font-mono`, the `.text-*` scale, the `.text-ink*` color classes, and the `.label` block unchanged.

- [ ] **Step 6.2: Verify build**

```bash
pnpm build
```

Expected: success. Existing `.font-display` class is still defined, so no current usages break.

- [ ] **Step 6.3: Commit**

```bash
git add src/styles/typography.css
git commit -m "feat(typography): add --font-display token + .font-poster class for zone titles"
```

---

## Task 7: Cursor bee — write the failing test (TDD)

**Files:**
- Create: `src/lib/bee.test.ts`

- [ ] **Step 7.1: Write the failing test**

Create `src/lib/bee.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createBee, stepBee } from './bee';

describe('createBee', () => {
  it('starts at origin with zero velocity', () => {
    const bee = createBee();
    expect(bee.x).toBe(0);
    expect(bee.y).toBe(0);
    expect(bee.targetX).toBe(0);
    expect(bee.targetY).toBe(0);
  });

  it('accepts an initial position', () => {
    const bee = createBee({ x: 10, y: 20 });
    expect(bee.x).toBe(10);
    expect(bee.y).toBe(20);
  });
});

describe('stepBee', () => {
  it('moves the bee a fraction of the way toward the target', () => {
    const bee = { x: 0, y: 0, targetX: 100, targetY: 0 };
    const next = stepBee(bee, 0.1);
    expect(next.x).toBeCloseTo(10);
    expect(next.y).toBeCloseTo(0);
  });

  it('does not mutate the input bee', () => {
    const bee = { x: 0, y: 0, targetX: 100, targetY: 100 };
    stepBee(bee, 0.5);
    expect(bee.x).toBe(0);
    expect(bee.y).toBe(0);
  });

  it('converges toward target across multiple steps', () => {
    let bee = { x: 0, y: 0, targetX: 100, targetY: 0 };
    for (let i = 0; i < 60; i++) bee = stepBee(bee, 0.1);
    expect(bee.x).toBeGreaterThan(99);
    expect(bee.x).toBeLessThanOrEqual(100);
  });

  it('updates target via setTarget without mutating prior state', () => {
    const bee = { x: 5, y: 5, targetX: 0, targetY: 0 };
    const next = stepBee({ ...bee, targetX: 50, targetY: 50 }, 0.1);
    expect(next.x).toBeCloseTo(9.5);
    expect(next.y).toBeCloseTo(9.5);
  });
});
```

- [ ] **Step 7.2: Run the test and verify it fails**

```bash
pnpm test -- src/lib/bee.test.ts
```

Expected: all tests FAIL with "Cannot find module './bee'".

---

## Task 8: Cursor bee — implement the physics

**Files:**
- Create: `src/lib/bee.ts`

- [ ] **Step 8.1: Implement the module**

Create `src/lib/bee.ts`:

```typescript
export interface BeeState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

export function createBee(init: Partial<BeeState> = {}): BeeState {
  return {
    x: init.x ?? 0,
    y: init.y ?? 0,
    targetX: init.targetX ?? init.x ?? 0,
    targetY: init.targetY ?? init.y ?? 0,
  };
}

/**
 * Pure step: returns a new BeeState with position lerped toward target.
 * Lerp factor is clamped to [0, 1].
 */
export function stepBee(bee: BeeState, lerp: number): BeeState {
  const t = Math.max(0, Math.min(1, lerp));
  return {
    x: bee.x + (bee.targetX - bee.x) * t,
    y: bee.y + (bee.targetY - bee.y) * t,
    targetX: bee.targetX,
    targetY: bee.targetY,
  };
}
```

- [ ] **Step 8.2: Run the test — verify it passes**

```bash
pnpm test -- src/lib/bee.test.ts
```

Expected: 6 passed.

- [ ] **Step 8.3: Commit**

```bash
git add src/lib/bee.ts src/lib/bee.test.ts
git commit -m "feat(bee): add pure cursor-bee physics module with unit tests"
```

---

## Task 9: CursorBee Astro island

**Files:**
- Create: `src/components/bee/CursorBee.astro`

- [ ] **Step 9.1: Create the component**

Create `src/components/bee/CursorBee.astro`:

```astro
---
// Global cursor bee. Mounts in the root layout, listens to pointer events,
// hides itself when prefers-reduced-motion: reduce.
---

<div id="cursor-bee" aria-hidden="true">
  <svg viewBox="0 0 24 16" width="24" height="16">
    <!-- body -->
    <ellipse cx="12" cy="8" rx="6" ry="4" fill="var(--c-ochre)" />
    <rect x="9"  y="4" width="2" height="8" fill="var(--c-ink)" />
    <rect x="13" y="4" width="2" height="8" fill="var(--c-ink)" />
    <!-- wings -->
    <ellipse class="wing wing-l" cx="9"  cy="4" rx="4" ry="2" fill="var(--c-paper)" opacity="0.85" />
    <ellipse class="wing wing-r" cx="15" cy="4" rx="4" ry="2" fill="var(--c-paper)" opacity="0.85" />
  </svg>
</div>

<style>
  #cursor-bee {
    position: fixed;
    top: 0;
    left: 0;
    width: 24px;
    height: 16px;
    pointer-events: none;
    transform: translate3d(-100px, -100px, 0);
    z-index: 50;
    will-change: transform;
  }

  .wing {
    transform-origin: center bottom;
    animation: wing-flap 80ms ease-in-out infinite alternate;
  }
  .wing-r { animation-delay: 40ms; }

  @keyframes wing-flap {
    from { transform: scaleY(0.4); }
    to   { transform: scaleY(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    #cursor-bee { display: none; }
  }
</style>

<script>
  import { createBee, stepBee, type BeeState } from '../../lib/bee';

  const el = document.getElementById('cursor-bee');
  if (el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let bee: BeeState = createBee({ x: -100, y: -100 });
    let rafId = 0;

    function onMove(e: PointerEvent) {
      bee = { ...bee, targetX: e.clientX - 12, targetY: e.clientY - 8 };
    }

    function loop() {
      bee = stepBee(bee, 0.18);
      el!.style.transform = `translate3d(${bee.x}px, ${bee.y}px, 0)`;
      rafId = requestAnimationFrame(loop);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    rafId = requestAnimationFrame(loop);

    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
    });
  }
</script>
```

- [ ] **Step 9.2: Verify build**

```bash
pnpm build
```

Expected: success.

- [ ] **Step 9.3: Commit**

```bash
git add src/components/bee/CursorBee.astro
git commit -m "feat(bee): add CursorBee Astro island wired to bee physics"
```

---

## Task 10: Garden.astro root layout

**Files:**
- Create: `src/layouts/Garden.astro`

- [ ] **Step 10.1: Create Garden.astro**

Create `src/layouts/Garden.astro`:

```astro
---
import Nav from '@components/Nav.astro';
import Footer from '@components/Footer.astro';
import CursorBee from '../components/bee/CursorBee.astro';
import { seasonFor } from '../lib/season';
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const {
  title,
  description = 'Gurden Batra — Civic Tech Lead, Design Technologist. Berlin.',
} = Astro.props;

const pageTitle = title === 'Home' ? 'Gurden Batra' : `${title} — Gurden Batra`;
const season = seasonFor(new Date());
---

<!doctype html>
<html lang="en" data-season={season}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <meta name="generator" content={Astro.generator} />
    <title>{pageTitle}</title>
    <link rel="preload" href="/fonts/MaziusDisplay-Extraitalic.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/NectoMono-Regular.woff2"          as="font" type="font/woff2" crossorigin />
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <header role="banner">
      <Nav />
    </header>

    <main id="main-content" tabindex="-1">
      <slot />
    </main>

    <Footer />
    <CursorBee />
  </body>
</html>
```

- [ ] **Step 10.2: Verify build (no consumers yet)**

```bash
pnpm build
```

Expected: success. `Garden.astro` is unused so far; no behavior change.

- [ ] **Step 10.3: Commit**

```bash
git add src/layouts/Garden.astro
git commit -m "feat(layout): add Garden.astro root layout with seasonal data attr + cursor bee"
```

---

## Task 11: Migrate index.astro to Garden layout

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 11.1: Switch the import**

In `src/pages/index.astro`, change:

```astro
import Base from '../layouts/Base.astro';
```

to:

```astro
import Garden from '../layouts/Garden.astro';
```

Then change every `<Base ...>` and `</Base>` to `<Garden ...>` and `</Garden>`. Save the file.

- [ ] **Step 11.2: Verify dev server**

```bash
pnpm dev
```

Open `http://localhost:4321/`. Confirm:
- Page renders correctly
- Background is cream (`#F1E8D0`)
- Moving the mouse: a small bee follows the cursor
- Browser devtools: `<html data-season="...">` is set
- Stop the dev server when done

- [ ] **Step 11.3: Run E2E for the home page**

```bash
pnpm test:e2e -- e2e/home.spec.ts
```

Expected: green. If the bee CSS leaks `pointer-events` or covers an interactive element, fix by tightening `pointer-events: none` (already set) before continuing.

- [ ] **Step 11.4: Commit**

```bash
git add src/pages/index.astro
git commit -m "refactor(home): switch index to Garden layout"
```

---

## Task 12: Migrate remaining pages to Garden layout

**Files:**
- Modify: `src/pages/about.astro`
- Modify: `src/pages/colophon.astro`
- Modify: `src/pages/styleguide.astro`
- Modify: `src/pages/work/index.astro`
- Modify: `src/pages/work/[...slug].astro`

- [ ] **Step 12.1: Repeat the swap for every page**

For each file in the list above, do the same swap as Task 11.1: replace `import Base from '../layouts/Base.astro'` (or `'../../layouts/Base.astro'` for `work/[...slug].astro`) with the equivalent `Garden` import, and rename all `<Base>` / `</Base>` tags to `<Garden>` / `</Garden>`.

For `src/pages/work/[...slug].astro` specifically the import path is:

```astro
import Garden from '../../layouts/Garden.astro';
```

- [ ] **Step 12.2: Verify build**

```bash
pnpm build
```

Expected: success. No references to `Base.astro` remain.

```bash
grep -r "layouts/Base" src
```

Expected: no output.

- [ ] **Step 12.3: Run the full E2E + axe suite**

```bash
pnpm test:e2e
```

Expected: all green. The bee should not introduce a11y violations (it has `aria-hidden="true"` and `pointer-events: none`).

- [ ] **Step 12.4: Commit**

```bash
git add src/pages
git commit -m "refactor: migrate all pages from Base to Garden layout"
```

---

## Task 13: Delete the old Base layout

**Files:**
- Delete: `src/layouts/Base.astro`

- [ ] **Step 13.1: Confirm no consumers**

```bash
grep -r "Base.astro" src
```

Expected: no output.

- [ ] **Step 13.2: Delete**

```bash
rm src/layouts/Base.astro
```

- [ ] **Step 13.3: Verify build + tests**

```bash
pnpm build
pnpm test
pnpm test:e2e
```

Expected: all green.

- [ ] **Step 13.4: Commit**

```bash
git add -A
git commit -m "chore: remove Base.astro (superseded by Garden.astro)"
```

---

## Task 14: Lighthouse CI budget

**Files:**
- Create: `lighthouserc.json`
- Modify: `package.json` (add npm script)

- [ ] **Step 14.1: Create the budget config**

Create `lighthouserc.json` at the repo root:

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:4321/",
        "http://localhost:4321/work",
        "http://localhost:4321/about",
        "http://localhost:4321/colophon"
      ],
      "startServerCommand": "pnpm preview --host 127.0.0.1 --port 4321",
      "startServerReadyPattern": "Local",
      "numberOfRuns": 1,
      "settings": {
        "preset": "desktop"
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 1.0 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interactive": ["warn", { "maxNumericValue": 3000 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 80000 }],
        "resource-summary:stylesheet:size": ["error", { "maxNumericValue": 30000 }]
      }
    },
    "upload": {
      "target": "filesystem",
      "outputDir": ".lighthouseci"
    }
  }
}
```

- [ ] **Step 14.2: Add an npm script**

In `package.json`, add to the `scripts` object:

```json
    "lhci": "pnpm build && lhci autorun"
```

- [ ] **Step 14.3: Run locally — confirm budgets pass**

```bash
pnpm lhci
```

Expected: build runs, server starts, Lighthouse runs against each URL, all assertions pass. If any assertion fails, capture the failure: if it's a real budget violation, fix the offending resource before continuing; if a threshold is too aggressive for current state, loosen with explicit justification in this plan as an inline comment (rare — most should already pass).

- [ ] **Step 14.4: Commit**

```bash
git add lighthouserc.json package.json
git commit -m "ci: add Lighthouse budgets (LCP<2.5s, TBT<200, JS<80kb, CSS<30kb)"
```

---

## Task 15: Final verification

- [ ] **Step 15.1: Run everything**

```bash
pnpm test
pnpm test:e2e
pnpm lhci
```

Expected: all green.

- [ ] **Step 15.2: Manual smoke test**

```bash
pnpm dev
```

Click through `/`, `/work`, a project detail, `/about`, `/colophon`, `/styleguide`. Confirm:
- Cursor bee follows pointer on every page
- Background is cream
- Page text is readable
- No console errors
- DOM: `<html data-season="...">` is set
- Bee hidden under `prefers-reduced-motion: reduce` (test in devtools rendering panel)

Stop the dev server.

- [ ] **Step 15.3: Update the spec status**

Edit `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md` and replace the line `**Status:** Draft for review` with `**Status:** Phase 1 (Foundation) complete; Phase 2 (The Map) next`.

- [ ] **Step 15.4: Final commit**

```bash
git add docs/superpowers/specs/2026-05-25-gurdens-garden-design.md
git commit -m "docs: mark Phase 1 complete in design spec"
```

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md` Section 9, Phase 1):

| Spec requirement | Covered by |
|---|---|
| Astro 5 upgrade | Task 1 |
| MDX 4 upgrade | Task 1 |
| OGL + Motion One installed | Task 1 |
| Earth-rooted palette tokens | Task 2 |
| Seasonal modifier (CSS + logic) | Tasks 3–5 |
| Display typography token | Task 6 |
| Cursor bee (physics + island) | Tasks 7–9 |
| Root `Garden.astro` layout | Tasks 10–13 |
| Paper-grain shader | Pre-existing in `global.css` body bg (verified by manual smoke test in 15.2) |
| No new routes yet | Confirmed — only existing pages migrated |
| Lighthouse budget file | Task 14 |
| WCAG 2.2 AA on all combos | Verified by Task 2.3 (axe) and 12.3 (full E2E) |
| TDD discipline | Tasks 3+4 (season) and 7+8 (bee) write tests first, verify failure, then implement |

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / "appropriate error handling" / "etc." used in any step. Every step has either a concrete code block, a concrete command, or an exact file edit instruction.

**Type / name consistency:**
- `Season` type used in both `season.ts` and via inference in `Garden.astro` — consistent.
- `BeeState`, `createBee`, `stepBee` defined in `bee.ts`, imported by `bee.test.ts` and `CursorBee.astro` — names consistent.
- CSS custom-property names (`--c-paper`, `--c-soil`, `--c-ochre`, `--c-moss`, `--c-indigo`, `--c-chartreuse`, `--c-ink`, `--accent`, `--accent-2`, `--accent-3`, `--pollen`) defined in `tokens.css`, referenced in `seasonal.css` and `CursorBee.astro` — consistent.
- `data-season` attribute set in `Garden.astro`, selected in `seasonal.css` — consistent.

Plan is self-consistent and ready to execute.
