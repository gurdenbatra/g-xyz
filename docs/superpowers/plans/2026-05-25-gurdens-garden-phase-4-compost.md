# Gurden's Garden — Phase 4: Compost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/compost` with the Strata hero piece — a vertical soil cross-section that reveals biographical layers on scroll — and migrate the existing `/about` content into it.

**Architecture:** A single `Strata.astro` component houses three layers: (1) layered HTML sections with CSS soil-noise backgrounds, (2) Motion One scroll-driven layer reveal (IntersectionObserver fallback for reduced-motion), and (3) a Canvas 2D overlay rendering animated worm sprites. A pure `worms.ts` module handles deterministic worm math and canvas lifecycle. The `/compost/index.astro` page assembles the piece. The old `about.astro` is deleted; an Astro redirect preserves the URL.

**Tech Stack:** Astro 5 (static), Motion One v11 (`motion` package already installed), Canvas 2D, CSS `feTurbulence` SVG filter for soil noise, Playwright E2E, Vitest unit tests.

---

## File Structure

**New:**
- `src/components/zones/Compost/worms.ts` — pure worm maths + canvas lifecycle (no Astro)
- `src/components/zones/Compost/worms.test.ts` — Vitest unit tests for worms.ts
- `src/components/zones/Compost/Strata.astro` — the Strata hero piece
- `src/pages/compost/index.astro` — `/compost` route
- `e2e/compost.spec.ts` — Playwright E2E + axe

**Modified:**
- `astro.config.mjs` — add `'/about': '/compost'` redirect
- `src/lib/zones.ts` — compost href: `'/about'` → `'/compost'`
- `lighthouserc.json` — `/about` → `/compost` in URL list
- `e2e/pages.spec.ts` — update About test to target `/compost`, add redirect test
- `e2e/accessibility.spec.ts` — update three `a[href="/about"]` refs to `a[href="/compost"]`

**Deleted:**
- `src/pages/about.astro` — content migrated into Compost

---

### Task 1: Worm data types and pure module

**Files:**
- Create: `src/components/zones/Compost/worms.ts`
- Test: `src/components/zones/Compost/worms.test.ts`

The worm module exports pure maths helpers (testable without DOM) and a `mount` function that manages the canvas RAF loop and click hit-testing. All positional data is seeded — the same seed + time produces the same x value on every call.

**Exported API:**
```typescript
export interface WormDef {
  id: string;
  layerDepth: number; // 0 = surface … 3 = deepest
  seed: number;       // deterministic position seed (positive integer)
  anecdote: string;   // text shown on click
}

// Pure maths helpers — exported for unit testing
export function wormBaseX(seed: number): number      // [0.1, 0.9]
export function wormWiggle(seed: number, t: number): number  // small offset
export function wormX(seed: number, t: number): number       // [0.05, 0.95]

// Canvas lifecycle
export function mount(
  canvas: HTMLCanvasElement,
  worms: WormDef[],
  layerMidpoints: number[],  // y-midpoint of each layer in canvas CSS-px coords
  reducedMotion: boolean,
  onAnecdote: (worm: WormDef, clientX: number, clientY: number) => void,
): () => void  // returns cleanup function
```

- [ ] **Step 1: Write the failing tests**

