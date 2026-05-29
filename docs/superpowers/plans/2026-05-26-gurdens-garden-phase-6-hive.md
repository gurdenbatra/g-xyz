# The Hive — Phase 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/hive` with the Live Flock canvas piece — a Perlin flow-field bee flock with flowers representing "now" items and contact methods, plus an accessible HTML list.

**Architecture:** A `flock.ts` pure module handles the simulation (layout, creation, stepping). `LiveFlock.astro` reads `now/index.mdx` frontmatter, renders a canvas + accessible list + positioned hover card, and mounts the simulation using Astro's `astro:page-load` / `astro:before-swap` lifecycle events. No new packages needed; `noise2D` from `src/lib/noise.ts` provides the flow-field.

**Tech Stack:** Canvas 2D, Astro 5 content collections (Zod), `src/lib/noise.ts` (already exists), Vitest, Playwright/axe.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/content/schemas.ts` | Modify | Add `nowSchema` |
| `src/content/schemas.test.ts` | Modify | Add `nowSchema` unit tests |
| `src/content/config.ts` | Modify | Register `now` collection |
| `src/content/now/index.mdx` | Create | Seed content — carrying, reading, contact |
| `src/components/zones/Hive/flock.ts` | Create | Pure simulation: `RawFlower`, `FlowerDef`, `FlockBee`, `layoutFlowers`, `createFlock`, `stepFlock` |
| `src/components/zones/Hive/flock.test.ts` | Create | Vitest unit tests (runs in jsdom per existing vitest.config.ts glob) |
| `src/components/zones/Hive/LiveFlock.astro` | Create | Canvas + positioned hover card + accessible list; mounts flock animation |
| `src/pages/hive/index.astro` | Create | `/hive` route using Garden layout |
| `src/lib/zones.ts` | Modify | `hive.href: null → '/hive'` |
| `lighthouserc.json` | Modify | Add `http://localhost:4321/hive` |
| `e2e/hive.spec.ts` | Create | Playwright E2E + axe tests |
| `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md` | Modify | Status → Phase 6 complete |

---

## Codebase context

The project is an Astro 5 static site. Key patterns:

- **Layouts:** `src/layouts/Garden.astro` — accepts `title` and `description` props
- **Path alias:** `@layouts/Garden.astro` (configured in tsconfig)
- **CSS tokens:** `src/styles/tokens.css` — `--c-moss: #5A7A4A`, `--c-ochre: #D9A857`, `--c-soil: #8A4F2E`, `--c-chartreuse: #C4D670`, `--c-ink: #1A1A1A`, `--c-paper: #F1E8D0`, `--ink-faint`, `--ground`, spacing `--space-*`, text `--text-*`, motion `--duration-*`, `--easing`
- **Noise:** `src/lib/noise.ts` exports `noise2D(x, y): number` — deterministic 2D value noise in `[-1, 1]`
- **Canvas DPR pattern:** `canvas.width = Math.round(rect.width * dpr); ctx.setTransform(dpr,0,0,dpr,0,0)` → draw in CSS pixels
- **Astro lifecycle:** mount on `astro:page-load`, cleanup on `astro:before-swap`
- **Data to client:** `<script is:inline define:vars={{ data }}>` → `window.__xxx = data`
- **Zone page pattern:** see `src/pages/beds/index.astro` or `src/pages/compost/index.astro`
- **Content collections:** `src/content/config.ts` + `src/content/schemas.ts` + Zod; use `getEntry('now', 'index')` to read singleton
- **Test runner:** `pnpm test` (Vitest); `pnpm test:e2e` (Playwright)
- **Type check + build:** `pnpm astro check && pnpm build`

---

### Task 1: `now` content schema + seed content

**Files:**
- Modify: `src/content/schemas.ts`
- Modify: `src/content/schemas.test.ts`
- Modify: `src/content/config.ts`
- Create: `src/content/now/index.mdx`

---

- [ ] **Step 1: Add `nowSchema` tests (TDD — write tests first)**

Append to `src/content/schemas.test.ts`:

```typescript
import { nowSchema } from './schemas';

describe('nowSchema', () => {
  const valid = {
    carrying: [{ label: 'Work', detail: 'Civic tech in Berlin' }],
    reading:  [{ label: 'A Book', detail: 'Author — subtitle' }],
    contact:  [{ label: 'Email', url: 'mailto:test@example.com', detail: 'test@example.com' }],
  };

  it('accepts valid now frontmatter', () => {
    expect(nowSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts contact without optional detail', () => {
    const data = {
      ...valid,
      contact: [{ label: 'GitHub', url: 'https://github.com/user' }],
    };
    expect(nowSchema.safeParse(data).success).toBe(true);
  });

  it('rejects missing carrying field', () => {
    const { carrying: _c, ...rest } = valid;
    expect(nowSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty url string', () => {
    const data = { ...valid, contact: [{ label: 'Email', url: '' }] };
    expect(nowSchema.safeParse(data).success).toBe(false);
  });

  it('accepts mailto: url (not filtered out by .url())', () => {
    const data = {
      ...valid,
      contact: [{ label: 'Email', url: 'mailto:a@b.com', detail: 'a@b.com' }],
    };
    expect(nowSchema.safeParse(data).success).toBe(true);
  });
});
```

Note: `nowSchema` does not yet exist — this test file import will fail until Step 3.

- [ ] **Step 2: Run the new tests — expect FAIL**

```bash
pnpm test src/content/schemas.test.ts
```

