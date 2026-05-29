# Homepage Refinement — "Garden Cross-Section" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the Gurden's Garden homepage — recognizable larger zone glyphs, an ecological cross-section layout, always-visible description labels (names dropped), and fix the cursor bee that freezes after client-side navigation.

**Architecture:** Static Astro 5 page. No new homepage JS or canvas — glyphs/flora stay inline SVG, emphasis stays pure CSS gated by `prefers-reduced-motion`. The only JS change is a bug fix to the existing global `CursorBee` script (re-acquire its element on `astro:page-load`, mirroring the map code in `Garden.astro`).

**Tech Stack:** Astro 5, TypeScript, MaziusDisplay/NectoMono fonts, Playwright E2E (chromium + webkit, baseURL `http://localhost:4321`), Vitest, Lighthouse CI. Package manager: `pnpm`.

---

## Reference: zone data (`src/lib/zones.ts`, unchanged)

Visible label on the homepage is now `zone.longDesc`. `zone.name` is no longer rendered on `/`.

| id | name (NOT shown on home) | longDesc (shown) | href |
|----|--------------------------|------------------|------|
| polyculture | The Polyculture | Work & projects | /polyculture |
| canopy | The Canopy | Art, poetry & essays | /canopy |
| hive | The Hive | Now & contact | /hive |
| compost | The Compost | Story & origins | /compost |
| mycelium | The Mycelium | Collaborators & network | /mycelium |
| beds | The Beds | Colophon & care | /beds |

## File Structure

**Modify**
- `src/components/bee/CursorBee.astro` — fix stale-element bug (re-acquire on `astro:page-load`).
- `src/components/home/ZoneGlyph.astro` — six redrawn, larger (64px) line-art glyphs.
- `src/pages/index.astro` — cross-section `zonePos`; drop `.zone-name`; render `longDesc` as always-on `.zone-label`; hover emphasis CSS.

**Modify (tests)**
- `e2e/map.spec.ts` — replace the hover-hint test with always-on label assertions; add "names not rendered".

**Create (tests)**
- `e2e/cursor-bee.spec.ts` — bee tracks on `/` and STILL tracks after a client-side navigation (regression guard).

---

## Task 0: Preflight — clean tree + green baseline

**Files:** none (verification only)

- [ ] **Step 1: Confirm a clean working tree**

Run: `git status --short`
Expected: no output. If unrelated changes exist, stop and ask the user.

- [ ] **Step 2: Unit baseline**

Run: `pnpm test`
Expected: all Vitest tests pass (125 currently).

- [ ] **Step 3: Homepage E2E baseline**

Run: `pnpm exec playwright test e2e/map.spec.ts e2e/accessibility.spec.ts --project=chromium`
Expected: all pass against the current homepage.

---

## Task 1: Fix the cursor bee (TDD) + regression E2E

The bee script captures `#cursor-bee` once at module load. `ClientRouter` swaps `<body>` on client-side navigation, so the captured node detaches and the visible bee freezes after the first navigation. Fix: keep one persistent rAF loop + window listener, and re-acquire the element on `astro:page-load` (same pattern the map uses in `Garden.astro`).

**Files:**
- Create: `e2e/cursor-bee.spec.ts`
- Modify: `src/components/bee/CursorBee.astro` (script block only)

- [ ] **Step 1: Write the failing E2E**

Create `e2e/cursor-bee.spec.ts` with exactly:

```ts
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
```

- [ ] **Step 2: Run it to confirm the regression test FAILS**

Run: `pnpm exec playwright test e2e/cursor-bee.spec.ts --project=chromium`
Expected: the first test PASSES (initial load works); the second test FAILS (after navigation the new `#cursor-bee` never gets an inline transform — `waitForFunction` times out).

- [ ] **Step 3: Fix the script in `CursorBee.astro`**

In `src/components/bee/CursorBee.astro`, replace the entire `<script>` block (lines 47–73 in the current file) with:

