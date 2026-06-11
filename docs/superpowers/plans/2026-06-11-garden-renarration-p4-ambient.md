# Garden Re-narration — Phase 4 (Ambient Ecology) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. The passes are motion — verify in the browser preview (motion + reduced-motion) before finalizing.

**Goal:** Bring the homepage garden to life with sparse, slow ambient passes — a worm surfacing, an insect or seed drifting, a bird or butterfly crossing, the occasional ground critter, a dew shimmer — one at a time, ~25–60s apart, fully motion-gated and idle-loaded.

**Architecture:** A pure, seeded scheduler `ambient.ts` (`planPass(rng)` → `{kind, laneTopPct, durationMs, dir, delayMs}`) — Vitest-tested, no DOM. An idle-loaded, motion-gated island `AmbientEcology.astro` mounted inside `.garden-home` (z-index 0, behind content) that spawns one sprite per scheduled pass (ASCII for small fauna/effects, inline SVG line-art for bird/butterfly/critter), animates it with a CSS keyframe, removes it on `animationend`, then schedules the next. Paused on `document.hidden`, cancelled on `astro:before-preparation`, re-acquired on `astro:page-load` — the same discipline as the AsciiEarth island. LCP untouched.

**Tech Stack:** Astro 5, TypeScript, Vitest (seeded-RNG determinism), CSS keyframes, Playwright, Lighthouse CI, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-11-garden-renarration-and-ambient-ecology-design.md` (§ "Ambient ecology layer").
**Builds on:** Phases 1–3 — landed. Sunlight = the P3 `--daytime-wash`; airflow = drifting `seed` passes + existing `GardenFlora` sway; water = the `dew` pass.

---

## Reference — patterns & mount point

- Island discipline (copy from `src/components/home/AsciiEarth.astro`): `matchMedia('(prefers-reduced-motion: reduce)')` gate; `requestIdleCallback` (Safari `setTimeout` fallback); re-acquire element on `astro:page-load`; cancel timers/rAF on `astro:before-preparation`; pause when `document.hidden`; wrap dynamic work so any failure is a no-op.
- Mount: `src/pages/index.astro` → inside `<section class="garden-home">`, alongside `<GardenFlora />` / `<AsciiEarth />`. `.garden-home` is `position:relative; overflow:hidden`; content is `z-index:1`, decorative layers `z-index:0`.
- Palette vars adapt to day/night (P3 overrides `--c-soil` etc.), so sprites that use `var(--c-soil)` / `currentColor` stay visible in both themes.
- Pure-module precedent: `src/lib/ascii-earth.ts`, `src/lib/daytime.ts` (+ their `.test.ts`).

## File Structure

**Create:** `src/lib/ambient.ts`, `src/lib/ambient.test.ts`, `src/components/home/AmbientEcology.astro`, `e2e/ambient.spec.ts`.
**Modify:** `src/pages/index.astro` (mount the island).

---

## Task 0: Preflight

- [ ] **Step 1:** `git status --short` → clean. `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`.
- [ ] **Step 2:** `pnpm test` → 145 pass.
- [ ] **Step 3:** `pnpm exec playwright test e2e/map.spec.ts e2e/daytime.spec.ts --project=chromium` → pass.

---

## Task 1: `ambient.ts` pure scheduler (TDD)

**Files:** Create `src/lib/ambient.ts`, `src/lib/ambient.test.ts`.

- [ ] **Step 1: Write the failing tests** — create `src/lib/ambient.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  AMBIENT_KINDS,
  DELAY_MIN_MS,
  DELAY_MAX_MS,
  DURATION_MS,
  pickKind,
  planPass,
} from './ambient';