Expected: FAIL — `nowSchema` is not exported from `./schemas`.

- [ ] **Step 3: Add `nowSchema` to `src/content/schemas.ts`**

Append to the end of `src/content/schemas.ts`:

```typescript
export const nowSchema = z.object({
  carrying: z.array(z.object({ label: z.string(), detail: z.string() })),
  reading:  z.array(z.object({ label: z.string(), detail: z.string() })),
  contact:  z.array(z.object({
    label:  z.string(),
    url:    z.string().min(1),
    detail: z.string().optional(),
  })),
});
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/content/schemas.test.ts
```

Expected: All `nowSchema` tests PASS. All prior schema tests still PASS.

- [ ] **Step 5: Register the `now` collection in `src/content/config.ts`**

Change the import line from:
```typescript
import { projectSchema, poemSchema, artSchema } from './schemas';
```
To:
```typescript
import { projectSchema, poemSchema, artSchema, nowSchema } from './schemas';
```

Add to the `collections` object:
```typescript
  now: defineCollection({ type: 'content', schema: nowSchema }),
```

Full updated `src/content/config.ts`:
```typescript
import { defineCollection, z } from 'astro:content';
import { projectSchema, poemSchema, artSchema, nowSchema } from './schemas';

export const collections = {
  projects: defineCollection({ type: 'content', schema: projectSchema }),
  poems:    defineCollection({ type: 'content', schema: poemSchema }),
  art:      defineCollection({ type: 'content', schema: artSchema }),
  now:      defineCollection({ type: 'content', schema: nowSchema }),
};
```

- [ ] **Step 6: Create `src/content/now/index.mdx`** (create the `now/` directory first)

```mdx
---
carrying:
  - label: "Civic Tech @ DML"
    detail: "Systems change through civic technology in Berlin"
  - label: "AI + democracy"
    detail: "Exploring how language models change public deliberation"
reading:
  - label: "The Dawn of Everything"
    detail: "Graeber & Wengrow — reconsidering human prehistory"
  - label: "Seeing Like a State"
    detail: "James Scott — on legibility and state simplification"
contact:
  - label: "Email"
    url: "mailto:gurden@darkmatterlabs.org"
    detail: "gurden@darkmatterlabs.org"
  - label: "LinkedIn"
    url: "https://www.linkedin.com/in/gurdenbatra"
    detail: "LinkedIn ↗"
  - label: "GitHub"
    url: "https://github.com/gurden"
    detail: "github.com/gurden"
---

What I'm carrying, reading, and how to reach me.
Updated ~weekly. Each entry becomes a flower in the Hive.
```

- [ ] **Step 7: Verify Astro type-checks cleanly**

```bash
pnpm astro check
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 8: Commit**

```bash
git add src/content/schemas.ts src/content/schemas.test.ts src/content/config.ts src/content/now/index.mdx
git commit -m "feat: now content schema and seed data for Hive zone"
```

---

### Task 2: Flock simulation module (TDD)

**Files:**
- Create: `src/components/zones/Hive/flock.test.ts`
- Create: `src/components/zones/Hive/flock.ts`

The vitest config already applies `jsdom` environment to `src/components/zones/**/*.test.ts`. `flock.ts` is pure (no DOM), but running in jsdom doesn't break it.

---

- [ ] **Step 1: Create the test file first**

Create `src/components/zones/Hive/flock.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createFlock, layoutFlowers, stepFlock } from './flock';
import type { RawFlower, FlockBee } from './flock';

const rawFlowers: RawFlower[] = [
  { id: 'carrying-0', label: 'Civic Tech', kind: 'carrying', detail: 'Berlin' },
  { id: 'contact-0',  label: 'Email',      kind: 'contact',  detail: 'a@b.com', url: 'mailto:a@b.com' },
  { id: 'reading-0',  label: 'A Book',     kind: 'reading',  detail: 'Some author' },
];

const W = 400;
const H = 300;

describe('layoutFlowers', () => {
  it('returns same count as input', () => {
    expect(layoutFlowers(rawFlowers, W, H)).toHaveLength(rawFlowers.length);
  });

  it('places flowers with x in [0.1, 0.9]', () => {
    for (const f of layoutFlowers(rawFlowers, W, H)) {
      expect(f.x).toBeGreaterThanOrEqual(0.1);
      expect(f.x).toBeLessThanOrEqual(0.9);
    }
  });

  it('places flowers with y in [0.1, 0.9]', () => {
    for (const f of layoutFlowers(rawFlowers, W, H)) {
      expect(f.y).toBeGreaterThanOrEqual(0.1);
      expect(f.y).toBeLessThanOrEqual(0.9);
    }
  });

  it('is deterministic', () => {
    const a = layoutFlowers(rawFlowers, W, H);
    const b = layoutFlowers(rawFlowers, W, H);
    expect(a.map((f) => f.x)).toEqual(b.map((f) => f.x));
    expect(a.map((f) => f.y)).toEqual(b.map((f) => f.y));
  });

  it('returns [] for empty input', () => {
    expect(layoutFlowers([], W, H)).toHaveLength(0);
  });

  it('preserves flower ids and labels', () => {
    const flowers = layoutFlowers(rawFlowers, W, H);
    expect(flowers[0].id).toBe('carrying-0');
    expect(flowers[1].label).toBe('Email');
  });
});