Create `src/components/zones/Compost/worms.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { wormBaseX, wormWiggle, wormX, mount } from './worms';

describe('wormBaseX', () => {
  it('returns a value in [0.1, 0.9]', () => {
    for (const seed of [0, 1, 7, 13, 42, 99, 1000]) {
      const x = wormBaseX(seed);
      expect(x).toBeGreaterThanOrEqual(0.1);
      expect(x).toBeLessThanOrEqual(0.9);
    }
  });

  it('is deterministic for the same seed', () => {
    expect(wormBaseX(7)).toBe(wormBaseX(7));
    expect(wormBaseX(42)).toBe(wormBaseX(42));
  });

  it('produces different values for different seeds', () => {
    expect(wormBaseX(7)).not.toBe(wormBaseX(13));
    expect(wormBaseX(1)).not.toBe(wormBaseX(2));
  });
});

describe('wormWiggle', () => {
  it('returns a finite number at any time', () => {
    for (const t of [0, 100, 500, 1000, 9999]) {
      expect(Number.isFinite(wormWiggle(7, t))).toBe(true);
    }
  });

  it('is deterministic for same seed + time', () => {
    expect(wormWiggle(42, 500)).toBe(wormWiggle(42, 500));
  });

  it('changes over time (not stuck at zero)', () => {
    const v1 = wormWiggle(7, 0);
    const v2 = wormWiggle(7, 3000);
    expect(v1).not.toBe(v2);
  });
});

describe('wormX', () => {
  it('stays in [0.05, 0.95] at many time points', () => {
    for (const t of [0, 250, 1000, 5000, 10000]) {
      const x = wormX(7, t);
      expect(x).toBeGreaterThanOrEqual(0.05);
      expect(x).toBeLessThanOrEqual(0.95);
    }
  });

  it('is deterministic for same seed + time', () => {
    expect(wormX(13, 750)).toBe(wormX(13, 750));
  });
});

describe('mount', () => {
  function makeCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    return canvas;
  }

  it('returns a cleanup function', () => {
    const canvas = makeCanvas();
    const worms = [{ id: 'w0', layerDepth: 0, seed: 7, anecdote: 'test' }];
    const cleanup = mount(canvas, worms, [100, 250, 400, 550], false, () => {});
    expect(typeof cleanup).toBe('function');
    cleanup(); // should not throw
  });

  it('cleanup cancels RAF (no throws after cleanup)', () => {
    const canvas = makeCanvas();
    const worms = [{ id: 'w0', layerDepth: 1, seed: 13, anecdote: 'hi' }];
    const cleanup = mount(canvas, worms, [150, 300, 450, 550], false, () => {});
    expect(() => cleanup()).not.toThrow();
  });

  it('with reducedMotion=true, cleanup does not throw', () => {
    const canvas = makeCanvas();
    const worms = [{ id: 'w0', layerDepth: 2, seed: 42, anecdote: 'hi' }];
    const cleanup = mount(canvas, worms, [100, 250, 400, 550], true, () => {});
    expect(() => cleanup()).not.toThrow();
  });

  it('calls onAnecdote when click lands on a worm region', () => {
    const canvas = makeCanvas();
    const seed = 7;
    const layerMidpoints = [100, 300, 450, 550];
    const worms = [{ id: 'w0', layerDepth: 0, seed, anecdote: 'test anecdote' }];
    const spy = vi.fn();
    const cleanup = mount(canvas, worms, layerMidpoints, true, spy);

    // Worm x = wormX(seed, 0) * canvas.width (CSS px = canvas px for test)
    // Click right at the worm's computed centre
    const expectedX = wormX(seed, 0) * canvas.width;
    const expectedY = layerMidpoints[0]; // layerDepth=0 → midpoints[0]
    const fakeRect = { left: 0, top: 0, width: canvas.width, height: canvas.height } as DOMRect;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(fakeRect);

    const clickEvent = new MouseEvent('click', { clientX: expectedX, clientY: expectedY });
    canvas.dispatchEvent(clickEvent);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'w0', anecdote: 'test anecdote' }),
      expectedX,
      expectedY,
    );
    cleanup();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/gurden/Documents/code/g-xyz
pnpm vitest run src/components/zones/Compost/worms.test.ts
```

Expected: `FAIL` with "Cannot find module './worms'"

- [ ] **Step 3: Implement `src/components/zones/Compost/worms.ts`**

```typescript
export interface WormDef {
  id: string;
  layerDepth: number;
  seed: number;
  anecdote: string;
}

// ── Pure maths helpers ──────────────────────────────────────

/** Deterministic base x position in [0.1, 0.9] for a given seed. */
export function wormBaseX(seed: number): number {
  // LCG-style hash, then normalise to [0.1, 0.9]
  const h = (((seed * 1664525 + 1013904223) & 0xffffffff) >>> 0) / 0xffffffff;
  return 0.1 + h * 0.8;
}

/** Sinusoidal wiggle offset at elapsed time t (ms). Small, seed-dependent amplitude. */
export function wormWiggle(seed: number, t: number): number {
  const speed = 0.0008 + (seed % 5) * 0.0001;  // 0.0008–0.0012 Hz
  const phase = seed * 0.73;
  const amplitude = 0.04 + (seed % 4) * 0.008; // 0.04–0.064
  return Math.sin(t * speed + phase) * amplitude;
}

/** Combined x position in [0.05, 0.95]. Safe to multiply by canvas width. */
export function wormX(seed: number, t: number): number {
  return Math.min(0.95, Math.max(0.05, wormBaseX(seed) + wormWiggle(seed, t)));
}

// ── Drawing helper ──────────────────────────────────────────

const WORM_W = 5;
const WORM_H = 22;
const HIT_RADIUS_X = 18;
const HIT_RADIUS_Y = 28;

function drawWorm(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.18); // slight tilt
  ctx.beginPath();
  ctx.ellipse(0, 0, WORM_W, WORM_H, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(241,232,208,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(138,79,46,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// ── Canvas lifecycle ────────────────────────────────────────

export function mount(
  canvas: HTMLCanvasElement,
  worms: WormDef[],
  layerMidpoints: number[],
  reducedMotion: boolean,
  onAnecdote: (worm: WormDef, clientX: number, clientY: number) => void,
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let raf = 0;
  let startTime = 0;

  function computePos(worm: WormDef, t: number): { x: number; y: number } {
    const midY = layerMidpoints[worm.layerDepth] ?? canvas.height / 2;
    // Slight y-jitter per worm so they don't all sit exactly on the midpoint
    const yJitter = ((worm.seed * 17) % 21) - 10;
    return {
      x: wormX(worm.seed, t) * canvas.width,
      y: midY + yJitter,
    };
  }

  function drawAll(t: number): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const w of worms) {
      const { x, y } = computePos(w, t);
      drawWorm(ctx, x, y);
    }
  }

  function handleClick(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const elapsed = reducedMotion ? 0 : (performance.now() - startTime);

    for (const w of worms) {
      const { x, y } = computePos(w, elapsed);
      if (Math.abs(cx - x) < HIT_RADIUS_X && Math.abs(cy - y) < HIT_RADIUS_Y) {
        onAnecdote(w, e.clientX, e.clientY);
        return;
      }
    }
  }

  canvas.addEventListener('click', handleClick);

  if (reducedMotion) {
    drawAll(0);
    return () => canvas.removeEventListener('click', handleClick);
  }

  function frame(ts: number): void {
    if (!startTime) startTime = ts;
    drawAll(ts - startTime);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    canvas.removeEventListener('click', handleClick);
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm vitest run src/components/zones/Compost/worms.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/zones/Compost/worms.ts src/components/zones/Compost/worms.test.ts
git commit -m "feat: worm data model and pure canvas module with unit tests"
```