```astro
<script>
  import { createBee, stepBee, type BeeState } from '../../lib/bee';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce) {
    let bee: BeeState = createBee({ x: -100, y: -100 });
    // Mutable so we can re-point it at the swapped node after navigation.
    let el: HTMLElement | null = document.getElementById('cursor-bee');

    function onMove(e: PointerEvent) {
      bee = { ...bee, targetX: e.clientX - 12, targetY: e.clientY - 8 };
    }

    function loop() {
      bee = stepBee(bee, 0.18);
      if (el) el.style.transform = `translate3d(${bee.x}px, ${bee.y}px, 0)`;
      requestAnimationFrame(loop);
    }

    // ClientRouter swaps <body> on client-side navigation, detaching the old
    // node. window/document persist across view transitions, so we keep ONE
    // loop + listener and just re-acquire the freshly-swapped element here.
    document.addEventListener('astro:page-load', () => {
      el = document.getElementById('cursor-bee');
    });

    window.addEventListener('pointermove', onMove, { passive: true });
    requestAnimationFrame(loop);
  }
</script>
```

Leave the markup and `<style>` blocks (lines 1–45) unchanged.

- [ ] **Step 4: Run the E2E to confirm BOTH tests PASS**

Run: `pnpm exec playwright test e2e/cursor-bee.spec.ts --project=chromium`
Expected: both tests PASS.

- [ ] **Step 5: Confirm the unchanged bee physics units still pass**