describe('createFlock', () => {
  it('returns the requested count', () => {
    expect(createFlock(10, W, H, 42)).toHaveLength(10);
  });

  it('places bees within canvas bounds', () => {
    for (const b of createFlock(20, W, H, 7)) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(W);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(H);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = createFlock(5, W, H, 99);
    const b = createFlock(5, W, H, 99);
    expect(a.map((bee) => bee.x)).toEqual(b.map((bee) => bee.x));
  });

  it('produces different positions for different seeds', () => {
    const a = createFlock(5, W, H, 1);
    const b = createFlock(5, W, H, 2);
    expect(a[0].x).not.toBe(b[0].x);
  });

  it('assigns unique ids starting at 0', () => {
    const bees = createFlock(5, W, H, 42);
    expect(bees.map((b) => b.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it('initializes targetFlower and pollenFlower to null', () => {
    for (const b of createFlock(3, W, H, 1)) {
      expect(b.targetFlower).toBeNull();
      expect(b.pollenFlower).toBeNull();
    }
  });
});

describe('stepFlock', () => {
  const flowers = layoutFlowers(rawFlowers, W, H);
  const bees = createFlock(5, W, H, 42);

  it('returns the same count', () => {
    expect(stepFlock(bees, flowers, W, H, 0, null)).toHaveLength(bees.length);
  });

  it('does not mutate the input bees', () => {
    const origX = bees[0].x;
    const origY = bees[0].y;
    stepFlock(bees, flowers, W, H, 100, null);
    expect(bees[0].x).toBe(origX);
    expect(bees[0].y).toBe(origY);
  });

  it('bees move over many steps (flow field active)', () => {
    let current = bees;
    for (let i = 0; i < 30; i++) {
      current = stepFlock(current, flowers, W, H, i * 16, null);
    }
    const moved = current.filter(
      (b, i) => Math.abs(b.x - bees[i].x) > 1 || Math.abs(b.y - bees[i].y) > 1,
    );
    expect(moved.length).toBeGreaterThan(0);
  });

  it('assigns hoveredFlower as targetFlower for all bees', () => {
    const next = stepFlock(bees, flowers, W, H, 0, 0);
    for (const b of next) {
      expect(b.targetFlower).toBe(0);
    }
  });

  it('clears targetFlower when hoveredFlower is null', () => {
    const withTarget = bees.map((b) => ({ ...b, targetFlower: 1 }));
    const next = stepFlock(withTarget, flowers, W, H, 0, null);
    for (const b of next) {
      expect(b.targetFlower).toBeNull();
    }
  });

  it('bees steer toward hovered flower over 60 steps', () => {
    // Flower 0: phyllotaxis at index 0 → x ≈ 0.585, y ≈ 0.5 → (234, 150) in 400×300
    const flower = flowers[0];
    const flowerX = flower.x * W;
    const flowerY = flower.y * H;
    const startBees: FlockBee[] = [
      { id: 0, x: 350, y: 250, vx: 0, vy: 0, targetFlower: null, pollenFlower: null },
    ];
    const distBefore = Math.sqrt((350 - flowerX) ** 2 + (250 - flowerY) ** 2);
    let current = startBees;
    for (let i = 0; i < 60; i++) {
      current = stepFlock(current, flowers, W, H, i * 16, 0);
    }
    const distAfter = Math.sqrt((current[0].x - flowerX) ** 2 + (current[0].y - flowerY) ** 2);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('positions remain finite after 100 steps', () => {
    let current = bees;
    for (let i = 0; i < 100; i++) {
      current = stepFlock(current, flowers, W, H, i * 16, null);
    }
    for (const b of current) {
      expect(Number.isFinite(b.x)).toBe(true);
      expect(Number.isFinite(b.y)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
pnpm test src/components/zones/Hive/flock.test.ts
```

Expected: FAIL — cannot find module `'./flock'`.

- [ ] **Step 3: Create `src/components/zones/Hive/flock.ts`**

```typescript
// src/components/zones/Hive/flock.ts
// Pure bee flock simulation for the Live Flock canvas piece.
// No DOM dependencies. Deterministic for a given seed + time.

import { noise2D } from '../../../lib/noise';

export interface RawFlower {
  id: string;
  label: string;
  kind: 'carrying' | 'reading' | 'contact';
  detail: string;
  url?: string;
}

export interface FlowerDef extends RawFlower {
  x: number; // 0–1 (fraction of canvas CSS width)
  y: number; // 0–1 (fraction of canvas CSS height)
}

export interface FlockBee {
  id: number;
  x: number;  // canvas CSS pixels
  y: number;
  vx: number;
  vy: number;
  targetFlower: number | null; // flower index; null = free roaming
  pollenFlower: number | null; // carrying pollen from this flower index
}

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_SPEED    = 1.5;  // px per frame
const MAX_FORCE    = 0.12; // px per frame²
const ARRIVE_R     = 30;   // px — slow down within this radius of target
const POLLEN_R     = 20;   // px — pick up / deliver pollen within this radius
const FLOW_SCALE   = 0.004; // spatial scale of noise flow field
const FLOW_SPEED   = 0.0001; // temporal evolution of flow field
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.399 rad (137.5°)

// ── Helpers ──────────────────────────────────────────────────────────────────

/** LCG hash for deterministic seeding */
function lcg(n: number): number {
  return ((n * 1664525 + 1013904223) & 0xffffffff) >>> 0;
}

function clampMag(vx: number, vy: number, max: number): [number, number] {
  const mag = Math.sqrt(vx * vx + vy * vy);
  if (mag < 0.001 || mag <= max) return [vx, vy];
  return [(vx / mag) * max, (vy / mag) * max];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Deterministically places flowers using a sunflower phyllotaxis layout.
 * Positions are normalized to [0.1, 0.9] × [0.15, 0.85].
 */
export function layoutFlowers(rawFlowers: RawFlower[], _w: number, _h: number): FlowerDef[] {
  const count = rawFlowers.length;
  if (count === 0) return [];
  return rawFlowers.map((raw, i) => {
    const r     = 0.32 * Math.sqrt((i + 0.5) / count);
    const angle = i * GOLDEN_ANGLE;
    const x = Math.max(0.1, Math.min(0.9,  0.5 + r * Math.cos(angle)));
    const y = Math.max(0.15, Math.min(0.85, 0.5 + r * Math.sin(angle)));
    return { ...raw, x, y };
  });
}

/**
 * Creates a flock of `count` bees with deterministic positions/velocities.
 */
export function createFlock(count: number, w: number, h: number, seed: number): FlockBee[] {
  const bees: FlockBee[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = lcg(s); const x  = (s / 0xffffffff) * w;
    s = lcg(s); const y  = (s / 0xffffffff) * h;
    s = lcg(s); const vx = ((s / 0xffffffff) * 2 - 1) * MAX_SPEED * 0.5;
    s = lcg(s); const vy = ((s / 0xffffffff) * 2 - 1) * MAX_SPEED * 0.5;
    bees.push({ id: i, x, y, vx, vy, targetFlower: null, pollenFlower: null });
  }
  return bees;
}

/**
 * Pure simulation step — returns a NEW array of bees.
 * hoveredFlower: index of the flower being hovered (null = free roam).
 * t: elapsed ms since mount.
 */
export function stepFlock(
  bees: FlockBee[],
  flowers: FlowerDef[],
  w: number,
  h: number,
  t: number,
  hoveredFlower: number | null,
): FlockBee[] {
  return bees.map((bee) => {
    let { x, y, vx, vy, pollenFlower } = bee;

    // Target = hovered flower (or null = free roam). Simple: all bees
    // immediately target on hover, immediately release on leave.
    const newTarget = hoveredFlower;

    let fx = 0;
    let fy = 0;

    if (newTarget !== null && newTarget < flowers.length) {
      // ── Steering toward flower ──────────────────────────────────────────
      const flower = flowers[newTarget];
      const tx   = flower.x * w;
      const ty   = flower.y * h;
      const dx   = tx - x;
      const dy   = ty - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        const speed    = dist < ARRIVE_R ? (dist / ARRIVE_R) * MAX_SPEED : MAX_SPEED;
        const desiredX = (dx / dist) * speed;
        const desiredY = (dy / dist) * speed;
        fx = desiredX - vx;
        fy = desiredY - vy;
      }

      // Pollen pickup / delivery
      let newPollen = pollenFlower;
      if (dist < POLLEN_R) {
        if (pollenFlower === null) {
          newPollen = newTarget;            // pick up pollen
        } else if (pollenFlower !== newTarget) {
          newPollen = null;                 // deliver pollen
        }
      }
      pollenFlower = newPollen;
    } else {
      // ── Free roaming — Perlin flow field ──────────────────────────────
      const angle = noise2D(x * FLOW_SCALE + t * FLOW_SPEED, y * FLOW_SCALE) * Math.PI * 2;
      fx = Math.cos(angle) * 0.05;
      fy = Math.sin(angle) * 0.05;
    }

    // Apply force (clamped) → integrate velocity (clamped) → integrate position
    const [cfx, cfy] = clampMag(fx, fy, MAX_FORCE);
    vx += cfx;
    vy += cfy;
    const [nvx, nvy] = clampMag(vx, vy, MAX_SPEED);
    vx = nvx;
    vy = nvy;
    x += vx;
    y += vy;

    // Wrap edges with a 20px margin so bees re-enter smoothly
    const M = 20;
    if (x < -M)    x += w + M * 2;
    else if (x > w + M) x -= w + M * 2;
    if (y < -M)    y += h + M * 2;
    else if (y > h + M) y -= h + M * 2;

    return { ...bee, x, y, vx, vy, targetFlower: newTarget, pollenFlower };
  });
}
```

- [ ] **Step 4: Run tests — expect all PASS**

```bash
pnpm test src/components/zones/Hive/flock.test.ts
```

Expected output:
```
✓ src/components/zones/Hive/flock.test.ts (18 tests)
  ✓ layoutFlowers (6)
  ✓ createFlock (6)
  ✓ stepFlock (6)
```

- [ ] **Step 5: Run the full test suite — expect no regressions**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/zones/Hive/flock.ts src/components/zones/Hive/flock.test.ts
git commit -m "feat: flock simulation module for Live Flock canvas piece"
```

---

### Task 3: LiveFlock.astro canvas component

**Files:**
- Create: `src/components/zones/Hive/LiveFlock.astro`

No new unit tests — the canvas rendering code is covered by E2E in Task 5. The pure simulation is already tested in Task 2.

---

- [ ] **Step 1: Create `src/components/zones/Hive/LiveFlock.astro`**

```astro
---
// src/components/zones/Hive/LiveFlock.astro
import { getEntry } from 'astro:content';
import type { RawFlower } from './flock';

const nowEntry = await getEntry('now', 'index');
if (!nowEntry) throw new Error('src/content/now/index.mdx not found');

const { carrying, reading, contact } = nowEntry.data;

const rawFlowers: RawFlower[] = [
  ...carrying.map((item, i) => ({
    id: `carrying-${i}`,
    label: item.label,
    kind: 'carrying' as const,
    detail: item.detail,
  })),
  ...reading.map((item, i) => ({
    id: `reading-${i}`,
    label: item.label,
    kind: 'reading' as const,
    detail: item.detail,
  })),
  ...contact.map((item, i) => ({
    id: `contact-${i}`,
    label: item.label,
    kind: 'contact' as const,
    detail: item.detail ?? item.label,
    url: item.url,
  })),
];
---

<div class="live-flock-wrap" data-live-flock-wrap>
  <canvas
    data-live-flock
    class="live-flock-canvas"
    aria-label="An animated field of flowers representing current work, reading, and contact. The list below is the keyboard-navigable equivalent."
  ></canvas>
  <!-- Hover card — purely visual, aria-hidden; screen readers use the list below -->
  <div class="hive-card" data-hive-card aria-hidden="true">
    <p class="hive-card-label" data-hive-card-label></p>
    <p class="hive-card-detail" data-hive-card-detail></p>
  </div>
</div>

<!-- Accessible text list — keyboard-navigable equivalent of the canvas -->
<div class="hive-lists">
  <div class="hive-list-group">
    <h3 class="label hive-list-title">Now</h3>
    <ul role="list" class="hive-list">
      {carrying.map((item) => (
        <li class="hive-list-item">
          <span class="hive-item-label label">{item.label}</span>
          <span class="hive-item-detail">{item.detail}</span>
        </li>
      ))}
    </ul>
  </div>
  <div class="hive-list-group">
    <h3 class="label hive-list-title">Reading</h3>
    <ul role="list" class="hive-list">
      {reading.map((item) => (
        <li class="hive-list-item">
          <span class="hive-item-label label">{item.label}</span>
          <span class="hive-item-detail">{item.detail}</span>
        </li>
      ))}
    </ul>
  </div>
  <div class="hive-list-group">
    <h3 class="label hive-list-title">Reach me</h3>
    <ul role="list" class="hive-list">
      {contact.map((item) => (
        <li class="hive-list-item">
          <a
            href={item.url}
            class="hive-item-label label contact-link"
            target={item.url.startsWith('mailto:') ? undefined : '_blank'}
            rel={item.url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
          >{item.detail ?? item.label}</a>
        </li>
      ))}
    </ul>
  </div>
</div>

<script is:inline define:vars={{ rawFlowers }}>
  window.__hiveFlowers = rawFlowers;
</script>

<script>
  import { createFlock, layoutFlowers, stepFlock } from './flock';
  import type { FlockBee, FlowerDef } from './flock';

  declare global {
    interface Window {
      __hiveFlowers?: import('./flock').RawFlower[];
    }
  }

  // ── Drawing constants ──────────────────────────────────────────────────────

  const FLOWER_R = 8;
  const PETAL_R  = 5;
  const BEE_RX   = 3;
  const BEE_RY   = 5;

  // ── Drawing helpers ────────────────────────────────────────────────────────

  interface Colors {
    moss: string;
    ochre: string;
    soil: string;
    chartreuse: string;
    ink: string;
    paper: string;
  }

  const FLOWER_KIND_COLOR = (c: Colors): Record<string, string> => ({
    carrying: c.moss,
    reading:  c.ochre,
    contact:  c.soil,
  });

  function drawFlower(
    ctx: CanvasRenderingContext2D,
    f: FlowerDef,
    cssW: number,
    cssH: number,
    hovered: boolean,
    colors: Colors,
  ): void {
    const x     = f.x * cssW;
    const y     = f.y * cssH;
    const color = FLOWER_KIND_COLOR(colors)[f.kind] ?? colors.soil;

    // Petals (5, arranged around centre)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * (FLOWER_R + 3), y + Math.sin(a) * (FLOWER_R + 3), PETAL_R, 0, Math.PI * 2);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle   = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Centre
    ctx.beginPath();
    ctx.arc(x, y, FLOWER_R, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Hover ring
    if (hovered) {
      ctx.beginPath();
      ctx.arc(x, y, FLOWER_R + 7, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // Label below flower
    ctx.fillStyle  = colors.ink;
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(f.label, x, y + FLOWER_R + 15);
  }

  function drawBee(
    ctx: CanvasRenderingContext2D,
    bee: FlockBee,
    t: number,
    colors: Colors,
  ): void {
    const speed = Math.sqrt(bee.vx * bee.vx + bee.vy * bee.vy);
    const angle = speed > 0.01 ? Math.atan2(bee.vy, bee.vx) + Math.PI / 2 : 0;
    const waggle = Math.sin(t * 0.005 + bee.id * 0.7) * 0.15;

    ctx.save();
    ctx.translate(bee.x, bee.y);
    ctx.rotate(angle + waggle);

    // Wings
    ctx.globalAlpha = 0.7;
    ctx.fillStyle   = colors.paper;
    ctx.beginPath();
    ctx.ellipse(-BEE_RX - 1, -2, BEE_RX + 1, 2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(BEE_RX + 1, -2, BEE_RX + 1, 2, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, BEE_RX, BEE_RY, 0, 0, Math.PI * 2);
    ctx.fillStyle   = colors.ochre;
    ctx.fill();
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Pollen dot
    if (bee.pollenFlower !== null) {
      ctx.beginPath();
      ctx.arc(0, -(BEE_RY + 3), 3, 0, Math.PI * 2);
      ctx.fillStyle = colors.chartreuse;
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Mount / destroy ────────────────────────────────────────────────────────

  type Cleanup = () => void;

  function mountLiveFlock(): Cleanup {
    const wrap      = document.querySelector<HTMLElement>('[data-live-flock-wrap]');
    const canvas    = document.querySelector<HTMLCanvasElement>('[data-live-flock]');
    const card      = document.querySelector<HTMLElement>('[data-hive-card]');
    const cardLabel = document.querySelector<HTMLElement>('[data-hive-card-label]');
    const cardDetail= document.querySelector<HTMLElement>('[data-hive-card-detail]');
    const rawFlowers= window.__hiveFlowers;

    if (!wrap || !canvas || !card || !cardLabel || !cardDetail || !rawFlowers) return () => {};

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Resolve CSS custom properties once (canvas cannot use var())
    const style  = getComputedStyle(document.documentElement);
    const colors: Colors = {
      moss:       style.getPropertyValue('--c-moss').trim()       || '#5A7A4A',
      ochre:      style.getPropertyValue('--c-ochre').trim()      || '#D9A857',
      soil:       style.getPropertyValue('--c-soil').trim()       || '#8A4F2E',
      chartreuse: style.getPropertyValue('--c-chartreuse').trim() || '#C4D670',
      ink:        style.getPropertyValue('--c-ink').trim()        || '#1A1A1A',
      paper:      style.getPropertyValue('--c-paper').trim()      || '#F1E8D0',
    };

    let rafId        = 0;
    let startTime: number | null = null;
    let hoveredFlower: number | null = null;
    let flowers: FlowerDef[] = [];
    let bees: FlockBee[]    = [];
    let cssW = 0;
    let cssH = 0;

    function resize(): void {
      const rect  = canvas!.getBoundingClientRect();
      cssW        = rect.width;
      cssH        = rect.height;
      const dpr   = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas!.width  = Math.round(rect.width  * dpr);
      canvas!.height = Math.round(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      flowers = layoutFlowers(rawFlowers!, cssW, cssH);
      const beeCount = cssW < 640 ? 12 : 30;
      bees = createFlock(beeCount, cssW, cssH, 42);
    }

    function draw(t: number): void {
      ctx!.clearRect(0, 0, cssW, cssH);
      for (let i = 0; i < flowers.length; i++) {
        drawFlower(ctx!, flowers[i], cssW, cssH, hoveredFlower === i, colors);
      }
      for (const bee of bees) {
        drawBee(ctx!, bee, t, colors);
      }
    }

    function loop(ts: number): void {
      if (startTime === null) startTime = ts;
      const t = ts - startTime;
      bees = stepFlock(bees, flowers, cssW, cssH, t, hoveredFlower);
      draw(t);
      rafId = requestAnimationFrame(loop);
    }

    function showCard(flowerIndex: number): void {
      const f = flowers[flowerIndex];
      if (!f) return;
      cardLabel!.textContent  = f.label;
      cardDetail!.textContent = f.detail;
      card!.setAttribute('data-visible', '');
      const fx      = f.x * cssW;
      const fy      = f.y * cssH;
      const cardH   = card!.offsetHeight || 60;
      const topRaw  = fy - cardH - 20;
      const top     = topRaw < 8 ? fy + FLOWER_R + 20 : topRaw;
      const leftRaw = fx - 80;
      const left    = Math.max(8, Math.min(cssW - 170, leftRaw));
      card!.style.left = `${left}px`;
      card!.style.top  = `${top}px`;
    }

    function hideCard(): void {
      card!.removeAttribute('data-visible');
    }

    function handleMouseMove(e: MouseEvent): void {
      const rect = canvas!.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;
      let nearest: number | null = null;
      let minDist = 40;
      for (let i = 0; i < flowers.length; i++) {
        const dist = Math.sqrt((mx - flowers[i].x * cssW) ** 2 + (my - flowers[i].y * cssH) ** 2);
        if (dist < minDist) { minDist = dist; nearest = i; }
      }
      if (nearest !== hoveredFlower) {
        hoveredFlower = nearest;
        if (hoveredFlower !== null) showCard(hoveredFlower);
        else hideCard();
      }
    }

    function handleMouseLeave(): void {
      hoveredFlower = null;
      hideCard();
    }

    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    if (rm) {
      draw(0); // static frame — no RAF
    } else {
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas!.removeEventListener('mousemove', handleMouseMove);
      canvas!.removeEventListener('mouseleave', handleMouseLeave);
    };
  }

  let cleanup: Cleanup = () => {};

  document.addEventListener('astro:page-load', () => {
    cleanup = mountLiveFlock();
  });

  document.addEventListener('astro:before-swap', () => {
    cleanup();
    cleanup = () => {};
  });
</script>

<style>
  .live-flock-wrap {
    position: relative;
    margin-bottom: var(--space-12);
  }

  .live-flock-canvas {
    display: block;
    width: 100%;
    height: 420px;
    background: transparent;
    cursor: crosshair;
  }

  @media (max-width: 640px) {
    .live-flock-canvas {
      height: 280px;
    }
  }

  /* Hover card */
  .hive-card {
    position: absolute;
    top: 0;
    left: 0;
    background: var(--ground);
    border: 1px solid var(--ink-faint);
    border-radius: 2px;
    padding: var(--space-3) var(--space-4);
    min-width: 140px;
    max-width: 200px;
    pointer-events: none;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity var(--duration-fast) var(--easing),
                transform var(--duration-fast) var(--easing);
    z-index: 10;
  }

  .hive-card[data-visible] {
    opacity: 1;
    transform: none;
  }

  .hive-card-label {
    font-size: var(--text-xs);
    font-style: italic;
    margin: 0 0 var(--space-1);
    color: var(--ink-muted);
  }

  .hive-card-detail {
    font-size: var(--text-sm);
    margin: 0;
    color: var(--ink);
    line-height: 1.5;
  }

  /* Accessible lists */
  .hive-lists {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-8);
    padding-top: var(--space-4);
    border-top: 1px solid var(--ink-faint);
  }

  .hive-list-title {
    display: block;
    margin-bottom: var(--space-4);
    color: var(--ink-muted);
  }

  .hive-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .hive-list-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .hive-item-label {
    color: var(--ink);
  }

  .hive-item-detail {
    font-size: var(--text-sm);
    color: var(--ink-muted);
    line-height: 1.5;
  }

  .contact-link {
    text-decoration: none;
    color: var(--ink);
    transition: color var(--duration-fast) var(--easing);
  }

  .contact-link:hover {
    color: var(--ink-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .hive-card {
      transition: none;
    }
  }
</style>
```

- [ ] **Step 2: Verify Astro type-checks cleanly**

```bash
pnpm astro check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/zones/Hive/LiveFlock.astro
git commit -m "feat: LiveFlock canvas component — bee flock with hover card"
```

---

### Task 4: `/hive` route + zone link + LHCI

**Files:**
- Create: `src/pages/hive/index.astro`
- Modify: `src/lib/zones.ts` (line with `id: 'hive'` — change `href: null` to `href: '/hive'`)
- Modify: `lighthouserc.json` (add `/hive` to URL list)

---

- [ ] **Step 1: Create `src/pages/hive/index.astro`**

```astro
---
import Garden from '@layouts/Garden.astro';
import LiveFlock from '../../components/zones/Hive/LiveFlock.astro';
---

<Garden
  title="The Hive — Gurden's Garden"
  description="What I'm working on now, what I'm reading, and how to reach me."
>
  <div class="hive-wrap page-wrap">

    <header class="hive-header">
      <p class="label zone-emoji" aria-hidden="true">🐝</p>
      <h1>The Hive</h1>
      <p class="hive-intro">
        What I'm carrying right now, what I'm reading, and how to reach me.
      </p>
    </header>

    <section class="flock-section" aria-labelledby="flock-heading">
      <h2 id="flock-heading" class="label section-heading">Live Flock</h2>
      <LiveFlock />
    </section>

  </div>
</Garden>

<style>
  .hive-wrap {
    padding-block: var(--space-16);
  }

  .hive-header {
    margin-bottom: var(--space-16);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .zone-emoji {
    font-size: var(--text-xl);
    margin-bottom: var(--space-3);
    display: block;
  }

  .hive-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .hive-intro {
    font-size: var(--text-md);
    line-height: 1.65;
    max-width: 560px;
  }

  .section-heading {
    display: block;
    margin-bottom: var(--space-8);
  }

  .flock-section {
    margin-bottom: var(--space-20);
  }
</style>
```

- [ ] **Step 2: Update `src/lib/zones.ts` — enable the hive link**

Find the `hive` zone entry (the object with `id: 'hive'`). Change:
```typescript
    href: null,
```
To:
```typescript
    href: '/hive',
```

- [ ] **Step 3: Update `lighthouserc.json` — add `/hive` URL**

In the `"url"` array, add:
```json
"http://localhost:4321/hive"
```

The updated array:
```json
"url": [
  "http://localhost:4321/",
  "http://localhost:4321/polyculture",
  "http://localhost:4321/compost",
  "http://localhost:4321/beds",
  "http://localhost:4321/hive"
]
```

- [ ] **Step 4: Build and verify the route is accessible**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Verify map overlay now shows hive as a link**

Start the preview server and navigate to `/`:

```bash
pnpm preview
```

Open `http://localhost:4321/` in a browser. Open the map overlay. Confirm The Hive zone now has a clickable link to `/hive`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/hive/index.astro src/lib/zones.ts lighthouserc.json
git commit -m "feat: /hive route with Live Flock hero piece; enable hive zone link"
```

---

### Task 5: E2E + axe tests

**Files:**
- Create: `e2e/hive.spec.ts`

---

- [ ] **Step 1: Create `e2e/hive.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Hive page — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /The Hive/i, level: 1 })).toBeVisible();
  });

  test('shows intro text', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByText(/carrying right now/i).first()).toBeVisible();
  });

  test('canvas element is in DOM', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.locator('[data-live-flock]')).toBeAttached();
  });

  test('accessible "Now" list heading is present', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /^Now$/i })).toBeVisible();
  });

  test('accessible "Reading" list heading is present', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /^Reading$/i })).toBeVisible();
  });

  test('accessible "Reach me" list heading is present', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /Reach me/i })).toBeVisible();
  });

  test('contact email link is present in the accessible list', async ({ page }) => {
    await page.goto('/hive');
    const emailLink = page.getByRole('link', { name: /gurden@darkmatterlabs/i });
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute('href', 'mailto:gurden@darkmatterlabs.org');
  });
});