---

### Task 2: Strata.astro — static HTML and CSS

**Files:**
- Create: `src/components/zones/Compost/Strata.astro`

Build the visual shell: strata layer sections with soil-noise CSS backgrounds, a hidden SVG filter definition, and a canvas overlay element. No JavaScript in this task — just markup and styles.

**Layer data (define in frontmatter):**

```typescript
interface StrataLayer {
  id: string;
  era: string;
  title: string;
  location: string;
  body: string;
  depth: 0 | 1 | 2 | 3;
}

const layers: StrataLayer[] = [
  {
    id: 'current',
    era: '2020 –',
    title: 'Civic Tech Lead, Dark Matter Labs',
    location: 'Berlin',
    body: 'Building tools that help cities navigate the legal, ecological, and civic complexity of the 21st century. Projects include CircuLaw and TreesAI.',
    depth: 0,
  },
  {
    id: 'aalto',
    era: '2015 – 17',
    title: 'M.S. New Media Design, Aalto University',
    location: 'Helsinki',
    body: 'Where code became a design material. Intersection of design, technology, and social systems.',
    depth: 1,
  },
  {
    id: 'gatech',
    era: '2009 – 13',
    title: 'B.S. Computer Science, Georgia Tech',
    location: 'Atlanta',
    body: 'Fundamentals: algorithms, systems, the quiet joy of a program that actually does something.',
    depth: 2,
  },
  {
    id: 'origin',
    era: 'Origin',
    title: 'Delhi, India',
    location: '',
    body: 'Born and raised. Grew up between languages, between cultures, between the old city and the new.',
    depth: 3,
  },
];

const wormDefs = [
  { id: 'w0', layerDepth: 3, seed: 7,  anecdote: 'The mango tree in the backyard never stopped surprising me.' },
  { id: 'w1', layerDepth: 2, seed: 13, anecdote: 'First program that worked: a circle. Java. Beige monitor.' },
  { id: 'w2', layerDepth: 1, seed: 42, anecdote: 'Finnish silence taught me to listen before designing.' },
];
```

- [ ] **Step 1: Create `src/components/zones/Compost/Strata.astro`**