Run: `pnpm test src/lib/bee.test.ts`
Expected: PASS (we only changed the `.astro` script, not `bee.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/components/bee/CursorBee.astro e2e/cursor-bee.spec.ts
git commit -m "fix: keep cursor bee tracking across view-transition navigations"
```

---

## Task 2: Redraw the zone glyphs (bigger, recognizable)

Replace all six SVGs with larger, clearly recognizable garden line-art at a 48-unit viewBox, rendered at 64px. Colors continue to come from scoped classes bound to palette vars (no CSS vars in SVG presentation attributes). The existing class set (`.s-moss`, `.s-soil`, `.s-ochre`, `.s-chart`, `.f-moss`, `.f-ochre`) is sufficient — no new classes needed.

**Files:**
- Modify (full rewrite): `src/components/home/ZoneGlyph.astro`

- [ ] **Step 1: Rewrite the component**

Replace the ENTIRE contents of `src/components/home/ZoneGlyph.astro` with:

```astro
---
import type { ZoneId } from '../../lib/zones';

interface Props {
  id: ZoneId;
}

const { id } = Astro.props;
---

<span class="zone-glyph" aria-hidden="true">
  {id === 'canopy' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <path class="s-soil" d="M24 46 V28" />
      <circle class="f-moss" cx="24" cy="17" r="12" />
      <circle class="f-moss" cx="13" cy="25" r="8" />
      <circle class="f-moss" cx="35" cy="25" r="8" />
    </svg>
  )}
  {id === 'hive' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <path class="s-ochre" d="M7 40 Q7 9 24 9 Q41 9 41 40" />
      <path class="s-ochre" d="M6 40 H42" />
      <path class="s-ochre" d="M11 32 Q24 27 37 32" />
      <path class="s-ochre" d="M12 24 Q24 20 36 24" />
      <path class="s-ochre" d="M15 17 Q24 14 33 17" />
      <path class="s-ochre" d="M21 40 Q24 34 27 40" />
      <circle class="f-ochre" cx="37" cy="7" r="2.5" />
      <path class="s-ochre" d="M34 5 L37 7 M40 5 L37 7" />
    </svg>
  )}
  {id === 'polyculture' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <path class="s-soil" d="M6 42 H42" />
      <path class="s-moss" d="M14 42 V24" />
      <path class="s-moss" d="M14 32 Q7 30 6 23 Q13 25 14 32" />
      <path class="s-moss" d="M14 28 Q21 26 22 19 Q15 21 14 28" />
      <path class="s-chart" d="M24 42 V15 M24 42 Q19 28 18 17 M24 42 Q29 28 30 17" />
      <path class="s-soil" d="M36 42 V26" />
      <circle class="f-ochre" cx="36" cy="21" r="5" />
      <path class="s-moss" d="M36 33 Q31 31 30 26" />
    </svg>
  )}
  {id === 'beds' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <path class="s-soil" d="M7 31 H41 V42 H7 Z" />
      <path class="s-soil" d="M16 35 V39 M24 35 V39 M32 35 V39" />
      <path class="s-moss" d="M16 31 V23 M16 27 Q12 25 11 21 M16 26 Q20 24 21 20" />
      <path class="s-moss" d="M24 31 V21 M24 26 Q20 24 19 19 M24 26 Q28 24 29 19" />
      <path class="s-moss" d="M32 31 V24 M32 28 Q28 26 27 22 M32 27 Q36 25 37 21" />
    </svg>
  )}
  {id === 'compost' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <path class="s-soil" d="M6 41 Q9 23 24 21 Q39 23 42 41 Z" />
      <path class="s-soil" d="M10 35 Q24 31 38 35" />
      <path class="s-soil" d="M8 38 Q24 35 40 38" />
      <path class="s-chart" d="M24 21 Q21 16 24 12 Q27 16 24 21" />
      <path class="s-ochre" d="M30 25 q2 -3 4 0" />
    </svg>
  )}
  {id === 'mycelium' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <path class="s-moss" d="M16 44 V32 M16 32 L8 22 M16 32 L25 25 M8 22 L4 13 M25 25 L31 16" />
      <circle class="f-moss" cx="8" cy="22" r="2.2" />
      <circle class="f-moss" cx="25" cy="25" r="2.2" />
      <circle class="f-moss" cx="4" cy="13" r="2.2" />
      <circle class="f-moss" cx="31" cy="16" r="2.2" />
      <path class="s-soil" d="M37 44 V35" />
      <path class="f-ochre" d="M30 35 Q37 28 44 35 Z" />
      <path class="s-soil" d="M31 35 H43" />
    </svg>
  )}
</span>

<style>
  .zone-glyph {
    display: block;
  }

  .zone-glyph svg {
    width: 64px;
    height: 64px;
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

  /* Solid fills (crown, dots, bud, mushroom cap, bee) */
  .f-moss  { fill: var(--c-moss);  stroke: none; }
  .f-ochre { fill: var(--c-ochre); stroke: none; }
</style>
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec astro check`
Expected: no NEW errors. (There is one pre-existing unrelated error in `src/pages/canopy/[slug].astro` — ignore it.)

- [ ] **Step 3: Confirm homepage glyphs still render (no regression yet)**

Run: `pnpm exec playwright test e2e/map.spec.ts --project=chromium`
Expected: all current map tests still PASS (the page still has six `a.zone-link`, six glyphs, the `.zone-hint` is still present from the OLD `index.astro` — that's fine; `index.astro` is updated in Task 3).

- [ ] **Step 4: Commit**

```bash
git add src/components/home/ZoneGlyph.astro
git commit -m "feat: redraw zone glyphs larger and more recognizable"
```

---

## Task 3: Cross-section layout + always-on labels (TDD) — `index.astro` + `map.spec.ts`

Reposition the six zones into the three-band ecological cross-section, drop the zone name, and render `longDesc` as an always-visible label. Update `map.spec.ts` first so the new behavior is test-driven.

**Files:**
- Modify: `e2e/map.spec.ts`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Update the tests first**

In `e2e/map.spec.ts`, REPLACE the test named `focusing a zone reveals its description hint` (the whole `test('focusing a zone reveals its description hint', …)` block) with these TWO tests:

```ts
  test('each zone shows its description as an always-visible label', async ({ page }) => {
    await page.goto('/');
    const label = page.locator(
      '#main-content a.zone-link[data-zone="polyculture"] .zone-label',
    );
    await expect(label).toHaveText('Work & projects');
    const opacity = await label.evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBe(1);
  });

  test('zone names are not rendered on the homepage', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('#main-content').innerText();
    for (const name of [
      'The Polyculture',
      'The Canopy',
      'The Hive',
      'The Compost',
      'The Mycelium',
      'The Beds',
    ]) {
      expect(text).not.toContain(name);
    }
  });
```

Leave the other tests (`renders the giant garden title`, `garden title is rendered very large`, `all 6 zones are present`, `zones carry data-zone identifiers`, `no emoji characters`, `flora sway is suppressed`, `home page passes axe`) unchanged.

- [ ] **Step 2: Run to confirm the new tests FAIL**

Run: `pnpm exec playwright test e2e/map.spec.ts --project=chromium`
Expected: the two new tests FAIL — the current page has no `.zone-label` and still renders zone names (`The Canopy`, etc.).

- [ ] **Step 3: Rewrite `src/pages/index.astro`**

Replace the ENTIRE contents of `src/pages/index.astro` with:

```astro
---
import Garden from '@layouts/Garden.astro';
import { zones, type ZoneId } from '../lib/zones';
import ZoneGlyph from '../components/home/ZoneGlyph.astro';
import GardenFlora from '../components/home/GardenFlora.astro';

// Garden cross-section: position encodes ecology (no drawn connections).
//   sky    — canopy (the tree) + hive (bees around it)
//   ground — polyculture + beds frame the wordmark
//   soil   — compost (the heap) + mycelium (threads beside it)
// Each link is centered on its anchor via translate(-50%, -50%).
const zonePos: Record<ZoneId, { x: string; y: string }> = {
  canopy: { x: '36%', y: '13%' },
  hive: { x: '64%', y: '13%' },
  polyculture: { x: '12%', y: '50%' },
  beds: { x: '88%', y: '50%' },
  compost: { x: '38%', y: '87%' },
  mycelium: { x: '62%', y: '87%' },
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
              <span class="zone-label">{zone.longDesc}</span>
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
    gap: var(--space-6);
    z-index: 1;
  }

  .zone-field li {
    margin: 0;
  }

  .zone-link {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-decoration: none;
    color: var(--ink);
  }

  .zone-link :global(.zone-glyph) {
    transition: transform var(--duration-base) var(--easing);
  }

  .zone-label {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--c-soil);
  }

  /* Hover/focus only emphasizes — the label is always visible. */
  .zone-link:hover .zone-label,
  .zone-link:focus-visible .zone-label {
    text-decoration: underline;
  }

  .zone-link:hover :global(.zone-glyph),
  .zone-link:focus-visible :global(.zone-glyph) {
    transform: scale(1.06);
  }

  @media (prefers-reduced-motion: reduce) {
    .zone-link :global(.zone-glyph) {
      transition: none;
    }

    .zone-link:hover :global(.zone-glyph),
    .zone-link:focus-visible :global(.zone-glyph) {
      transform: none;
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
  }
</style>
```

Notes:
- The `:global(.zone-glyph)` wrapper is required: `.zone-glyph` is the class on the `<span>` rendered *inside* `ZoneGlyph.astro`, so Astro's scoped styles in `index.astro` must target it via `:global()`.
- `zonePos` is keyed in render-independent order; `zones.map` still drives DOM order (polyculture, canopy, hive, compost, mycelium, beds) — fine for the mobile stack.

- [ ] **Step 4: Run the homepage tests to confirm they PASS**

Run: `pnpm exec playwright test e2e/map.spec.ts --project=chromium`
Expected: all PASS (giant title, six hrefs, data-zone, always-on label = "Work & projects" at opacity 1, names absent, no emoji, reduced-motion flora, axe).

- [ ] **Step 5: Re-run the bee E2E (no regression from the layout change)**

Run: `pnpm exec playwright test e2e/cursor-bee.spec.ts --project=chromium`
Expected: both PASS (the navigation test still clicks `data-zone="polyculture"`, which is unchanged).

- [ ] **Step 6: Type-check**

Run: `pnpm exec astro check`
Expected: no NEW errors (only the pre-existing canopy/[slug].astro error).

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.astro e2e/map.spec.ts
git commit -m "feat: ecological cross-section layout with always-on zone labels"
```

---

## Task 4: Final sweep — units, types, full E2E, Lighthouse, manual

**Files:** none (verification only)

- [ ] **Step 1: Unit suite**

Run: `pnpm test`
Expected: all pass (125).

- [ ] **Step 2: Type check**

Run: `pnpm exec astro check`
Expected: only the pre-existing `canopy/[slug].astro` error; nothing new from this work.

- [ ] **Step 3: Full E2E across both browsers**

Run: `pnpm exec playwright test`
Expected: all pass on chromium AND webkit (pre-existing skips remain skips). Pay attention to `cursor-bee.spec.ts`, `map.spec.ts`, and `accessibility.spec.ts`.

- [ ] **Step 4: Lighthouse CI**

Run: `pnpm lhci autorun`
Expected: budgets green on `/` and the six zones (no new homepage JS/canvas; bee + flora are gated by reduced-motion and unchanged in weight).

- [ ] **Step 5: Manual visual confirmation**

Run: `pnpm dev` and open `http://localhost:4321/`. Confirm by eye:
- Six recognizable glyphs (the tree reads as a tree, the skep as a hive, etc.), ~64px.
- Layout reads as a cross-section: canopy/hive up top, polyculture/beds flanking the name, compost/mycelium at the bottom.
- Each glyph has its description always visible beneath it; no zone names; hover scales the glyph + underlines the label.
- Move the pointer: the bee follows. Click a zone to navigate, come back (browser back or the map), move the pointer again: the bee STILL follows (the bug is fixed).
- Resize narrow (<768px): zones collapse to a centered stack, glyph + description per row.

- [ ] **Step 6: Final commit (only if Steps 1–5 produced fixups)**

```bash
git add -A
git commit -m "test: verify homepage refinement across E2E, units, and Lighthouse"
```

If no fixups were needed, skip this commit.

---

## Self-Review (filled in by plan author)

**1. Spec coverage:**
- Bigger/recognizable glyph per zone → Task 2 (six redrawn 64px glyphs). ✓
- Remove names; description always visible → Task 3 (`.zone-label` = `longDesc`, name dropped; tests assert names absent + opacity 1). ✓
- Coherent garden order (canopy top, compost bottom, mycelium by compost, hive by canopy, polyculture+beds ground) → Task 3 (`zonePos` cross-section). ✓
- No drawn connections → honored (placement-only; nothing draws lines). ✓
- Fix bee cursor → Task 1 (re-acquire on `astro:page-load`) + regression E2E. ✓
- Testing (always-on label, names absent, axe, reduced motion, bee cross-nav, Lighthouse) → Tasks 1, 3, 4. ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows full code; every command has expected output.

**3. Type consistency:** `ZoneGlyph` prop stays `id: ZoneId`; `index.astro` passes `id={zone.id}`. `zonePos: Record<ZoneId, {x,y}>` covers all six ids. The glyph wrapper class is `.zone-glyph` in `ZoneGlyph.astro` and targeted via `:global(.zone-glyph)` in `index.astro`. The label class is `.zone-label`, referenced identically in `index.astro` and `map.spec.ts`. The bee element id `cursor-bee` matches `CursorBee.astro` markup and both E2E lookups. The bee imports (`createBee`, `stepBee`, `BeeState`) match `src/lib/bee.ts` exactly.