test.describe('Hive page — canvas', () => {
  test('canvas has non-zero dimensions after mount', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(300);
    const bbox = await page.locator('[data-live-flock]').boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });

  test('canvas renders content (non-blank pixels) after mount', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(500);
    const isNonBlank = await page.locator('[data-live-flock]').evaluate((canvas) => {
      const c = canvas as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      return data.some((v) => v !== 0);
    });
    expect(isNonBlank).toBe(true);
  });
});

test.describe('Hive page — hover card', () => {
  test('hovering near a flower shows the content card', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(300);

    const canvas = page.locator('[data-live-flock]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Sweep horizontally at 50% canvas height — will pass over at least one flower
    const y = box!.y + box!.height * 0.5;
    let found = false;
    for (let x = box!.x + 60; x < box!.x + box!.width - 60; x += 25) {
      await page.mouse.move(x, y);
      const visible = await page
        .locator('[data-hive-card]')
        .evaluate((el) => el.hasAttribute('data-visible'));
      if (visible) { found = true; break; }
    }
    expect(found).toBe(true);
  });

  test('card hides when mouse leaves canvas', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(300);

    const canvas = page.locator('[data-live-flock]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // First hover to make card visible
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(100);

    // Move off-canvas
    await page.mouse.move(box!.x - 50, box!.y - 50);
    await page.waitForTimeout(100);

    const visible = await page
      .locator('[data-hive-card]')
      .evaluate((el) => el.hasAttribute('data-visible'));
    expect(visible).toBe(false);
  });
});