```astro
---
// src/components/zones/Compost/Strata.astro
interface StrataLayer {
  id: string;
  era: string;
  title: string;
  location: string;
  body: string;
  depth: 0 | 1 | 2 | 3;
}

const layers: StrataLayer[] = [
  {
    id: 'current',
    era: '2020 –',
    title: 'Civic Tech Lead, Dark Matter Labs',
    location: 'Berlin',
    body: 'Building tools that help cities navigate the legal, ecological, and civic complexity of the 21st century. Projects include CircuLaw and TreesAI.',
    depth: 0,
  },
  {
    id: 'aalto',
    era: '2015 – 17',
    title: 'M.S. New Media Design, Aalto University',
    location: 'Helsinki',
    body: 'Where code became a design material. Intersection of design, technology, and social systems.',
    depth: 1,
  },
  {
    id: 'gatech',
    era: '2009 – 13',
    title: 'B.S. Computer Science, Georgia Tech',
    location: 'Atlanta',
    body: 'Fundamentals: algorithms, systems, the quiet joy of a program that actually does something.',
    depth: 2,
  },
  {
    id: 'origin',
    era: 'Origin',
    title: 'Delhi, India',
    location: '',
    body: 'Born and raised. Grew up between languages, between cultures, between the old city and the new.',
    depth: 3,
  },
];

export interface WormDefPublic {
  id: string;
  layerDepth: number;
  seed: number;
  anecdote: string;
}

const wormDefs: WormDefPublic[] = [
  { id: 'w0', layerDepth: 3, seed: 7,  anecdote: 'The mango tree in the backyard never stopped surprising me.' },
  { id: 'w1', layerDepth: 2, seed: 13, anecdote: 'First program that worked: a circle. Java. Beige monitor.' },
  { id: 'w2', layerDepth: 1, seed: 42, anecdote: 'Finnish silence taught me to listen before designing.' },
];
---

<!-- Hidden SVG filter for soil noise texture -->
<svg
  aria-hidden="true"
  focusable="false"
  style="position:absolute;width:0;height:0;overflow:hidden"
>
  <defs>
    <filter
      id="soil-noise"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
      color-interpolation-filters="sRGB"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.85 0.65"
        numOctaves="4"
        stitchTiles="stitch"
        result="noise"
      />
      <feColorMatrix type="saturate" values="0" result="grayNoise" />
      <feComposite in="SourceGraphic" in2="grayNoise" operator="in" />
      <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
    </filter>
  </defs>
</svg>

<section
  class="strata-wrap"
  data-strata
  aria-label="Biographical strata — scroll to reveal"
>
  <!-- Canvas overlay for worms (absolute, pointer-events none initially) -->
  <canvas
    data-strata-canvas
    aria-hidden="true"
    class="strata-canvas"
  ></canvas>

  <!-- Strata layers -->
  {layers.map((layer) => (
    <div
      class={`strata-layer strata-layer--depth-${layer.depth}`}
      data-layer={layer.id}
      data-depth={layer.depth}
    >
      <div class="strata-inner">
        <span class="strata-era label">{layer.era}</span>
        <h2 class="strata-title">{layer.title}</h2>
        {layer.location && (
          <span class="strata-location label">{layer.location}</span>
        )}
        <p class="strata-body">{layer.body}</p>
      </div>
    </div>
  ))}

  <!-- Anecdote tooltip -->
  <div
    class="strata-anecdote"
    data-strata-anecdote
    role="dialog"
    aria-modal="false"
    aria-live="polite"
    aria-label="Worm anecdote"
    hidden
  >
    <p class="strata-anecdote-text" data-strata-anecdote-text></p>
    <button
      class="strata-anecdote-close label"
      data-strata-anecdote-close
      aria-label="Close anecdote"
    >×</button>
  </div>
</section>

<!-- Ship worm defs to client script -->
<script is:inline define:vars={{ wormDefs }}>
  window.__strataWormDefs = wormDefs;
</script>

<style>
  /* ── Container ── */
  .strata-wrap {
    position: relative;
    overflow: hidden;
  }

  /* ── Canvas overlay ── */
  .strata-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; /* script sets pointer-events: auto after mount */
    z-index: 2;
  }

  /* ── Layers ── */
  .strata-layer {
    position: relative;
    padding-block: var(--space-12);
    padding-inline: var(--space-10);
    border-bottom: 1px solid rgba(26, 26, 26, 0.12);
    /* Scroll reveal initial state — overridden by JS */
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0s, transform 0s;
  }

  /* ── Depth-based soil colours ── */
  .strata-layer--depth-0 {
    background-color: color-mix(in srgb, var(--c-paper) 82%, var(--c-soil) 18%);
    color: var(--ink);
  }
  .strata-layer--depth-1 {
    background-color: color-mix(in srgb, var(--c-paper) 58%, var(--c-soil) 42%);
    color: var(--ink);
  }
  .strata-layer--depth-2 {
    background-color: color-mix(in srgb, var(--c-paper) 30%, var(--c-soil) 70%);
    color: var(--c-paper);
  }
  .strata-layer--depth-3 {
    background-color: color-mix(in srgb, var(--c-soil) 88%, var(--c-ink) 12%);
    color: var(--c-paper);
  }

  /* Soil noise texture — pseudo-element overlay using the SVG filter */
  .strata-layer::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.08;
    background: currentColor;
    filter: url(#soil-noise);
  }

  .strata-inner {
    position: relative;
    z-index: 1;
    max-width: 560px;
  }

  .strata-era {
    display: block;
    margin-bottom: var(--space-2);
    opacity: 0.7;
  }

  .strata-title {
    font-size: var(--text-xl);
    font-style: italic;
    margin-bottom: var(--space-2);
  }

  .strata-location {
    display: block;
    margin-bottom: var(--space-4);
    opacity: 0.65;
  }

  .strata-body {
    font-size: var(--text-sm);
    line-height: 1.7;
    max-width: 48ch;
  }

  /* ── Anecdote tooltip ── */
  .strata-anecdote {
    position: fixed;
    z-index: 10;
    background: var(--c-paper);
    color: var(--ink);
    border: 1px solid var(--ink-faint);
    border-radius: 2px;
    padding: var(--space-4) var(--space-6);
    max-width: 260px;
    box-shadow: 0 4px 16px rgba(26, 26, 26, 0.15);
    font-size: var(--text-sm);
    line-height: 1.6;
  }

  .strata-anecdote[hidden] {
    display: none;
  }

  .strata-anecdote-text {
    margin: 0 0 var(--space-3) 0;
    font-style: italic;
  }

  .strata-anecdote-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: var(--text-sm);
    color: var(--ink-muted);
    line-height: 1;
  }

  .strata-anecdote-close:hover {
    color: var(--ink);
  }

  /* ── Reduced motion: skip transitions but keep structure ── */
  @media (prefers-reduced-motion: reduce) {
    .strata-layer {
      opacity: 1;
      transform: none;
    }
  }
</style>
```

- [ ] **Step 2: Confirm it compiles (no Astro build errors)**

```bash
pnpm astro check
```

Expected: 0 errors for `Strata.astro`.

- [ ] **Step 3: Commit**

```bash
git add src/components/zones/Compost/Strata.astro
git commit -m "feat: Strata hero piece — static HTML structure and soil CSS"
```

---

### Task 3: Strata scroll reveal + worm canvas integration

**Files:**
- Modify: `src/components/zones/Compost/Strata.astro` — add `<script>` block

Add the `<script type="module">` that:
1. Mounts scroll-reveal animations with Motion One (or IO fallback for reduced-motion)
2. Sizes the canvas to cover the strata container
3. Mounts the worm canvas via `worms.ts`
4. Shows/hides the anecdote tooltip
5. Cleans up fully on `astro:before-swap`

- [ ] **Step 1: Add the script block to `Strata.astro`**

Add this block just before the closing `</style>` tag (after the `<style>` block):

