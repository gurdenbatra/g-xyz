# Homepage v3 — "ASCII Garden Cross-Section" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ASCII-hybrid zone glyphs (SVG silhouettes + clipped ASCII texture), a visible sky/ground/soil cross-section anchored by an ASCII earth horizon (statically rendered, progressively upgraded to a pretext-driven variable-typographic ripple), organic flora variance, and ecological mobile ordering/spacing fixes.

**Architecture:** Static Astro 5 page. Glyph hybrids and the earth line are pure SSG markup (inline SVG `<text>` rows / a `<pre>` line generated at build by a pure, Vitest-tested module). The only new client JS is one lazy, motion-gated inline script in `AsciiEarth.astro` that dynamically imports `@chenglou/pretext` (browser-only, v0.0.7) to animate the line; any failure leaves the static frame. LCP (giant title) untouched.

**Tech Stack:** Astro 5, TypeScript, `@chenglou/pretext@0.0.7` (ESM, lazy), Playwright (chromium+webkit, baseURL `http://localhost:4321`), Vitest, Lighthouse CI, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-09-homepage-ascii-garden-design.md`
**Already landed:** the glyph fill-visibility hotfix + computed-fill regression test (commit `740765a`) — do NOT redo it.

---

## Reference

Zone data (`src/lib/zones.ts`, unchanged): ids `polyculture, canopy, hive, compost, mycelium, beds`; homepage label = `longDesc`. Palette vars: `--c-moss`, `--c-soil`, `--c-ochre`, `--c-chartreuse`; fonts `--font-serif`, `--font-mono`; spacing `--space-*`, `--gutter`; motion `--duration-base`, `--easing`. Ecological order (sky→ground→soil): `canopy, hive, polyculture, beds, compost, mycelium`.

## File Structure

**Create:** `src/lib/ascii-earth.ts`, `src/lib/ascii-earth.test.ts`, `src/components/home/AsciiEarth.astro`, `e2e/ascii-earth.spec.ts`
**Modify:** `src/components/home/ZoneGlyph.astro`, `src/components/home/GardenFlora.astro`, `src/pages/index.astro`, `e2e/map.spec.ts`, `package.json`

---

## Task 0: Preflight — clean tree + green baseline

**Files:** none (verification only)

- [ ] **Step 1:** Run `git status --short` → expect empty. If not, stop and ask.
- [ ] **Step 2:** Run `pnpm test` → expect all pass (125).
- [ ] **Step 3:** Run `pnpm exec playwright test e2e/map.spec.ts e2e/accessibility.spec.ts e2e/cursor-bee.spec.ts --project=chromium` → expect all pass (map has 10 tests incl. the fill regression).

---

## Task 1: `ascii-earth.ts` pure module (TDD)

Pure, Node-safe logic shared by the build-time static frame and the browser animation. No DOM, no pretext imports.

**Files:**
- Create: `src/lib/ascii-earth.ts`
- Test: `src/lib/ascii-earth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/ascii-earth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  GROUND_CHARS,
  SPROUT_CHAR,
  groundFrame,
  groundHeight,
  pickChar,
} from './ascii-earth';

describe('groundHeight', () => {
  it('is deterministic', () => {
    expect(groundHeight(7, 1.5)).toBe(groundHeight(7, 1.5));
  });

  it('stays within [0, 1]', () => {
    for (let i = 0; i < 500; i++) {
      const h = groundHeight(i, i * 0.37);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
    }
  });
});

describe('groundFrame', () => {
  it('returns exactly `width` characters', () => {
    expect(groundFrame(240, 0)).toHaveLength(240);
  });

  it('is deterministic for the same time', () => {
    expect(groundFrame(80, 2)).toBe(groundFrame(80, 2));
  });

  it('changes over time', () => {
    expect(groundFrame(80, 0)).not.toBe(groundFrame(80, 3));
  });

  it('only emits known characters', () => {
    const allowed = new Set<string>([...GROUND_CHARS, SPROUT_CHAR]);
    for (const ch of groundFrame(300, 1)) {
      expect(allowed.has(ch)).toBe(true);
    }
  });

  it('returns an empty string for non-positive width', () => {
    expect(groundFrame(0, 1)).toBe('');
    expect(groundFrame(-5, 1)).toBe('');
  });
});