test.describe('Hive page — reduced motion', () => {
  test('canvas still renders in reduced-motion mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/hive');
    await page.waitForTimeout(300);
    const bbox = await page.locator('[data-live-flock]').boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });

  test('accessible list still visible in reduced-motion mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /^Now$/i })).toBeVisible();
  });
});

test.describe('Hive page — keyboard navigation', () => {
  test('contact links are reachable by keyboard', async ({ page }) => {
    await page.goto('/hive');
    // Tab repeatedly to find the email link
    let found = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('href') ?? '');
      if (focused === 'mailto:gurden@darkmatterlabs.org') { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

test.describe('Hive page — accessibility', () => {
  test('has zero axe violations', async ({ page }) => {
    await page.goto('/hive');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('has zero axe violations in reduced-motion mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/hive');
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run E2E tests for hive**

Start the dev server in a separate terminal first (`pnpm dev`), then:

```bash
pnpm test:e2e e2e/hive.spec.ts
```

Expected: All tests PASS across chromium, firefox, webkit.

- [ ] **Step 3: Run the full E2E suite — expect no regressions**

```bash
pnpm test:e2e
```

Expected: All existing tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add e2e/hive.spec.ts
git commit -m "test: E2E + axe coverage for /hive zone"
```

---

### Task 6: Final sweep — Lighthouse CI + full verification

**Files:**
- Modify: `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md`

---

- [ ] **Step 1: Run the full Vitest suite — expect all pass**

```bash
pnpm test
```

Expected: All tests pass (the new `flock.test.ts` + `nowSchema` tests included).

- [ ] **Step 2: Run Lighthouse CI — all URLs must pass budgets**

```bash
pnpm lhci
```

Expected: `/`, `/polyculture`, `/compost`, `/beds`, `/hive` all report performance ≥ 0.9, accessibility 1.0. No budget violations.

If `/hive` has a JS bundle size issue, investigate and reduce: the flock simulation is pure JS (~100 lines), LiveFlock.astro script is ~150 lines, total well under 80kb gzipped.

- [ ] **Step 3: Update design spec status**

In `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md`, line 4, change:

```markdown
**Status:** Phase 5 (Beds) complete; Phase 6 (Hive) next
```

To:

```markdown
**Status:** Phase 6 (Hive) complete; Phase 7 (Mycelium) next
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-25-gurdens-garden-design.md
git commit -m "docs: mark Phase 6 (Hive) complete with Lighthouse + axe coverage"
```

---

## Self-Review

### 1. Spec coverage check

| Spec requirement | Task |
|---|---|
| `/hive` route | Task 4 |
| Live Flock — Perlin flow-field bees (~30 desktop, ~12 mobile) | Task 2 + 3 |
| Flowers labeled with "now" items + contact | Task 1 + 3 |
| Bees carry pollen between flowers | Task 2 (pollenFlower in stepFlock) + Task 3 (drawn in drawBee) |
| Hover flower → bees converge + content card slides in | Task 2 (stepFlock targeting) + Task 3 (showCard) |
| `now.mdx` content file | Task 1 |
| Reduced motion: bees freeze, flowers interactive | Task 3 (rm guard in mount — draws single frame) |
| Zone link on map enabled | Task 4 (zones.ts) |
| LHCI budget enforced | Task 4 (lighthouserc.json) + Task 6 |
| axe zero violations | Task 5 |

### 2. Placeholder scan

No TBDs, TODOs, or incomplete sections found.

### 3. Type consistency

- `RawFlower` — defined in `flock.ts` Task 2, imported in `LiveFlock.astro` Task 3 ✓
- `FlowerDef` — extends `RawFlower`, used in `drawFlower`, `showCard` ✓
- `FlockBee` — defined in `flock.ts`, used in `drawBee`, `stepFlock` ✓
- `layoutFlowers(rawFlowers, cssW, cssH)` — called in `resize()` in Task 3 ✓
- `stepFlock(bees, flowers, cssW, cssH, t, hoveredFlower)` — called in `loop()` ✓
- `createFlock(beeCount, cssW, cssH, 42)` — called in `resize()` ✓