```astro
<script>
  import { animate, scroll } from 'motion';
  import { mount as mountWorms } from './worms';
  import type { WormDef } from './worms';

  type Cleanup = () => void;
  let cleanups: Cleanup[] = [];

  function mountStrata(): void {
    const wrap = document.querySelector<HTMLElement>('[data-strata]');
    if (!wrap) return;

    const canvas = wrap.querySelector<HTMLCanvasElement>('[data-strata-canvas]');
    const layerEls = [...wrap.querySelectorAll<HTMLElement>('[data-layer]')];
    const anecdoteEl = wrap.querySelector<HTMLElement>('[data-strata-anecdote]');
    const anecdoteText = wrap.querySelector<HTMLElement>('[data-strata-anecdote-text]');
    const anecdoteClose = wrap.querySelector<HTMLButtonElement>('[data-strata-anecdote-close]');
    if (!canvas || layerEls.length === 0) return;

    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Scroll reveal ──────────────────────────────────────────

    if (!rm) {
      // Layer 0: animate in on mount (no scroll required)
      const enterAnim = animate(
        layerEls[0],
        { opacity: [0, 1], transform: ['translateY(24px)', 'translateY(0)'] },
        { duration: 0.55, easing: 'ease-out' },
      );

      // Layers 1–3: scroll-driven reveal
      const scrollStops = layerEls.slice(1).map((el) =>
        scroll(
          animate(
            el,
            { opacity: [0, 1], transform: ['translateY(32px)', 'translateY(0)'] },
            { duration: 0.5 },
          ),
          { target: el, offset: ['start 90%', 'start 45%'] },
        ),
      );

      cleanups.push(() => {
        enterAnim.stop();
        scrollStops.forEach((stop) => stop());
      });
    } else {
      // Reduced motion: instant reveal via IntersectionObserver
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement;
              el.style.opacity = '1';
              el.style.transform = 'none';
              io.unobserve(el);
            }
          });
        },
        { threshold: 0.05 },
      );
      layerEls.forEach((el) => {
        el.style.opacity = '0';
        io.observe(el);
      });
      cleanups.push(() => io.disconnect());
    }

    // ── Canvas sizing ──────────────────────────────────────────

    function resizeCanvas(): void {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = wrap.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    resizeCanvas();

    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(wrap);
    cleanups.push(() => ro.disconnect());

    // ── Worm canvas ────────────────────────────────────────────

    function computeLayerMidpoints(): number[] {
      const wrapTop = wrap.getBoundingClientRect().top;
      return layerEls.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 - wrapTop;
      });
    }

    const wormDefs: WormDef[] = (window as Record<string, unknown>).__strataWormDefs as WormDef[] ?? [];

    // After canvas is sized, enable pointer-events so worms are clickable
    canvas.style.pointerEvents = 'auto';

    const wormCleanup = mountWorms(
      canvas,
      wormDefs,
      computeLayerMidpoints(),
      rm,
      (worm, clientX, clientY) => showAnecdote(worm.anecdote, clientX, clientY),
    );
    cleanups.push(wormCleanup);

    // ── Anecdote overlay ───────────────────────────────────────

    function showAnecdote(text: string, cx: number, cy: number): void {
      if (!anecdoteEl || !anecdoteText) return;
      anecdoteText.textContent = `"${text}"`;
      // Position near click, clamped to viewport
      const top = Math.min(cy + 12, window.innerHeight - 160);
      const left = Math.min(cx + 12, window.innerWidth - 280);
      anecdoteEl.style.top = `${top}px`;
      anecdoteEl.style.left = `${left}px`;
      anecdoteEl.hidden = false;
      anecdoteClose?.focus();
    }

    function hideAnecdote(): void {
      if (anecdoteEl) anecdoteEl.hidden = true;
    }

    anecdoteClose?.addEventListener('click', hideAnecdote);
    const escHandler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') hideAnecdote();
    };
    document.addEventListener('keydown', escHandler);

    // Close on outside click
    const outsideClickHandler = (e: MouseEvent): void => {
      if (anecdoteEl && !anecdoteEl.hidden && !anecdoteEl.contains(e.target as Node)) {
        hideAnecdote();
      }
    };
    document.addEventListener('click', outsideClickHandler, { capture: true });

    cleanups.push(() => {
      anecdoteClose?.removeEventListener('click', hideAnecdote);
      document.removeEventListener('keydown', escHandler);
      document.removeEventListener('click', outsideClickHandler, { capture: true });
    });
  }

  document.addEventListener('astro:page-load', () => {
    cleanups = [];
    mountStrata();
  });

  document.addEventListener('astro:before-swap', () => {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  });
</script>
```

- [ ] **Step 2: Build check**

```bash
pnpm astro check
```

Expected: 0 errors.

- [ ] **Step 3: Start dev server and manually verify**

```bash
pnpm dev
```

Visit `http://localhost:4321/compost` (will 404 until Task 5, but you can test the component in a temporary page). Skip this step if you prefer to verify in Task 5 after the page exists.

- [ ] **Step 4: Commit**

```bash
git add src/components/zones/Compost/Strata.astro
git commit -m "feat: Strata scroll reveal (Motion One) + worm canvas integration"
```

---

### Task 4: `/compost/index.astro` page

**Files:**
- Create: `src/pages/compost/index.astro`

The Compost zone page. Includes the Strata hero piece plus a brief bio paragraph and contact links (contact will move to `/hive` in Phase 6 — keep it here for now so the page is complete).