describe('pickChar', () => {
  const metrics = [
    { char: '.', width: 4, brightness: 0.1 },
    { char: '~', width: 8, brightness: 0.5 },
    { char: '*', width: 8, brightness: 1 },
  ];

  it('picks the closest brightness at equal width', () => {
    expect(pickChar(metrics, 0.95, 8)).toBe('*');
    expect(pickChar(metrics, 0.45, 8)).toBe('~');
  });

  it('weights width differences', () => {
    expect(pickChar(metrics, 0.1, 4)).toBe('.');
  });

  it('throws on empty candidates', () => {
    expect(() => pickChar([], 0.5, 8)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm test src/lib/ascii-earth.test.ts`
Expected: FAIL — module `./ascii-earth` not found.

- [ ] **Step 3: Implement**

Create `src/lib/ascii-earth.ts`:

```ts
// Pure logic for the homepage ASCII earth horizon. Shared by the build-time
// static frame (Astro frontmatter) and the browser animation island, so the
// no-JS fallback and the animated line come from one source of truth.
// Deliberately Node-safe: no DOM, no pretext — measured metrics are injected.

export const GROUND_CHARS = ['.', "'", ',', '-', '~'] as const;
export const SPROUT_CHAR = '"';

/** Deterministic pseudo-random in [0, 1) from an integer (replaces Math.random). */
function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Undulating height field in [0, 1] for column `i` at time `t` (seconds).
 * Two sine octaves (drifting in opposite directions = wind) + per-column jitter.
 */
export function groundHeight(i: number, t: number): number {
  const a = Math.sin(i * 0.35 + t * 1.1);
  const b = Math.sin(i * 0.13 - t * 0.7 + 2.1);
  const j = hash01(i) * 0.3;
  return Math.min(1, Math.max(0, 0.5 + 0.32 * a + 0.18 * b + j - 0.15));
}

/** One monospace frame of the horizon: `width` chars drawn from GROUND_CHARS, with occasional sprouts at peaks. */
export function groundFrame(width: number, t: number): string {
  if (width <= 0) return '';
  let out = '';
  for (let i = 0; i < width; i++) {
    const h = groundHeight(i, t);
    if (h > 0.93 && hash01(i * 7 + 3) > 0.6) {
      out += SPROUT_CHAR;
      continue;
    }
    const idx = Math.min(GROUND_CHARS.length - 1, Math.floor(h * GROUND_CHARS.length));
    out += GROUND_CHARS[idx];
  }
  return out;
}

export interface CharMetric {
  char: string;
  width: number;
  brightness: number;
}

/**
 * Variable-typographic selection: choose the candidate whose brightness AND
 * width best match the target (width error normalized + down-weighted, so
 * brightness leads but shape is preserved — the pretext demo's trick).
 */
export function pickChar(
  candidates: readonly CharMetric[],
  targetBrightness: number,
  targetWidth: number,
): string {
  if (candidates.length === 0) {
    throw new Error('pickChar: candidates must not be empty');
  }
  let best = candidates[0];
  let bestScore = Infinity;
  for (const c of candidates) {
    const widthErr = Math.abs(c.width - targetWidth) / Math.max(targetWidth, 1);
    const score = Math.abs(c.brightness - targetBrightness) + 0.6 * widthErr;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best.char;
}
```

- [ ] **Step 4: Run to verify PASS** — `pnpm test src/lib/ascii-earth.test.ts` → all pass.
- [ ] **Step 5: Full unit suite** — `pnpm test` → all pass (125 + new).
- [ ] **Step 6: Commit**

```bash
git add src/lib/ascii-earth.ts src/lib/ascii-earth.test.ts
git commit -m "feat: ascii-earth pure module (ground field, frames, char picking)"
```

---

## Task 2: ASCII-hybrid `ZoneGlyph.astro` (TDD)

**Files:**
- Modify: `e2e/map.spec.ts` (add one test)
- Modify (full rewrite): `src/components/home/ZoneGlyph.astro`

- [ ] **Step 1: Add the failing E2E**

In `e2e/map.spec.ts`, immediately AFTER the `glyph filled shapes actually render` test block, add:

```ts
  test('each glyph carries ASCII texture text', async ({ page }) => {
    await page.goto('/');
    for (const id of ['polyculture', 'canopy', 'hive', 'compost', 'mycelium', 'beds']) {
      const count = await page
        .locator(`#main-content a.zone-link[data-zone="${id}"] .zone-glyph text`)
        .count();
      expect(count, `zone ${id} should have ASCII texture`).toBeGreaterThan(0);
    }
  });
```

- [ ] **Step 2: Run to verify FAIL** — `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → the new test fails (no `<text>` in glyphs yet); the other 10 pass.

- [ ] **Step 3: Rewrite the component**

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
      <defs>
        <clipPath id="zg-canopy-crown">
          <circle cx="24" cy="15" r="12.5" />
          <circle cx="12" cy="23" r="8.5" />
          <circle cx="36" cy="23" r="8.5" />
        </clipPath>
      </defs>
      <path class="s-soil" d="M24 46 V30" />
      <path class="s-soil" d="M24 38 L18 33 M24 34 L29 30" />
      <g clip-path="url(#zg-canopy-crown)">
        <text class="t-chart" x="13" y="9" font-size="4.6">% @ &amp; %</text>
        <text class="t-moss" x="9" y="14" font-size="4.6">@ &amp; % @ &amp;</text>
        <text class="t-moss" x="5" y="19" font-size="4.6">&amp; % @ &amp; % @</text>
        <text class="t-moss" x="4" y="24" font-size="4.6">@ &amp; % @ &amp; %</text>
        <text class="t-soil" x="7" y="29" font-size="4.6">% @ &amp; % @</text>
      </g>
      <circle class="s-moss" cx="24" cy="15" r="12.5" />
      <circle class="s-moss" cx="12" cy="23" r="8.5" />
      <circle class="s-moss" cx="36" cy="23" r="8.5" />
    </svg>
  )}
  {id === 'hive' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <defs>
        <clipPath id="zg-hive-body">
          <path d="M7 40 Q7 9 24 9 Q41 9 41 40 Z" />
        </clipPath>
      </defs>
      <g clip-path="url(#zg-hive-body)">
        <text class="t-ochre" x="16" y="17" font-size="4.4">o = o</text>
        <text class="t-ochre" x="12" y="23" font-size="4.4">= o = o</text>
        <text class="t-ochre" x="10" y="29" font-size="4.4">o = o = o</text>
        <text class="t-soil" x="12" y="35" font-size="4.4">= o = o</text>
      </g>
      <path class="s-ochre" d="M7 40 Q7 9 24 9 Q41 9 41 40" />
      <path class="s-ochre" d="M6 40 H42" />
      <path class="s-ochre" d="M21 40 Q24 34 27 40" />
      <circle class="f-ochre" cx="37" cy="7" r="2.5" />
      <path class="s-ochre" d="M34 5 L37 7 M40 5 L37 7" />
    </svg>
  )}
  {id === 'polyculture' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <path class="s-soil" d="M6 42 H42" />
      <text class="t-soil" x="7" y="46.5" font-size="4">~ , ~ . ~ , ~</text>
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
      <defs>
        <clipPath id="zg-beds-box">
          <rect x="8" y="32" width="32" height="9" />
        </clipPath>
      </defs>
      <path class="s-soil" d="M7 31 H41 V42 H7 Z" />
      <g clip-path="url(#zg-beds-box)">
        <text class="t-soil" x="9" y="36.5" font-size="4">, ^ , ^ , ^ ,</text>
        <text class="t-soil" x="9" y="41" font-size="4">v , v , v , v</text>
      </g>
      <path class="s-moss" d="M16 31 V23 M16 27 Q12 25 11 21 M16 26 Q20 24 21 20" />
      <path class="s-moss" d="M24 31 V21 M24 26 Q20 24 19 19 M24 26 Q28 24 29 19" />
      <path class="s-moss" d="M32 31 V24 M32 28 Q28 26 27 22 M32 27 Q36 25 37 21" />
    </svg>
  )}
  {id === 'compost' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <defs>
        <clipPath id="zg-compost-heap">
          <path d="M6 41 Q9 23 24 21 Q39 23 42 41 Z" />
        </clipPath>
      </defs>
      <g clip-path="url(#zg-compost-heap)">
        <text class="t-chart" x="19" y="28" font-size="4.2">. : .</text>
        <text class="t-soil" x="13" y="33" font-size="4.2">: ; * : ;</text>
        <text class="t-soil" x="9" y="38" font-size="4.2">* ; : * ; : *</text>
      </g>
      <path class="s-soil" d="M6 41 Q9 23 24 21 Q39 23 42 41 Z" />
      <path class="s-chart" d="M24 21 Q21 16 24 12 Q27 16 24 21" />
    </svg>
  )}
  {id === 'mycelium' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <path class="s-moss" d="M16 44 V32 M16 32 L8 22 M16 32 L25 25 M8 22 L4 13 M25 25 L31 16" />
      <text class="t-moss" x="5.5" y="24.5" font-size="5">*</text>
      <text class="t-moss" x="22.5" y="27.5" font-size="5">*</text>
      <text class="t-moss" x="1.5" y="15.5" font-size="5">*</text>
      <text class="t-moss" x="28.5" y="18.5" font-size="5">*</text>
      <text class="t-soil" x="12" y="47" font-size="4">. · .</text>
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
    width: 72px;
    height: 72px;
    display: block;
  }

  @media (min-width: 768px) {
    .zone-glyph svg {
      width: 96px;
      height: 96px;
    }
  }

  /* Strokes (outlines) */
  .zone-glyph path,
  .zone-glyph circle {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Color classes are prefixed with .zone-glyph so they outrank the base
     `path/circle { fill: none }` rule above — without the prefix, filled
     shapes compute to fill:none + stroke:none and vanish (see regression
     test in e2e/map.spec.ts). */
  .zone-glyph .s-moss  { stroke: var(--c-moss); }
  .zone-glyph .s-soil  { stroke: var(--c-soil); }
  .zone-glyph .s-ochre { stroke: var(--c-ochre); }
  .zone-glyph .s-chart { stroke: var(--c-chartreuse); }

  /* Solid fills (bud, mushroom cap, skep bee dot) */
  .zone-glyph .f-moss  { fill: var(--c-moss);  stroke: none; }
  .zone-glyph .f-ochre { fill: var(--c-ochre); stroke: none; }

  /* ASCII texture rows — monospace, translucent so silhouettes stay sharp */
  .zone-glyph text {
    font-family: var(--font-mono);
    opacity: 0.68;
    stroke: none;
  }

  .zone-glyph .t-moss  { fill: var(--c-moss); }
  .zone-glyph .t-soil  { fill: var(--c-soil); }
  .zone-glyph .t-ochre { fill: var(--c-ochre); }
  .zone-glyph .t-chart { fill: var(--c-chartreuse); }
</style>
```

- [ ] **Step 4: Run to verify PASS** — `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → all 11 pass.
- [ ] **Step 5: Visual tuning check.** With the dev server running (`pnpm dev`), screenshot `/` at 1280×900 (preview tools or a browser). Each silhouette must read clearly with its texture inside the clip. If a texture row pokes outside its silhouette or sits visibly off-center, nudge that row's `x`/`y` by ≤2 viewBox units and re-check. Do not change silhouettes, classes, ids, or character sets.
- [ ] **Step 6: Type-check** — `pnpm exec astro check` → no NEW errors (one pre-existing `canopy/[slug].astro` ts(2322) error is expected).
- [ ] **Step 7: Commit**

```bash
git add src/components/home/ZoneGlyph.astro e2e/map.spec.ts
git commit -m "feat: ascii-hybrid zone glyphs (clipped texture inside silhouettes)"
```

---

## Task 3: `AsciiEarth.astro` (static) + `index.astro` v3 (TDD)

Static earth first — the animation island is Task 5. This task also delivers ecological order, zonePos v3, soil wash, and mobile spacing.

**Files:**
- Modify: `e2e/map.spec.ts` (add two tests)
- Create: `src/components/home/AsciiEarth.astro`
- Modify (full rewrite): `src/pages/index.astro`

- [ ] **Step 1: Add the failing E2Es**

In `e2e/map.spec.ts`, immediately AFTER the `each glyph carries ASCII texture text` test, add:

```ts
  test('zones appear in ecological order (sky → ground → soil)', async ({ page }) => {
    await page.goto('/');
    const order = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#main-content a.zone-link')).map(
        (a) => (a as HTMLElement).dataset.zone,
      ),
    );
    expect(order).toEqual(['canopy', 'hive', 'polyculture', 'beds', 'compost', 'mycelium']);
  });

  test('ascii earth horizon is present in static markup', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('.ascii-earth [data-earth-line]').textContent();
    expect((text ?? '').length).toBeGreaterThan(100);
  });
```

- [ ] **Step 2: Run to verify FAIL** — `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → both new tests fail (order is `polyculture` first; no `.ascii-earth`).

- [ ] **Step 3: Create `src/components/home/AsciiEarth.astro`**

```astro
---
// The garden's earth horizon: an undulating ASCII ground line + sparse soil
// specks. Rendered statically at build time (deterministic — same source as
// the browser animation in ascii-earth.ts). Purely decorative.
// Task 5 adds the motion-gated pretext animation script to this component.
import { groundFrame } from '../../lib/ascii-earth';

const earthLine = groundFrame(240, 0);
const SPECK_ROWS = [
  '·     .        :      .         ·       .          :     .       ·      .',
  '   .       ·         .      :        .        ·        .     :        .',
] as const;
---

<div class="ascii-earth" aria-hidden="true">
  <pre class="ascii-earth__line" data-earth-line>{earthLine}</pre>
  <pre class="ascii-earth__specks">{SPECK_ROWS[0]}</pre>
  <pre class="ascii-earth__specks ascii-earth__specks--two">{SPECK_ROWS[1]}</pre>
</div>

<style>
  .ascii-earth {
    pointer-events: none;
    width: 100%;
    overflow: hidden;
  }

  .ascii-earth pre {
    margin: 0;
    font-family: var(--font-mono);
    white-space: pre;
    overflow: hidden;
    text-align: center;
    line-height: 1;
  }

  .ascii-earth__line {
    font-size: 13px;
    color: var(--c-soil);
    opacity: 0.4;
  }

  /* Applied by the animation island (Task 5): the variable-typographic ripple
     selects proportional serif characters by brightness AND width. */
  .ascii-earth__line--vivid {
    font-family: Georgia, serif;
    font-style: italic;
  }

  .ascii-earth__specks {
    display: none;
    font-size: 11px;
    color: var(--c-soil);
    opacity: 0.2;
  }

  @media (min-width: 768px) {
    .ascii-earth {
      position: absolute;
      left: 0;
      right: 0;
      top: 62%;
      z-index: 0;
    }

    .ascii-earth__specks {
      display: block;
      margin-top: 0.9rem;
    }

    .ascii-earth__specks--two {
      opacity: 0.14;
      margin-top: 1.1rem;
    }
  }
</style>
```

(Keep each `<pre>` open/close on a single line — a newline inside `<pre>` becomes visible whitespace.)

- [ ] **Step 4: Rewrite `src/pages/index.astro`**

Replace the ENTIRE contents with:

```astro
---
import Garden from '@layouts/Garden.astro';
import { zones, type ZoneId } from '../lib/zones';
import ZoneGlyph from '../components/home/ZoneGlyph.astro';
import GardenFlora from '../components/home/GardenFlora.astro';
import AsciiEarth from '../components/home/AsciiEarth.astro';

// Garden cross-section: position encodes ecology (no drawn connections).
//   sky    — canopy (the tree) + hive (bees around it)
//   ground — polyculture + beds frame the wordmark, standing on the horizon
//   soil   — compost (the heap) + mycelium (threads beside it)
// DOM/tab/mobile order follows the same story, top of the garden first.
const ecologicalOrder: readonly ZoneId[] = [
  'canopy',
  'hive',
  'polyculture',
  'beds',
  'compost',
  'mycelium',
];
const orderedZones = ecologicalOrder.map((id) => zones.find((z) => z.id === id)!);

// Anchors (≥768px); links centered via translate(-50%,-50%). Slight stagger
// keeps the field organic; ground band sits just above the 62% earth horizon.
const zonePos: Record<ZoneId, { x: string; y: string }> = {
  canopy: { x: '30%', y: '16%' },
  hive: { x: '68%', y: '18%' },
  polyculture: { x: '14%', y: '52%' },
  beds: { x: '86%', y: '52%' },
  compost: { x: '36%', y: '84%' },
  mycelium: { x: '64%', y: '86%' },
};
---

<Garden title="Home">
  <section class="garden-home" aria-label="Garden home">
    <GardenFlora />

    <h1 class="garden-title"><span>Gurden's</span> <span>Garden</span></h1>

    <AsciiEarth />

    <ul class="zone-field" role="list">
      {orderedZones.map((zone) => {
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
    gap: var(--space-6);
    padding: var(--space-12) var(--gutter) 7rem;
    overflow: hidden;
    text-align: center;
  }

  /* Soil wash: faint darkening of the lower strata so sky/ground/soil read. */
  .garden-home::after {
    content: '';
    position: absolute;
    inset: 60% 0 0 0;
    background: linear-gradient(
      to bottom,
      transparent,
      color-mix(in srgb, var(--c-soil) 6%, transparent)
    );
    pointer-events: none;
    z-index: 0;
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
    gap: var(--space-2);
    padding: var(--space-2);
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
    transform: scale(1.06) rotate(-2deg);
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

- [ ] **Step 5: Run to verify PASS** — `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → all 13 pass.
- [ ] **Step 6: Cross-suite check** — `pnpm exec playwright test e2e/cursor-bee.spec.ts e2e/accessibility.spec.ts --project=chromium` → all pass (bee test clicks `data-zone="polyculture"`, which still exists).
- [ ] **Step 7: Type-check** — `pnpm exec astro check` → no NEW errors.
- [ ] **Step 8: Visual check.** Screenshot `/` at 1280×900: horizon line behind the lower title, ground zones standing just above it, soil zones in the wash below; and at 375×812: title → earth divider → ecological stack, no overlap with the map toggle pill. Nudge `top: 62%` by at most ±3% if the horizon visibly collides with the title's baseline.
- [ ] **Step 9: Commit**

```bash
git add src/components/home/AsciiEarth.astro src/pages/index.astro e2e/map.spec.ts
git commit -m "feat: ascii earth horizon, ecological order, cross-section strata"
```

---

## Task 4: `GardenFlora.astro` — organic variance + ASCII accents + mobile fixes

**Files:**
- Modify (full rewrite): `src/components/home/GardenFlora.astro`

- [ ] **Step 1: Rewrite the component**

Replace the ENTIRE contents of `src/components/home/GardenFlora.astro` with:

```astro
---
// Decorative botanical sprigs + small ASCII accents for the homepage.
// Purely ornamental — aria-hidden, motion disabled under
// prefers-reduced-motion. Sway durations/amplitudes vary per sprig so the
// field doesn't move in lockstep.
---

<div class="garden-flora" aria-hidden="true">
  <!-- tall sprigs rooted along the bottom -->
  <svg class="garden-flora__sprig" style="left:4%;bottom:0;width:64px;height:160px;animation-delay:0s;animation-duration:5.8s" viewBox="0 0 64 160">
    <path d="M32 160 Q32 76 32 22" stroke="var(--c-moss)" stroke-width="2" fill="none" />
    <path d="M32 96 Q6 86 4 54 Q28 62 32 96" fill="var(--c-moss)" opacity="0.75" />
    <path d="M32 74 Q58 64 60 32 Q36 40 32 74" fill="var(--c-moss)" opacity="0.55" />
    <circle cx="32" cy="22" r="7" stroke="var(--c-ochre)" stroke-width="2" fill="none" />
  </svg>
  <svg class="garden-flora__sprig garden-flora__sprig--soft" style="right:4%;bottom:0;width:54px;height:140px;animation-delay:1.3s;animation-duration:6.4s" viewBox="0 0 54 140">
    <path d="M27 140 Q27 60 27 16" stroke="var(--c-soil)" stroke-width="2" fill="none" />
    <path d="M27 84 Q6 74 5 46 Q24 54 27 84" fill="var(--c-chartreuse)" />
    <circle cx="27" cy="16" r="6" fill="var(--c-ochre)" />
  </svg>
  <svg class="garden-flora__sprig" style="left:30%;bottom:0;width:40px;height:110px;animation-delay:2.4s;animation-duration:4.6s" viewBox="0 0 40 110">
    <path d="M20 110 Q20 50 20 14" stroke="var(--c-moss)" stroke-width="1.6" fill="none" />
    <path d="M20 60 Q4 54 4 34 Q18 40 20 60" fill="var(--c-moss)" opacity="0.6" />
    <circle cx="20" cy="14" r="5" fill="var(--c-ochre)" />
  </svg>
  <svg class="garden-flora__sprig garden-flora__sprig--soft" style="right:33%;bottom:0;width:34px;height:96px;animation-delay:0.6s;animation-duration:5.2s" viewBox="0 0 34 96">
    <path d="M17 96 Q17 44 17 12" stroke="var(--c-soil)" stroke-width="1.5" fill="none" />
    <path d="M17 52 Q30 46 31 28 Q19 34 17 52" fill="var(--c-chartreuse)" opacity="0.85" />
  </svg>
  <!-- small seed-heads drifting in the upper field (hidden <768px: they collide with the title) -->
  <svg class="garden-flora__sprig garden-flora__sprig--sky garden-flora__sprig--soft" style="left:46%;top:8%;width:22px;height:46px;animation-delay:1.9s;animation-duration:4.2s" viewBox="0 0 22 46">
    <path d="M11 46 Q11 18 11 6" stroke="var(--c-moss)" stroke-width="1.2" fill="none" />
    <circle cx="11" cy="6" r="4" fill="var(--c-ochre)" />
  </svg>
  <svg class="garden-flora__sprig garden-flora__sprig--sky" style="left:8%;top:30%;width:20px;height:40px;animation-delay:3.1s;animation-duration:6.1s" viewBox="0 0 20 40">
    <path d="M10 40 Q10 16 10 6" stroke="var(--c-soil)" stroke-width="1.1" fill="none" />
    <path d="M10 22 Q2 18 2 9 Q8 13 10 22" fill="var(--c-moss)" opacity="0.7" />
  </svg>
  <svg class="garden-flora__sprig garden-flora__sprig--sky garden-flora__sprig--soft" style="right:9%;top:34%;width:20px;height:42px;animation-delay:1.1s;animation-duration:4.9s" viewBox="0 0 20 42">
    <path d="M10 42 Q10 18 10 6" stroke="var(--c-moss)" stroke-width="1.1" fill="none" />
    <circle cx="10" cy="6" r="3.5" stroke="var(--c-ochre)" stroke-width="1.4" fill="none" />
  </svg>
  <!-- ASCII accents — the texture language escapes the glyphs into the field -->
  <pre class="garden-flora__ascii garden-flora__ascii--upper" style="left:22%;top:26%">·*·</pre>
  <pre class="garden-flora__ascii garden-flora__ascii--upper" style="right:24%;top:28%">*</pre>
  <pre class="garden-flora__ascii" style="left:55%;bottom:6%">\|/</pre>
</div>

<style>
  @keyframes flora-sway {
    0%, 100% { transform: rotate(-4deg); }
    50%      { transform: rotate(4deg); }
  }

  @keyframes flora-sway-soft {
    0%, 100% { transform: rotate(-2.5deg); }
    50%      { transform: rotate(2.5deg); }
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

  .garden-flora__sprig--soft {
    animation-name: flora-sway-soft;
  }

  .garden-flora__ascii {
    position: absolute;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1;
    color: var(--c-moss);
    opacity: 0.5;
  }

  @media (max-width: 767px) {
    .garden-flora__sprig--sky,
    .garden-flora__ascii--upper {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .garden-flora__sprig {
      animation: none;
    }
  }
</style>
```

(Note: per-sprig inline `animation-duration` overrides the shorthand's 5s; the `--soft` class swaps `animation-name`. The reduced-motion block still kills everything because `animation: none` resets name and duration alike.)

- [ ] **Step 2: Run homepage tests** — `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → all 13 pass (the reduced-motion flora test targets `.garden-flora__sprig`, unchanged).
- [ ] **Step 3: Type-check** — `pnpm exec astro check` → no NEW errors.
- [ ] **Step 4: Visual check.** 375×812 screenshot: nothing overlaps the title; the upper accents/seed-heads are gone; bottom sprigs + `\|/` accent visible.
- [ ] **Step 5: Commit**

```bash
git add src/components/home/GardenFlora.astro
git commit -m "feat: vary flora sway, add ascii accents, fix mobile title overlap"
```

---

## Task 5: The pretext animation island (TDD)

**Files:**
- Create: `e2e/ascii-earth.spec.ts`
- Modify: `src/components/home/AsciiEarth.astro` (append a `<script>` block)
- Modify: `package.json` (dependency, via pnpm)

- [ ] **Step 1: Install pretext**

Run: `pnpm add @chenglou/pretext`
Expected: `@chenglou/pretext 0.0.7` added to `dependencies`.

- [ ] **Step 2: Confirm the export names**

Run: `node -e "import('@chenglou/pretext').then((m) => console.log(Object.keys(m).join('\n')))"`
Expected: a list including `prepareWithSegments` and `measureNaturalWidth` (per the library README). If these exact names are absent, open `node_modules/@chenglou/pretext/dist/layout.d.ts`, find the equivalent "prepare segmented text" and "measure natural width" exports, and use those names in Step 5's two call sites. The `try/catch` keeps the page correct regardless.

- [ ] **Step 3: Write the failing E2E**

Create `e2e/ascii-earth.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('ASCII earth', () => {
  test('animates the horizon when motion is allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const initial = await page.locator('[data-earth-line]').textContent();
    await page.waitForFunction(
      (prev) => document.querySelector('[data-earth-line]')?.textContent !== prev,
      initial,
      { timeout: 8000 },
    );
  });

  test('stays static under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const initial = await page.locator('[data-earth-line]').textContent();
    await page.waitForTimeout(1200);
    const after = await page.locator('[data-earth-line]').textContent();
    expect(after).toBe(initial);
  });
});
```

- [ ] **Step 4: Run to verify FAIL** — `pnpm exec playwright test e2e/ascii-earth.spec.ts --project=chromium` → first test FAILS (timeout: nothing animates yet); second PASSES.

- [ ] **Step 5: Add the island script**

In `src/components/home/AsciiEarth.astro`, append AFTER the `</style>` tag:

```astro
<script>
  import { groundHeight, pickChar, type CharMetric } from '../../lib/ascii-earth';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce) {
    // Re-acquire after ClientRouter <body> swaps (same pattern as CursorBee).
    let el: HTMLElement | null = document.querySelector('[data-earth-line]');
    document.addEventListener('astro:page-load', () => {
      el = document.querySelector('[data-earth-line]');
    });

    const start = () => {
      void init();
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(start);
    } else {
      setTimeout(start, 200);
    }

    async function init() {
      try {
        const pretext = await import('@chenglou/pretext');
        const font = 'italic 13px Georgia, serif';
        // Hand-tuned perceived ink density per candidate character.
        const BRIGHTNESS: Record<string, number> = {
          '.': 0.15, "'": 0.2, ',': 0.3, '-': 0.4, '~': 0.55,
          ':': 0.6, ';': 0.7, '^': 0.8, '"': 0.85, '*': 1,
        };
        const metrics: CharMetric[] = Object.keys(BRIGHTNESS).map((ch) => {
          const prepared = pretext.prepareWithSegments(ch, font);
          return {
            char: ch,
            width: pretext.measureNaturalWidth(prepared),
            brightness: BRIGHTNESS[ch],
          };
        });
        const cell = metrics.find((m) => m.char === '~');
        if (!cell || !metrics.every((m) => Number.isFinite(m.width) && m.width > 0)) return;

        el?.classList.add('ascii-earth__line--vivid');

        const COLUMNS = 240;
        const FRAME_MS = 80; // ~12fps — plenty for a breeze, cheap for the CPU
        let last = 0;
        function tick(now: number) {
          if (!document.hidden && el && now - last >= FRAME_MS) {
            last = now;
            const t = now / 1000;
            let line = '';
            for (let i = 0; i < COLUMNS; i++) {
              line += pickChar(metrics, groundHeight(i, t), cell!.width);
            }
            el.textContent = line;
          }
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      } catch {
        // pretext unavailable or measurement failed — the static frame stands.
      }
    }
  }
</script>
```

- [ ] **Step 6: Run to verify PASS** — `pnpm exec playwright test e2e/ascii-earth.spec.ts --project=chromium` → both pass.
- [ ] **Step 7: Reduced-motion + axe re-check** — `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → all 13 pass.
- [ ] **Step 8: Type-check** — `pnpm exec astro check` → no NEW errors. (If TS complains about `requestIdleCallback`, change the guard line to `if (typeof (window as Window & { requestIdleCallback?: unknown }).requestIdleCallback === 'function') { (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(start); }` — keep the `setTimeout` fallback branch as-is.)
- [ ] **Step 9: Commit**

```bash
git add src/components/home/AsciiEarth.astro e2e/ascii-earth.spec.ts package.json pnpm-lock.yaml
git commit -m "feat: pretext-driven variable-typographic ripple on the ascii earth"
```

---

## Task 6: Final sweep

**Files:** none (verification only; fixups if needed)

- [ ] **Step 1:** `pnpm test` → all pass (~135).
- [ ] **Step 2:** `pnpm exec astro check` → only the pre-existing `canopy/[slug].astro` error.
- [ ] **Step 3:** `pnpm exec playwright test` → all pass on chromium AND webkit (2 pre-existing skips remain). Watch `ascii-earth.spec.ts` on webkit — `Intl.Segmenter` is supported, but if the animate test is flaky there, raise its `waitForFunction` timeout to 12000 and re-run before investigating further.
- [ ] **Step 4:** `pnpm lhci autorun` → budgets green on `/` and all six zones (pretext is a lazy chunk, post-idle).
- [ ] **Step 5: Manual visual confirmation** (`pnpm dev`, 1280×900 + 375×812):
  - Glyphs read instantly (tree/skep/heap/etc.) with ASCII texture visible up close.
  - Strata legible: sky above, earth horizon behind the lower title, soil wash below.
  - Earth line ripples gently; nothing moves under OS reduced-motion.
  - Mobile: title → earth divider → ecological stack; no overlaps anywhere; map pill clear of the last zone.
- [ ] **Step 6 (only if fixups were made):**

```bash
git add -A
git commit -m "test: verify ascii garden homepage across E2E, units, and Lighthouse"
```

---

## Self-Review (filled in by plan author)

**1. Spec coverage:** fill bug → pre-landed (`740765a`), guarded. Hybrid glyphs (clip + texture + 96/72px + hover wind nudge) → Tasks 2–3. ASCII earth static + placement + specks + soil wash → Task 3. Pretext piece (lazy, motion-gated, shared `groundHeight`/`pickChar` source, graceful failure, `astro:page-load` re-acquire, hidden-tab pause) → Tasks 1 & 5. Composition (zonePos v3, flora variance, ASCII accents) → Tasks 3–4. Responsive/UX (ecological order, divider-on-mobile, gap/padding/touch targets, sprig hiding) → Tasks 3–4. Tests (unit, earth static, order, texture, animate/reduce, axe via existing) → Tasks 1, 2, 3, 5. Invariants sweep → Task 6. No gaps.

**2. Placeholder scan:** none — every code step ships full code; commands have expected outputs; the only conditional instruction (pretext export names) includes the exact verification command and fallback procedure.

**3. Type consistency:** `groundFrame(width, t)`, `groundHeight(i, t)`, `pickChar(candidates, targetBrightness, targetWidth)`, `CharMetric {char,width,brightness}` identical across Task 1 lib/tests and Task 5 island. `data-earth-line` attribute matches Task 3 markup, Task 3/5 E2Es, and the island query. Classes `.ascii-earth__line--vivid`, `.garden-flora__sprig--sky/--soft`, `.garden-flora__ascii--upper`, `.zone-glyph text`, `.t-*` defined where used. `ecologicalOrder` array matches the Task 3 E2E expectation. ClipPath ids (`zg-canopy-crown`, `zg-hive-body`, `zg-beds-box`, `zg-compost-heap`) are unique and zone-prefixed.