// A deterministic rng that yields a fixed queue, looping if exhausted.
function seq(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('pickKind', () => {
  it('returns the first kind at r=0 and the last at r→1', () => {
    expect(pickKind(0)).toBe(AMBIENT_KINDS[0]);
    expect(pickKind(0.999)).toBe(AMBIENT_KINDS[AMBIENT_KINDS.length - 1]);
  });
  it('only ever returns a known kind across the unit interval', () => {
    for (let r = 0; r < 1; r += 0.017) {
      expect(AMBIENT_KINDS).toContain(pickKind(r));
    }
  });
});

describe('planPass', () => {
  it('is deterministic and consumes rng in order (kind, jitter, duration, dir, delay)', () => {
    // kind r=0 → first kind; jitter 0.5 → no offset; duration 0 → low bound;
    // dir 0.1 → ltr; delay 0 → DELAY_MIN.
    const p = planPass(seq([0, 0.5, 0, 0.1, 0]));
    expect(p.kind).toBe(AMBIENT_KINDS[0]);
    expect(p.dir).toBe('ltr');
    expect(p.durationMs).toBe(DURATION_MS[AMBIENT_KINDS[0]][0]);
    expect(p.delayMs).toBe(DELAY_MIN_MS);
  });

  it('picks rtl when the direction draw is ≥ 0.5', () => {
    expect(planPass(seq([0, 0.5, 0, 0.9, 0])).dir).toBe('rtl');
  });

  it('keeps every field within bounds for random draws', () => {
    const rng = () => Math.random();
    for (let i = 0; i < 300; i++) {
      const p = planPass(rng);
      expect(AMBIENT_KINDS).toContain(p.kind);
      expect(p.laneTopPct).toBeGreaterThanOrEqual(0);
      expect(p.laneTopPct).toBeLessThanOrEqual(100);
      const [lo, hi] = DURATION_MS[p.kind];
      expect(p.durationMs).toBeGreaterThanOrEqual(lo);
      expect(p.durationMs).toBeLessThanOrEqual(hi);
      expect(p.delayMs).toBeGreaterThanOrEqual(DELAY_MIN_MS);
      expect(p.delayMs).toBeLessThanOrEqual(DELAY_MAX_MS);
    }
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `pnpm test src/lib/ambient.test.ts` → module not found.

- [ ] **Step 3: Implement** — create `src/lib/ambient.ts`:

```ts
// Pure, Node-safe scheduler for the homepage ambient ecology. No DOM, no timers:
// the RNG is injected so it unit-tests in Node; the island calls it with
// Math.random() and owns all timing/spawning. "Sparse & calm" pacing is encoded
// here (one pass at a time, 25–60s apart).

export const AMBIENT_KINDS = [
  'insect',
  'seed',
  'worm',
  'bird',
  'dew',
  'butterfly',
  'critter',
] as const;
export type AmbientKind = (typeof AMBIENT_KINDS)[number];

// Selection weights (same order as AMBIENT_KINDS) — common small life, rare events.
const WEIGHTS: readonly number[] = [0.28, 0.22, 0.18, 0.12, 0.1, 0.06, 0.04];

// Lane (top %) each kind travels along, mapped to the cross-section.
const LANE_TOP: Record<AmbientKind, number> = {
  bird: 12,
  butterfly: 24,
  seed: 30,
  insect: 34,
  worm: 60, // the earth horizon sits ~62%
  dew: 66,
  critter: 90, // along the ground
};
const LANE_JITTER = 10; // ± vertical wobble so repeats don't share a track

// Per-kind duration window (ms). Slow on purpose.
export const DURATION_MS: Record<AmbientKind, readonly [number, number]> = {
  insect: [16000, 24000],
  seed: [18000, 28000],
  worm: [6000, 9000],
  bird: [9000, 14000],
  dew: [4000, 7000],
  butterfly: [12000, 18000],
  critter: [14000, 20000],
};

export const DELAY_MIN_MS = 25000;
export const DELAY_MAX_MS = 60000;

// Animate in place (no traverse): the worm surfaces, the dew shimmers.
export const IN_PLACE: ReadonlySet<AmbientKind> = new Set(['worm', 'dew']);

export interface Pass {
  kind: AmbientKind;
  laneTopPct: number;
  durationMs: number;
  dir: 'ltr' | 'rtl';
  delayMs: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Weighted pick over AMBIENT_KINDS from r in [0, 1). */
export function pickKind(r: number): AmbientKind {
  let acc = 0;
  for (let i = 0; i < AMBIENT_KINDS.length; i++) {
    acc += WEIGHTS[i];
    if (r < acc) return AMBIENT_KINDS[i];
  }
  return AMBIENT_KINDS[AMBIENT_KINDS.length - 1];
}

/**
 * Plan the next pass. Consumes `rng()` in a FIXED order so it is reproducible:
 *   1) kind  2) lane jitter  3) duration  4) direction  5) delay-to-next.
 */
export function planPass(rng: () => number): Pass {
  const kind = pickKind(rng());
  const laneTopPct = clamp(LANE_TOP[kind] + (rng() - 0.5) * LANE_JITTER, 0, 100);
  const [lo, hi] = DURATION_MS[kind];
  const durationMs = Math.round(lo + rng() * (hi - lo));
  const dir: 'ltr' | 'rtl' = rng() < 0.5 ? 'ltr' : 'rtl';
  const delayMs = Math.round(DELAY_MIN_MS + rng() * (DELAY_MAX_MS - DELAY_MIN_MS));
  return { kind, laneTopPct, durationMs, dir, delayMs };
}
```

- [ ] **Step 4: Run to verify PASS** — `pnpm test src/lib/ambient.test.ts` → pass; `pnpm test` → all pass (145 + new).
- [ ] **Step 5: Commit**

```bash
git add src/lib/ambient.ts src/lib/ambient.test.ts
git commit -m "feat: ambient pure scheduler (weighted passes, lanes, sparse pacing)"
```

---

## Task 2: `AmbientEcology.astro` island + mount

**Files:** Create `src/components/home/AmbientEcology.astro`; modify `src/pages/index.astro`.

- [ ] **Step 1: Create the component** — `src/components/home/AmbientEcology.astro`:

```astro
---
// The homepage's living layer: sparse, slow passes (worm/insect/bird/butterfly/
// critter + drifting seeds + a dew shimmer). Purely decorative (aria-hidden),
// motion-gated, idle-loaded — never touches LCP. The scheduler is the pure
// ambient.ts; this island owns timing, spawning, and cleanup.
---

<div class="ambient-ecology" aria-hidden="true" data-ambient-root></div>

<style>
  .ambient-ecology {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .ambient-sprite {
    position: absolute;
    left: 0;
    font-family: var(--font-mono);
    line-height: 1;
    color: var(--c-soil);
    opacity: 0.72;
    will-change: transform, opacity;
  }

  .ambient-sprite svg {
    display: block;
    overflow: visible;
  }

  @keyframes ambient-ltr {
    from { transform: translateX(-8vw); }
    to   { transform: translateX(108vw); }
  }
  @keyframes ambient-rtl {
    from { transform: translateX(108vw); }
    to   { transform: translateX(-8vw); }
  }
  @keyframes ambient-pulse {
    0%, 100% { opacity: 0; }
    50%      { opacity: 0.6; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ambient-ecology { display: none; }
  }
</style>

<script>
  import { planPass, IN_PLACE, type AmbientKind } from '../../lib/ambient';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce) {
    // Sprite markup per kind. Small life is ASCII (extends the site's texture
    // language); larger fauna are simple SVG line-art in the glyph stroke style.
    const SPRITES: Record<AmbientKind, { html: string; size: string }> = {
      insect: { html: '·', size: '13px' },
      seed: { html: ',', size: '13px' },
      worm: { html: '∼', size: '17px' },
      dew: { html: '∴', size: '14px' },
      bird: {
        html: '<svg width="22" height="10" viewBox="0 0 24 10"><path d="M1 7 Q6 1 12 7 Q18 1 23 7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
        size: '13px',
      },
      butterfly: {
        html: '<svg width="16" height="14" viewBox="0 0 16 14"><path d="M8 7 Q1 1 2 7 Q1 13 8 7 Q15 1 14 7 Q15 13 8 7" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
        size: '13px',
      },
      critter: {
        html: '<svg width="26" height="16" viewBox="0 0 26 16"><path d="M2 15 Q4 5 13 5 Q22 5 24 15" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 8 L5 3 M10 6 L10 2 M14 6 L15 2 M18 8 L20 4" fill="none" stroke="currentColor" stroke-width="1.1"/><circle cx="23.5" cy="12" r="0.8" fill="currentColor"/></svg>',
        size: '13px',
      },
    };

    let root = document.querySelector<HTMLElement>('[data-ambient-root]');
    document.addEventListener('astro:page-load', () => {
      root = document.querySelector<HTMLElement>('[data-ambient-root]');
    });

    let timer = 0;
    let stopped = false;
    document.addEventListener('astro:before-preparation', () => {
      stopped = true;
      clearTimeout(timer);
    });

    function spawn(p: ReturnType<typeof planPass>) {
      if (!root || document.hidden) return;
      const el = document.createElement('span');
      el.className = 'ambient-sprite';
      el.dataset.ambient = p.kind;
      el.style.top = `${p.laneTopPct}%`;
      el.style.fontSize = SPRITES[p.kind].size;
      el.innerHTML = SPRITES[p.kind].html;
      if (IN_PLACE.has(p.kind)) {
        el.style.left = `${20 + Math.random() * 60}%`;
        el.style.animation = `ambient-pulse ${p.durationMs}ms ease-in-out forwards`;
      } else {
        el.style.animation = `ambient-${p.dir} ${p.durationMs}ms linear forwards`;
      }
      el.addEventListener('animationend', () => el.remove());
      root.appendChild(el);
    }

    function loop() {
      if (stopped) return;
      const p = planPass(Math.random);
      timer = window.setTimeout(() => {
        spawn(p);
        loop();
      }, p.delayMs);
    }

    function start() {
      if (stopped) return;
      // First pass arrives soon so the garden feels alive on arrival; the rest
      // are sparse (25–60s) per the scheduler.
      const first = planPass(Math.random);
      timer = window.setTimeout(() => {
        spawn(first);
        loop();
      }, 1800);
    }

    if (typeof (window as Window & { requestIdleCallback?: unknown }).requestIdleCallback === 'function') {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(start);
    } else {
      setTimeout(start, 400);
    }
  }
</script>
```

- [ ] **Step 2: Mount the island** in `src/pages/index.astro`. Add the import in the frontmatter after the `AsciiEarth` import:

```ts
import AmbientEcology from '../components/home/AmbientEcology.astro';
```

and render it inside `<section class="garden-home">`, immediately after `<GardenFlora />`:

```astro
    <GardenFlora />
    <AmbientEcology />
```

- [ ] **Step 3: Preview + verify (motion).** `preview_start`; load `/` with default motion. Within ~2s a first sprite appears and drifts/pulses across its lane, then quiet. Confirm `document.querySelectorAll('.ambient-sprite').length` is small (0–1 most of the time) and sprites self-remove (no unbounded growth — watch for ~30s, the count stays ≤2). `preview_console_logs` level error → none. Toggle to night (P3): sprites stay visible (they use `var(--c-soil)`, lightened at night).
- [ ] **Step 4: Preview + verify (reduced motion).** `preview_resize` is not enough — emulate reduced motion via the browser, or rely on the E2E in Task 3. At minimum confirm the CSS rule `@media (prefers-reduced-motion: reduce) .ambient-ecology { display: none }` is present and the import is the ONLY new client JS.
- [ ] **Step 5: Type-check + build.** `pnpm exec astro check` → no NEW errors. `pnpm build` → 19 pages.
- [ ] **Step 6: Commit**

```bash
git add src/components/home/AmbientEcology.astro src/pages/index.astro
git commit -m "feat: ambient ecology island — sparse motion-gated homepage passes"
```

---

## Task 3: E2E — `ambient.spec.ts`

**Files:** Create `e2e/ambient.spec.ts`.

- [ ] **Step 1:** Create `e2e/ambient.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Ambient ecology', () => {
  test('spawns a pass on the homepage when motion is allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    // First pass is scheduled ~1.8s after idle; allow generous headroom.
    await expect(page.locator('.ambient-ecology .ambient-sprite').first()).toBeAttached({
      timeout: 8000,
    });
  });

  test('the ambient layer is decorative (aria-hidden)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-ambient-root]')).toHaveAttribute('aria-hidden', 'true');
  });

  test('produces no passes under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(3000);
    const count = await page.locator('.ambient-ecology .ambient-sprite').count();
    expect(count).toBe(0);
  });

  test('does not run the ambient layer on interior pages (homepage only)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/roots');
    await page.waitForTimeout(2500);
    expect(await page.locator('.ambient-ecology').count()).toBe(0);
  });
});
```

- [ ] **Step 2: Run** — `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`, then `pnpm exec playwright test e2e/ambient.spec.ts --project=chromium`. Expected: all pass. (If the "spawns a pass" test is flaky under load, confirm no stale dev server on 4321 and re-run; do not raise the 1800ms first-delay just to pass — 8s headroom is ample.)
- [ ] **Step 3: Commit**

```bash
git add e2e/ambient.spec.ts
git commit -m "test: ambient layer spawns when allowed, silent under reduced motion, homepage-only"
```

---

## Task 4: Final sweep — Phase 4

- [ ] **Step 1:** `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm test` → all pass (145 + ambient units).
- [ ] **Step 2:** `pnpm exec astro check` → only the pre-existing `mulch/[slug].astro` error.
- [ ] **Step 3:** `pnpm exec playwright test` → all pass on chromium AND webkit (1 pre-existing skip). Watch `ambient.spec.ts` "spawns a pass" on webkit; if flaky, ensure 4321 is free and re-run.
- [ ] **Step 4:** `pnpm lhci` → error-budgets green on `/` and the five routes. The island is idle + post-LCP; if `total-blocking-time` regresses, confirm `requestIdleCallback` gating and re-run.
- [ ] **Step 5: Visual confirmation** (`pnpm dev`): over ~60s on `/`, watch a few passes come and go — never more than one or two at once; a worm pulses near the earth line, an insect/seed drifts, occasionally a bird or butterfly crosses the sky, a critter along the ground, a dew shimmer at the soil. Nothing competes with the title/links. Toggle night → still visible. OS reduced-motion → fully still. Navigate away and back → no duplicate/runaway sprites (cancel-on-nav works).
- [ ] **Step 6 (only if fixups were made):**

```bash
git add -A
git commit -m "chore: phase 4 sweep — ambient ecology verified across E2E, axe, Lighthouse"
```

---

## Self-Review (filled in by plan author)

**1. Spec coverage:** Pure seeded scheduler with one-at-a-time, 25–60s pacing (Task 1, `planPass`/`DELAY_*`). ASCII sprites for small fauna + SVG line-art for bird/butterfly/critter (Task 2, `SPRITES`). Wildlife kinds worm/insect/bird/butterfly/critter + airflow (drifting `seed`) + water (`dew` shimmer) (Tasks 1–2); sunlight is the P3 `--daytime-wash` (noted, no new work). Homepage-only (mounted in `index.astro`; E2E asserts interior pages have no `.ambient-ecology`, Task 3). Motion-gated (CSS `display:none` + JS `reduce` early-exit), idle-loaded (`requestIdleCallback`), paused on `document.hidden`, cancelled on `astro:before-preparation`, re-acquired on `astro:page-load` (Task 2). Decorative/aria-hidden + axe-safe + LCP-neutral; Lighthouse green (Task 4). Tests: scheduler determinism + bounds (Task 1), spawn/decorative/reduced-motion/homepage-only (Task 3).

**2. Placeholder scan:** none — full module, full island (markup+CSS+script), full E2E, exact mount edit, exact commands. Sprite SVGs are complete inline paths.

**3. Type consistency:** `AmbientKind` and the `AMBIENT_KINDS` order are identical across `ambient.ts`, its test, and the island's `SPRITES` record (which is keyed by every `AmbientKind`). `Pass` fields (`kind`, `laneTopPct`, `durationMs`, `dir`, `delayMs`) match between `planPass`'s return and the island's `spawn`. `IN_PLACE` is exported from `ambient.ts` and consumed by the island. `DURATION_MS`/`DELAY_MIN_MS`/`DELAY_MAX_MS` are exported and asserted in the test. Selectors `.ambient-ecology`, `.ambient-sprite`, `[data-ambient-root]` match across the component and the E2E. The keyframe names `ambient-ltr/-rtl/-pulse` match the `dir`/`IN_PLACE` branches in `spawn`.