- [ ] **Step 1: Create `src/pages/compost/index.astro`**

```astro
---
import Garden from '@layouts/Garden.astro';
import Strata from '../../components/zones/Compost/Strata.astro';
---

<Garden
  title="The Compost — Gurden's Garden"
  description="The decomposing layers: origins, education, and current work."
>
  <div class="compost-wrap page-wrap">

    <header class="compost-header">
      <p class="label zone-emoji" aria-hidden="true">🪱</p>
      <h1>The Compost</h1>
      <p class="compost-intro">
        Civic Tech Lead at Dark Matter Labs, Berlin. Background in Computer Science
        (Georgia Tech) and New Media Design (Aalto University). Originally from Delhi.
      </p>
    </header>

    <div class="strata-section" aria-labelledby="strata-heading">
      <h2 id="strata-heading" class="label section-heading">Strata</h2>
      <Strata />
    </div>

    <section class="contact-section" aria-labelledby="contact-heading">
      <h2 id="contact-heading" class="label section-heading">Get in touch</h2>
      <ul class="contact-list" role="list">
        <li>
          <a href="mailto:gurden@darkmatterlabs.org" class="contact-link label">
            gurden@darkmatterlabs.org
          </a>
        </li>
        <li>
          <a
            href="https://www.linkedin.com/in/gurdenbatra"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link label"
          >
            LinkedIn <span aria-hidden="true">→</span>
          </a>
        </li>
        <li>
          <a
            href="https://github.com/gurden"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link label"
          >
            GitHub <span aria-hidden="true">→</span>
          </a>
        </li>
      </ul>
    </section>

  </div>
</Garden>

<style>
  .compost-wrap {
    padding-block: var(--space-16);
  }

  .compost-header {
    margin-bottom: var(--space-16);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .zone-emoji {
    font-size: var(--text-xl);
    margin-bottom: var(--space-3);
    display: block;
  }

  .compost-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .compost-intro {
    font-size: var(--text-md);
    line-height: 1.65;
    max-width: 560px;
  }

  .section-heading {
    display: block;
    margin-bottom: var(--space-8);
  }

  .strata-section {
    margin-bottom: var(--space-20);
  }

  /* ── Contact ── */
  .contact-section {
    margin-bottom: var(--space-16);
    padding-top: var(--space-12);
    border-top: 1px solid var(--ink-faint);
  }

  .contact-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .contact-link {
    color: var(--ink);
    text-decoration: none;
    transition: color var(--duration-fast) var(--easing);
  }

  .contact-link:hover {
    color: var(--ink-muted);
  }
</style>
```

- [ ] **Step 2: Start dev server and verify the page loads**

```bash
pnpm dev
```

Navigate to `http://localhost:4321/compost`.

Expected:
- Page loads without 404
- "The Compost" heading visible
- Strata layers visible (depth-0 surface layer fades in, deeper layers reveal on scroll)
- Canvas canvas element present (worms animate after scroll to their layer)
- No JS errors in the console

- [ ] **Step 3: Check Astro types**

```bash
pnpm astro check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/compost/index.astro
git commit -m "feat: /compost route with Strata hero piece and bio content"
```

---

### Task 5: Route migration — `/about` → `/compost`

**Files:**
- Modify: `astro.config.mjs` — add `/about` redirect
- Modify: `src/lib/zones.ts` — compost href
- Delete: `src/pages/about.astro`
- Modify: `lighthouserc.json` — swap `/about` for `/compost`
- Modify: `e2e/pages.spec.ts` — update About tests
- Modify: `e2e/accessibility.spec.ts` — update three `a[href="/about"]` refs

- [ ] **Step 1: Add `/about` redirect in `astro.config.mjs`**

Open `astro.config.mjs`. In the `redirects` object add:

```diff
  redirects: {
    '/work': '/polyculture',
    '/work/[slug]': '/polyculture/[slug]',
+   '/about': '/compost',
  },
```

Full file after edit:
```javascript
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  site: 'https://gurden.xyz',
  redirects: {
    '/work': '/polyculture',
    '/work/[slug]': '/polyculture/[slug]',
    '/about': '/compost',
  },
});
```

- [ ] **Step 2: Update compost href in `src/lib/zones.ts`**

Change line:
```diff
-  href: '/about',
+  href: '/compost',
```

The full compost zone entry after the edit:
```typescript
{
  id: 'compost',
  emoji: '🪱',
  name: 'The Compost',
  shortDesc: 'Story',
  longDesc: 'Story & origins',
  href: '/compost',
},
```

- [ ] **Step 3: Delete `src/pages/about.astro`**

```bash
rm src/pages/about.astro
```

- [ ] **Step 4: Update `lighthouserc.json`**

Replace the `/about` URL entry with `/compost`:

```diff
-       "http://localhost:4321/about",
+       "http://localhost:4321/compost",
```

Full updated `"url"` array:
```json
"url": [
  "http://localhost:4321/",
  "http://localhost:4321/polyculture",
  "http://localhost:4321/compost",
  "http://localhost:4321/colophon"
]
```

- [ ] **Step 5: Update `e2e/pages.spec.ts`**

Replace the entire `About page` describe block:

```typescript
test.describe('About → Compost redirect', () => {
  test('/about redirects to /compost', async ({ page }) => {
    const r = await page.goto('/about');
    expect(page.url()).toContain('/compost');
  });
});

test.describe('Compost page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/compost');
    expect(r?.status()).toBe(200);
  });

  test('shows name and intro text', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByText(/Gurden/i).first()).toBeVisible();
    await expect(page.getByText(/Dark Matter Labs/i).first()).toBeVisible();
  });

  test('shows strata layers with biographical content', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByText(/Georgia Tech/i).first()).toBeVisible();
    await expect(page.getByText(/Aalto/i).first()).toBeVisible();
    await expect(page.getByText(/Delhi/i).first()).toBeVisible();
  });

  test('shows contact email', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByRole('link', { name: /gurden@darkmatterlabs/i })).toBeVisible();
  });
});
```

Keep the `Colophon page` describe block unchanged.

- [ ] **Step 6: Update `e2e/accessibility.spec.ts`**

There are three occurrences of `a[href="/about"]` in `accessibility.spec.ts`. Replace all three with `a[href="/compost"]`:

Line 77:
```diff
-    await expect(nav.locator('a[href="/about"]')).not.toBeAttached();
+    await expect(nav.locator('a[href="/compost"]')).not.toBeAttached();
```

Line 84:
```diff
-    await expect(overlay.locator('a[href="/about"]')).toBeAttached();
+    await expect(overlay.locator('a[href="/compost"]')).toBeAttached();
```

Line 123:
```diff
-    await expect(overlay.locator('a[href="/about"]')).toBeAttached();
+    await expect(overlay.locator('a[href="/compost"]')).toBeAttached();
```

- [ ] **Step 7: Run full Vitest suite**

```bash
pnpm vitest run
```

Expected: all tests PASS (no references to `/about` remain in source).

- [ ] **Step 8: Build and run E2E redirect tests**

```bash
pnpm build && pnpm playwright test e2e/pages.spec.ts --reporter=line
```

Expected:
- `About → Compost redirect / /about redirects to /compost` — PASS
- `Compost page / loads with 200` — PASS
- `Compost page / shows strata layers with biographical content` — PASS

- [ ] **Step 9: Commit**

```bash
git add astro.config.mjs src/lib/zones.ts lighthouserc.json e2e/pages.spec.ts e2e/accessibility.spec.ts
git commit -m "feat: redirect /about → /compost; retire about.astro; update zone link + tests"
```

---

### Task 6: E2E tests — Compost zone

**Files:**
- Create: `e2e/compost.spec.ts`

Full E2E coverage for the Compost zone: page structure, Strata canvas, scroll reveal behaviour, reduced-motion variant, worm interactivity, keyboard nav, and axe accessibility.

- [ ] **Step 1: Create `e2e/compost.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Compost page — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByRole('heading', { name: /The Compost/i })).toBeVisible();
  });

  test('shows intro bio text', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByText(/Dark Matter Labs/i).first()).toBeVisible();
  });

  test('strata section has 4 layers in DOM', async ({ page }) => {
    await page.goto('/compost');
    const layers = page.locator('[data-layer]');
    await expect(layers).toHaveCount(4);
  });

  test('shows deepest layer content (Delhi)', async ({ page }) => {
    await page.goto('/compost');
    // scroll to bottom to trigger reveal
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText(/Delhi/i)).toBeVisible();
  });

  test('shows contact email link', async ({ page }) => {
    await page.goto('/compost');
    await expect(page.getByRole('link', { name: /gurden@darkmatterlabs/i })).toBeVisible();
  });
});

test.describe('Compost page — Strata canvas', () => {
  test('strata canvas element is in DOM', async ({ page }) => {
    await page.goto('/compost');
    const canvas = page.locator('[data-strata-canvas]');
    await expect(canvas).toBeAttached();
  });

  test('canvas has non-zero dimensions after mount', async ({ page }) => {
    await page.goto('/compost');
    const canvas = page.locator('[data-strata-canvas]');
    await expect(canvas).toBeVisible();
    const bbox = await canvas.boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });
});

test.describe('Compost page — scroll reveal', () => {
  test('surface layer (depth-0) is visible on load without scrolling', async ({ page }) => {
    await page.goto('/compost');
    const surfaceLayer = page.locator('[data-layer="current"]');
    await expect(surfaceLayer).toBeVisible();
    // Check opacity is 1 (not hidden in initial CSS state)
    const opacity = await surfaceLayer.evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0.9);
  });

  test('deeper layers are initially hidden (opacity ~0)', async ({ page }) => {
    await page.goto('/compost');
    // Check origin layer (depth-3) before scrolling
    const deepLayer = page.locator('[data-layer="origin"]');
    await expect(deepLayer).toBeAttached();
    const opacity = await deepLayer.evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.5);
  });

  test('deep layer reveals after scrolling to it', async ({ page }) => {
    await page.goto('/compost');
    // Scroll to the deep layer
    await page.locator('[data-layer="origin"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600); // allow animation to complete
    const opacity = await page.locator('[data-layer="origin"]').evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0.9);
  });
});

test.describe('Compost page — reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('all layers are immediately visible with reduced motion', async ({ page }) => {
    await page.goto('/compost');
    for (const id of ['current', 'aalto', 'gatech', 'origin']) {
      const opacity = await page.locator(`[data-layer="${id}"]`).evaluate(
        (el) => getComputedStyle(el).opacity,
      );
      expect(parseFloat(opacity)).toBeGreaterThan(0.9);
    }
  });

  test('canvas is present and static in reduced-motion mode', async ({ page }) => {
    await page.goto('/compost');
    const canvas = page.locator('[data-strata-canvas]');
    await expect(canvas).toBeAttached();
    // Take two screenshots 300ms apart — canvas data URL should be identical
    const url1 = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-strata-canvas]');
      return c?.toDataURL() ?? '';
    });
    await page.waitForTimeout(300);
    const url2 = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-strata-canvas]');
      return c?.toDataURL() ?? '';
    });
    expect(url1).toBe(url2);
  });
});

test.describe('Compost page — keyboard navigation', () => {
  test('contact links are keyboard-reachable', async ({ page }) => {
    await page.goto('/compost');
    const email = page.getByRole('link', { name: /gurden@darkmatterlabs/i });
    await email.focus();
    await expect(email).toBeFocused();
  });
});

test.describe('Compost page — map navigation', () => {
  test('can navigate to /compost from map overlay', async ({ page }) => {
    await page.goto('/');
    // Open map overlay
    await page.getByRole('button', { name: /map/i }).click();
    const compostLink = page.locator('[data-overlay-zone="compost"] a, a[href="/compost"]').first();
    await expect(compostLink).toBeVisible();
    await compostLink.click();
    await page.waitForURL(/\/compost$/);
    await expect(page.getByRole('heading', { name: /The Compost/i })).toBeVisible();
  });
});

test.describe('Compost page — accessibility', () => {
  test('zero axe violations', async ({ page }) => {
    await page.goto('/compost');
    // Scroll to reveal all layers before auditing
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the new tests**

```bash
pnpm build && pnpm playwright test e2e/compost.spec.ts --reporter=line
```

Expected: all tests PASS. If any test fails, fix the root cause in `Strata.astro` or `compost/index.astro` before proceeding.

Common issues to watch for:
- **"surface layer opacity < 0.9"**: The layer 0 entrance animation may not have fired yet. Ensure `astro:page-load` fires before the test assertion, or add a `waitForTimeout(700)`.
- **"can't find map overlay compost link"**: Check `MapOverlay.astro` uses `href` from `zones.ts` — the `href: '/compost'` update from Task 5 should propagate automatically. Verify the locator selector matches the actual DOM structure.
- **Axe contrast violation on deep layers**: Layer depth-2 (terracotta/paper mix) may fail contrast check. If so, adjust the `color-mix` percentage so the text color (`--c-paper`) has a 4.5:1 ratio against the background. Try `color-mix(in srgb, var(--c-paper) 25%, var(--c-soil) 75%)` for depth-2 and re-check.

- [ ] **Step 3: Run full E2E suite to check for regressions**

```bash
pnpm playwright test --reporter=line
```

Expected: all previously-passing tests continue to PASS.

- [ ] **Step 4: Commit**

```bash
git add e2e/compost.spec.ts
git commit -m "test: E2E + axe coverage for /compost zone"
```

---

### Task 7: Final sweep — Lighthouse CI + full test verification

**Files:**
- No new files; verify existing config and run audits

Confirm the `/compost` page meets all performance and accessibility budgets.

- [ ] **Step 1: Kill any stale dev servers**

```bash
lsof -ti :4321 | xargs kill -9 2>/dev/null || true
lsof -ti :4322 | xargs kill -9 2>/dev/null || true
```

- [ ] **Step 2: Build the site**

```bash
pnpm build
```

Expected: build succeeds with no TypeScript or Astro errors.

- [ ] **Step 3: Run Lighthouse CI**

```bash
pnpm lhci autorun
```

Expected: all four URLs pass their budgets:
- Performance ≥ 0.9
- Accessibility = 1.0
- LCP < 2500ms
- TBT < 200ms
- JS bundle < 80kb
- CSS bundle < 30kb

If `/compost` fails:
- **LCP over budget**: The soil noise filter or canvas may delay rendering. Ensure the Strata canvas is `position: absolute` and doesn't affect layout paint. The `::before` pseudo-element with `filter: url(#soil-noise)` should not block LCP if the text content renders first. If it does block, move the `::before` to `will-change: filter` so it's promoted to its own layer.
- **JS over budget**: The `motion` library adds ~4kb gzipped. Verify the import is only included on the compost page. If Motion One is somehow leaking to the home page, audit the bundle with `pnpm build -- --reporter verbose`.
- **Accessibility < 1.0**: Run axe again after the full build — `pnpm build && pnpm playwright test e2e/compost.spec.ts -g "axe"`.

- [ ] **Step 4: Run full test suite (Vitest + Playwright)**

```bash
pnpm vitest run && pnpm playwright test --reporter=line
```

Expected: 100% pass. Note the new totals (should be ~52+ Vitest, ~122+ Playwright).

- [ ] **Step 5: Update design spec status**

Edit `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md` line 4:

```diff
-**Status:** Phase 3 (Polyculture) complete; Phase 4 (Compost) next
+**Status:** Phase 4 (Compost) complete; Phase 5 (Beds) next
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-05-25-gurdens-garden-design.md
git commit -m "docs: mark Phase 4 (Compost) complete with Lighthouse + axe coverage"
```
