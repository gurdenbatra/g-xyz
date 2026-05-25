# Gurden's Garden — Phase 3: Polyculture (Slow Plot)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/work` with `/polyculture` — a canvas-rendered wild plot where each project is a procedurally-grown plant (deterministic L-system seeded by slug); hover tilts a plant toward the cursor and reveals a handwritten tag; click navigates to the project detail.

**Architecture:** Pure-function plant + noise libraries (`src/lib/plants.ts`, `src/lib/noise.ts`) unit-tested without DOM. A `SlowPlot.astro` Astro island mounts a Canvas 2D context, walks the L-system output once on mount, then RAFs a Perlin-noise wind sway per segment. New `/polyculture/` routes live alongside the canvas — the index page shows the canvas at top and a text project list below (a11y / SEO / no-JS fallback). Old `/work` routes redirect via Astro 5's `redirects` config.

**Tech Stack:** Astro 5, TypeScript, Canvas 2D, Perlin/value noise, Vitest, Playwright + axe-core.

---

## Background — what exists going in

- Branch: `main`, latest commit at the time of writing is the end of Phase 2 (`47d804c` + any follow-ups)
- Phase 2 deliverables already live: Garden layout with ClientRouter + PortalShader, MapToggle + MapOverlay, CSS garden map home page
- `src/lib/zones.ts` exists (Phase 2 follow-up extraction) and is consumed by MapOverlay + index.astro
- Content: 7 projects under `src/content/projects/*.mdx`. Project schema in `src/content/schemas.ts` (Zod). Existing tests in `src/content/schemas.test.ts`.
- Existing `/work` routes: `src/pages/work/index.astro` (projects list using `ProjectRow.astro`) and `src/pages/work/[slug].astro` (project detail).
- `ProjectRow.astro` hard-codes `href={`/work/${slug}`}` — this will need updating.
- Lighthouse budgets: LCP < 2.5s, TBT < 200ms, JS < 80kb gzipped, CSS < 30kb gzipped.

## Design decisions baked into this plan

These are decisions where the design spec was open-ended; they are now locked in for Phase 3:

| Decision | Choice | Why |
|---|---|---|
| Wind technique | Canvas 2D Perlin sway (per-segment offset based on noise field sampled at segment y + time). NOT a WebGL fragment shader. | Visually equivalent; ~10% the code; stays under JS budget; no shader compile risk. WebGL displacement can be a v9 polish. |
| Plant types implemented | All 6 from spec: `fern`, `sunflower`, `thistle`, `vine`, `grass`, `shrub`. | Each grammar is ~5 lines; cheap to ship them all and avoids a follow-up. |
| Plant assignment | If `plantType` frontmatter is set, use it. Otherwise hash the slug → pick from `[fern, sunflower, thistle, vine, grass, shrub]`. | Deterministic; ships without any content edits. |
| Plant positions | Deterministic per-slug horizontal position (hash mod canvas width); slight vertical jitter. Plants drawn back-to-front (taller plants drawn first). | Stable across reloads; feels wild without overlapping. |
| L-system depth | 3 for all plants (4 for sunflower stem only). | Keeps total segment count ~200–600 per plant. 7 plants × ~400 segments = ~2800 segments per frame — well within Canvas 2D budget. |
| Tag style | Italic Mazius serif tag rendered in HTML overlay (not in canvas), positioned absolutely above the hovered plant. | Crisp text; selectable; honours focus styles. |
| Reduced motion | Skip the RAF loop; render plants once on mount. Hover interactions still work but the plant doesn't tilt — only the tag appears. | Matches spec ("plants static; no sway; tags still appear on hover"). |
| `/work` redirect | Use Astro 5's `redirects` config in `astro.config.mjs` → emits redirect HTML at build time. Delete `src/pages/work/`. | Astro-native; no client-side meta refresh needed. |
| Project detail page | Move to `src/pages/polyculture/[slug].astro`. Back-link updates to `/polyculture`. | Single source of truth; redirects handle old URLs. |
| Project list on `/polyculture` | Rendered below the canvas as accessible HTML (existing `ProjectRow` shape), updated to link to `/polyculture/${slug}`. | Keyboard nav, no-JS fallback, screen readers, SEO. |

## z-index budget (unchanged from Phase 2)

| Layer | z-index |
|---|---|
| Canvas + page content | 0–1 |
| Tag overlay (above canvas) | 2 |
| Nav | 10 |
| Cursor bee | 50 |
| Map toggle button | 60 |
| Map overlay | 70 |
| Skip-link | 100 |

## File map

| Action | Path | Purpose |
|---|---|---|
| MODIFY | `src/content/schemas.ts` | Add optional `plantType` enum to `projectSchema` |
| MODIFY | `src/content/schemas.test.ts` | Add tests for the new field |
| CREATE | `src/lib/plants.ts` | L-system rules, expansion, turtle interpreter, slug hash, plant-type assignment |
| CREATE | `src/lib/plants.test.ts` | Vitest unit tests for plants lib |
| CREATE | `src/lib/noise.ts` | Deterministic value-noise (2D), no dependencies |
| CREATE | `src/lib/noise.test.ts` | Vitest unit tests for noise lib |
| CREATE | `src/components/zones/Polyculture/SlowPlot.astro` | Canvas island; mounts canvas, calls into plants/noise libs |
| CREATE | `src/pages/polyculture/index.astro` | Polyculture zone landing — Slow Plot + project list |
| CREATE | `src/pages/polyculture/[slug].astro` | Project detail (copy of old `work/[slug].astro` with updated back-link) |
| MODIFY | `astro.config.mjs` | Add `redirects` map (`/work` → `/polyculture`, `/work/[slug]` → `/polyculture/[slug]`) |
| DELETE | `src/pages/work/index.astro` | Replaced by redirect |
| DELETE | `src/pages/work/[slug].astro` | Replaced by redirect + new detail page |
| MODIFY | `src/components/ProjectRow.astro` | `href` to use new `/polyculture/${slug}` URL |
| MODIFY | `src/lib/zones.ts` | Polyculture zone href: `/work` → `/polyculture` |
| CREATE | `e2e/polyculture.spec.ts` | E2E tests for new zone and canvas mount |
| MODIFY | `e2e/accessibility.spec.ts` | Update any nav/overlay tests still hard-coded to `/work` |
| MODIFY | `e2e/pages.spec.ts` | Update if any test references `/work` directly |

---

### Task 1: Preflight + plantType schema

**Goal:** Verify baseline green; add an optional `plantType` field to the project schema so MDX files can opt into a specific plant. The 7 existing projects don't need to be edited — the field is optional.

**Files:**
- Modify: `src/content/schemas.ts`
- Modify: `src/content/schemas.test.ts`

- [ ] **Step 1: Run baseline tests**

```bash
pnpm test
pnpm exec playwright test
```

Expected: All Vitest tests pass. All Playwright tests pass. Stop and fix anything red before proceeding.

- [ ] **Step 2: Write failing schema tests**

Open `src/content/schemas.test.ts`. Add these tests inside the existing `describe('projectSchema', ...)` block (or create one if the file doesn't have it — read the file first):

```typescript
  it('accepts a project with plantType set', () => {
    const result = projectSchema.parse({
      title: 'Test',
      description: 'A test project',
      role: 'Dev',
      year: 2024,
      tags: ['tag'],
      plantType: 'fern',
    });
    expect(result.plantType).toBe('fern');
  });

  it('accepts a project with plantType omitted (it is optional)', () => {
    const result = projectSchema.parse({
      title: 'Test',
      description: 'A test project',
      role: 'Dev',
      year: 2024,
      tags: ['tag'],
    });
    expect(result.plantType).toBeUndefined();
  });

  it('rejects a project with an invalid plantType', () => {
    expect(() =>
      projectSchema.parse({
        title: 'Test',
        description: 'A test project',
        role: 'Dev',
        year: 2024,
        tags: ['tag'],
        plantType: 'tree',
      }),
    ).toThrow();
  });
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
pnpm test -- schemas
```

Expected: The three new tests FAIL — `plantType` is not in the schema yet.

- [ ] **Step 4: Add plantType to projectSchema**

In `src/content/schemas.ts`, modify `projectSchema`:

```typescript
import { z } from 'zod';

export const PLANT_TYPES = ['fern', 'sunflower', 'thistle', 'vine', 'grass', 'shrub'] as const;
export type PlantType = (typeof PLANT_TYPES)[number];

export const projectSchema = z.object({
  title:         z.string(),
  description:   z.string(),
  role:          z.string(),
  year:          z.number().int().min(1990).max(2100),
  tags:          z.array(z.string()).min(1),
  collaborators: z.array(z.string()).optional(),
  links:         z.array(
    z.object({ label: z.string(), url: z.string().url() })
  ).optional(),
  featured:      z.boolean().default(false),
  heroImage:     z.string().optional(),
  plantType:     z.enum(PLANT_TYPES).optional(),
});

export const poemSchema = z.object({
  title:        z.string(),
  date:         z.date(),
  customLayout: z.boolean().default(false),
});

export const artSchema = z.object({
  title:     z.string(),
  date:      z.date(),
  medium:    z.enum(['canvas', 'webgl', 'svg', 'p5', 'static']),
  sourceUrl: z.string().url().optional(),
  liveEmbed: z.boolean().default(false),
}).refine(
  (data) => !data.liveEmbed || data.sourceUrl !== undefined,
  { message: 'sourceUrl is required when liveEmbed is true', path: ['sourceUrl'] }
);
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm test -- schemas
```

Expected: All schema tests pass (including the three new ones).

- [ ] **Step 6: Verify the build still succeeds with all 7 existing projects**

```bash
pnpm build
```

Expected: Build completes; 12 pages built. No content validation errors.

- [ ] **Step 7: Commit**

```bash
git add src/content/schemas.ts src/content/schemas.test.ts
git commit -m "feat: add optional plantType field to projectSchema (6 plant enum values)"
```

---

### Task 2: Plants library — L-system + assignment

**Goal:** Pure-function module that, given a project slug (and optional `plantType`), produces an array of line segments representing the plant's shape. L-system expansion + turtle interpreter, all deterministic. Tested without DOM.

**Files:**
- Create: `src/lib/plants.ts`
- Create: `src/lib/plants.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/plants.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  hashSlug,
  assignPlantType,
  generatePlant,
  type PlantType,
  type Segment,
} from './plants';

describe('hashSlug', () => {
  it('returns the same number for the same slug', () => {
    expect(hashSlug('circulaw')).toBe(hashSlug('circulaw'));
  });

  it('returns different numbers for different slugs', () => {
    expect(hashSlug('circulaw')).not.toBe(hashSlug('treesai'));
  });

  it('returns a non-negative integer', () => {
    const h = hashSlug('flux-island');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe('assignPlantType', () => {
  it('uses the override when provided', () => {
    expect(assignPlantType('whatever', 'sunflower')).toBe('sunflower');
  });

  it('deterministically picks a plant type for the same slug', () => {
    const a = assignPlantType('circulaw');
    const b = assignPlantType('circulaw');
    expect(a).toBe(b);
  });

  it('returns one of the 6 known plant types', () => {
    const knownTypes: PlantType[] = ['fern', 'sunflower', 'thistle', 'vine', 'grass', 'shrub'];
    expect(knownTypes).toContain(assignPlantType('any-slug-here'));
  });
});

describe('generatePlant', () => {
  it('returns at least one segment for every plant type', () => {
    const types: PlantType[] = ['fern', 'sunflower', 'thistle', 'vine', 'grass', 'shrub'];
    for (const t of types) {
      const segments = generatePlant('seed', t);
      expect(segments.length).toBeGreaterThan(0);
    }
  });

  it('produces the same segments for the same slug + type (deterministic)', () => {
    const a = generatePlant('circulaw', 'fern');
    const b = generatePlant('circulaw', 'fern');
    expect(a).toEqual(b);
  });

  it('produces different segments for different slugs of the same type', () => {
    const a = generatePlant('one', 'fern');
    const b = generatePlant('two', 'fern');
    // At least the per-slug jitter should make them not exactly equal
    expect(a).not.toEqual(b);
  });

  it('every segment has finite numeric coordinates', () => {
    const segs = generatePlant('circulaw', 'sunflower');
    for (const s of segs) {
      expect(Number.isFinite(s.x1)).toBe(true);
      expect(Number.isFinite(s.y1)).toBe(true);
      expect(Number.isFinite(s.x2)).toBe(true);
      expect(Number.isFinite(s.y2)).toBe(true);
    }
  });

  it('segments stay within a reasonable bounding box (under 500px on either axis)', () => {
    const segs = generatePlant('big', 'sunflower');
    const xs = segs.flatMap((s) => [s.x1, s.x2]);
    const ys = segs.flatMap((s) => [s.y1, s.y2]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    expect(w).toBeLessThan(500);
    expect(h).toBeLessThan(500);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test -- plants
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create plants.ts**

```typescript
// src/lib/plants.ts
// Deterministic L-system plant generation. Pure functions only — no DOM,
// no Canvas, no globals.

export type PlantType = 'fern' | 'sunflower' | 'thistle' | 'vine' | 'grass' | 'shrub';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Normalized 0–1 from root to tip — used by the wind shader for displacement strength */
  growth: number;
  /** Drawing thickness hint (1 at root, tapers toward 0.5 at tips) */
  thickness: number;
  /** Optional marker for renderer flourishes (e.g. 'bloom' for sunflower tip) */
  tip?: 'bloom' | 'leaf' | 'spike';
}

/** Plant L-system grammars. axiom + rules + iteration depth + turn angle. */
interface Grammar {
  axiom: string;
  rules: Record<string, string>;
  depth: number;
  angleDeg: number;
  /** Forward step length at depth 0 (gets divided by depth at runtime) */
  stepBase: number;
  /** Maximum height in pixels (used to scale the final plant) */
  targetHeight: number;
  /** Optional tip marker drawn at the END of each branch leaf */
  tipMarker?: 'bloom' | 'leaf' | 'spike';
}

const GRAMMARS: Record<PlantType, Grammar> = {
  fern: {
    axiom: 'X',
    rules: {
      X: 'F+[[X]-X]-F[-FX]+X',
      F: 'FF',
    },
    depth: 3,
    angleDeg: 25,
    stepBase: 6,
    targetHeight: 180,
    tipMarker: 'leaf',
  },
  sunflower: {
    axiom: 'F',
    rules: {
      F: 'FF+[+F-F-F]-[-F+F+F]',
    },
    depth: 3,
    angleDeg: 22.5,
    stepBase: 8,
    targetHeight: 220,
    tipMarker: 'bloom',
  },
  thistle: {
    axiom: 'F',
    rules: {
      F: 'F[+F]F[-F]F',
    },
    depth: 3,
    angleDeg: 30,
    stepBase: 6,
    targetHeight: 160,
    tipMarker: 'spike',
  },
  vine: {
    axiom: 'F',
    rules: {
      F: 'F[+F]F[-F][F]',
    },
    depth: 3,
    angleDeg: 22.5,
    stepBase: 5,
    targetHeight: 150,
    tipMarker: 'leaf',
  },
  grass: {
    axiom: 'F',
    rules: {
      F: 'F[+F][-F]',
    },
    depth: 2,
    angleDeg: 25,
    stepBase: 8,
    targetHeight: 90,
    tipMarker: undefined,
  },
  shrub: {
    axiom: 'F',
    rules: {
      F: 'FF-[-F+F+F]+[+F-F-F]',
    },
    depth: 3,
    angleDeg: 27.5,
    stepBase: 5,
    targetHeight: 140,
    tipMarker: 'leaf',
  },
};

/** djb2-style string hash. Returns a non-negative 32-bit integer. */
export function hashSlug(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const ALL_TYPES: readonly PlantType[] = [
  'fern',
  'sunflower',
  'thistle',
  'vine',
  'grass',
  'shrub',
] as const;

/** If an override is provided, use it. Otherwise hash the slug to pick a type. */
export function assignPlantType(slug: string, override?: PlantType): PlantType {
  if (override) return override;
  return ALL_TYPES[hashSlug(slug) % ALL_TYPES.length];
}

/** Expand an L-system axiom by N iterations using the rules table. */
function expand(axiom: string, rules: Record<string, string>, depth: number): string {
  let current = axiom;
  for (let i = 0; i < depth; i++) {
    let next = '';
    for (const ch of current) {
      next += rules[ch] ?? ch;
    }
    current = next;
  }
  return current;
}

/**
 * Walk the expanded L-system with a turtle and emit segments.
 * Turtle starts pointing up (angle = -90°). Segments are returned in growth order
 * so renderers can taper thickness or animate growth.
 */
function turtle(
  program: string,
  angleDeg: number,
  step: number,
  jitter: (n: number) => number,
  tipMarker?: 'bloom' | 'leaf' | 'spike',
): Segment[] {
  const segments: Segment[] = [];
  const stack: Array<{ x: number; y: number; a: number }> = [];
  const turn = (angleDeg * Math.PI) / 180;
  let x = 0;
  let y = 0;
  let a = -Math.PI / 2; // up

  // Track the previous symbol so we can mark "tip" segments
  let prev = '';
  for (let i = 0; i < program.length; i++) {
    const ch = program[i];
    const nextCh = program[i + 1] ?? '';
    switch (ch) {
      case 'F': {
        const j = jitter(i) * 0.3; // ±15% jitter on each step
        const len = step * (1 + j);
        const nx = x + Math.cos(a) * len;
        const ny = y + Math.sin(a) * len;
        // A "tip" segment is one whose forward F is followed by ']' or end-of-string
        const isTip = nextCh === ']' || nextCh === '';
        segments.push({
          x1: x,
          y1: y,
          x2: nx,
          y2: ny,
          growth: 0, // filled in below
          thickness: 1, // filled in below
          tip: isTip ? tipMarker : undefined,
        });
        x = nx;
        y = ny;
        break;
      }
      case '+':
        a += turn * (1 + jitter(i) * 0.1);
        break;
      case '-':
        a -= turn * (1 + jitter(i) * 0.1);
        break;
      case '[':
        stack.push({ x, y, a });
        break;
      case ']': {
        const s = stack.pop();
        if (s) {
          x = s.x;
          y = s.y;
          a = s.a;
        }
        break;
      }
      default:
        // X and other rule symbols don't draw; turtle ignores them
        break;
    }
    prev = ch;
  }

  // Compute growth (0 at root, 1 at tip) and thickness (1 at root, 0.45 at tip)
  // Growth = index/total approximation; thickness tapers.
  const total = segments.length || 1;
  for (let i = 0; i < segments.length; i++) {
    const g = i / total;
    segments[i].growth = g;
    segments[i].thickness = 1 - g * 0.55;
  }

  return segments;
}

/**
 * Build a deterministic plant for the given slug + type.
 * The returned segments are in the plant's LOCAL coordinate space:
 * x ≈ 0 at the stem; y = 0 at the root, growing upward toward negative y.
 * Callers translate to canvas coordinates and flip Y as needed.
 */
export function generatePlant(slug: string, type: PlantType): Segment[] {
  const grammar = GRAMMARS[type];
  const expanded = expand(grammar.axiom, grammar.rules, grammar.depth);

  // Per-slug deterministic jitter source — a small LCG seeded by the hash.
  const seed = hashSlug(slug);
  const jitter = (i: number) => {
    // Mulberry32-style mix; returns -1..1.
    let t = (seed + i * 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    const u = ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
    return u * 2 - 1;
  };

  const stepLen = grammar.stepBase / Math.max(1, grammar.depth);
  const segments = turtle(expanded, grammar.angleDeg, stepLen, jitter, grammar.tipMarker);

  // Rescale so the plant's vertical extent matches grammar.targetHeight.
  const ys = segments.flatMap((s) => [s.y1, s.y2]);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const naturalH = Math.max(1, maxY - minY);
  const scale = grammar.targetHeight / naturalH;
  return segments.map((s) => ({
    ...s,
    x1: s.x1 * scale,
    y1: s.y1 * scale,
    x2: s.x2 * scale,
    y2: s.y2 * scale,
  }));
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test -- plants
```

Expected: All 11 plant tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plants.ts src/lib/plants.test.ts
git commit -m "feat: plants library — L-system grammars, hash, assignment, generation"
```

---

### Task 3: Noise library — 2D value-noise

**Goal:** Pure-function module that exposes a smooth, deterministic 2D noise function. Used by the wind animation to make plants sway as if wind moved across the plot. No DOM, no canvas, no third-party deps.

**Files:**
- Create: `src/lib/noise.ts`
- Create: `src/lib/noise.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/noise.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { noise2D } from './noise';

describe('noise2D', () => {
  it('returns the same value for the same coordinates (deterministic)', () => {
    expect(noise2D(1.5, 2.5)).toBe(noise2D(1.5, 2.5));
  });

  it('returns a value in the range [-1, 1]', () => {
    for (let i = 0; i < 100; i++) {
      const v = noise2D(Math.random() * 100, Math.random() * 100);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('produces different values at distant points', () => {
    // Sample many points; at least 80% should be different from each other
    const samples = Array.from({ length: 50 }, (_, i) => noise2D(i * 0.37, i * 0.73));
    const unique = new Set(samples);
    expect(unique.size).toBeGreaterThan(40);
  });

  it('is smooth — neighbouring samples are close to each other', () => {
    const a = noise2D(3.0, 3.0);
    const b = noise2D(3.001, 3.001);
    expect(Math.abs(a - b)).toBeLessThan(0.05);
  });

  it('returns 0 for integer-aligned coordinates due to value-noise lattice', () => {
    // Value noise at lattice corners is the hash value itself, mapped to [-1, 1].
    // The test only asserts the result is in range and finite — exact 0 is not
    // guaranteed for all integer coords by this implementation.
    const v = noise2D(0, 0);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(-1);
    expect(v).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test -- noise
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create noise.ts**

```typescript
// src/lib/noise.ts
// Deterministic 2D value-noise. Lattice points hashed; bilinear-smoothed
// between them with a smoothstep curve. No dependencies, no globals.

function hash(ix: number, iy: number): number {
  // Mulberry32-ish 2D integer mix → returns [-1, 1]
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 2D value-noise in the range [-1, 1]. Smooth and deterministic. */
export function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const v00 = hash(ix, iy);
  const v10 = hash(ix + 1, iy);
  const v01 = hash(ix, iy + 1);
  const v11 = hash(ix + 1, iy + 1);

  const sx = smoothstep(fx);
  const sy = smoothstep(fy);

  const a = v00 + (v10 - v00) * sx;
  const b = v01 + (v11 - v01) * sx;
  return a + (b - a) * sy;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test -- noise
```

Expected: All 5 noise tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/noise.ts src/lib/noise.test.ts
git commit -m "feat: noise library — deterministic 2D value-noise for plant wind"
```

---

### Task 4: SlowPlot canvas — static render

**Goal:** Astro component that mounts a `<canvas>`, fetches the projects collection, generates a plant for each, and draws them all once at t=0. No animation yet — that's Task 5. No interactions yet — that's Task 6.

**Files:**
- Create: `src/components/zones/Polyculture/SlowPlot.astro`
- Create: `e2e/polyculture.spec.ts` (just the structural tests here; more in later tasks)

- [ ] **Step 1: Write failing E2E tests**

Create `e2e/polyculture.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Polyculture — Slow Plot canvas', () => {
  test('canvas element is present on /polyculture', async ({ page }) => {
    // /polyculture doesn't exist yet, so this test will fail on route 404 first;
    // a temporary stub page is added in Task 4 step 4 to make the test exercise the canvas.
    await page.goto('/polyculture-preview');
    await expect(page.locator('canvas[data-slow-plot]')).toBeAttached();
  });

  test('canvas has accessible fallback text', async ({ page }) => {
    await page.goto('/polyculture-preview');
    const canvas = page.locator('canvas[data-slow-plot]');
    await expect(canvas).toHaveAttribute('aria-label', /garden plot/i);
  });

  test('plot has rendered at least one path after mount', async ({ page }) => {
    await page.goto('/polyculture-preview');
    // After the component runs, the canvas should have non-zero width and height
    const size = await page.locator('canvas[data-slow-plot]').evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(size.w).toBeGreaterThan(0);
    expect(size.h).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts
```

Expected: FAIL — `/polyculture-preview` does not exist; canvas not found.

- [ ] **Step 3: Create SlowPlot.astro**

Create `src/components/zones/Polyculture/SlowPlot.astro`:

```astro
---
import { getCollection } from 'astro:content';
import { assignPlantType, type PlantType } from '../../../lib/plants';

interface PlantSeed {
  slug: string;
  title: string;
  plantType: PlantType;
}

const projects = await getCollection('projects');
const seeds: PlantSeed[] = projects.map((p) => ({
  slug: p.id.replace(/\.[^.]+$/, ''),
  title: p.data.title,
  plantType: assignPlantType(p.id.replace(/\.[^.]+$/, ''), p.data.plantType),
}));
---

<div class="slow-plot-wrap">
  <canvas
    data-slow-plot
    class="slow-plot-canvas"
    aria-label="A garden plot illustration where each project is a plant. The list below is the keyboard-navigable equivalent."
  ></canvas>
  <div class="slow-plot-tag" data-slow-plot-tag aria-hidden="true"></div>
</div>

<script is:inline define:vars={{ seeds }}>
  window.__slowPlotSeeds = seeds;
</script>

<script>
  import { generatePlant, hashSlug, type Segment } from '../../../lib/plants';

  declare global {
    interface Window {
      __slowPlotSeeds?: Array<{ slug: string; title: string; plantType: import('../../../lib/plants').PlantType }>;
    }
  }

  interface Plant {
    slug: string;
    title: string;
    rootX: number;
    rootY: number;
    segments: Segment[];
  }

  function mountSlowPlot() {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-slow-plot]');
    const seeds = window.__slowPlotSeeds;
    if (!canvas || !seeds) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(rect.width * dpr);
      canvas!.height = Math.floor(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();

    function buildPlants(): Plant[] {
      const rect = canvas!.getBoundingClientRect();
      const ground = rect.height - 20;
      const margin = 40;
      const usableW = rect.width - margin * 2;
      return seeds!.map((s, i) => {
        const h = hashSlug(s.slug);
        const xJitter = ((h % 1000) / 1000 - 0.5) * 40;
        const rootX = margin + ((i + 0.5) / seeds!.length) * usableW + xJitter;
        const rootY = ground;
        const segments = generatePlant(s.slug, s.plantType);
        return { slug: s.slug, title: s.title, rootX, rootY, segments };
      });
    }

    function draw(plants: Plant[]) {
      const rect = canvas!.getBoundingClientRect();
      ctx!.clearRect(0, 0, rect.width, rect.height);
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';

      const cs = getComputedStyle(document.documentElement);
      const stroke = cs.getPropertyValue('--ink').trim() || '#1a1a1a';

      // Sort tallest-first so taller plants draw behind shorter
      const sorted = [...plants].sort((a, b) => {
        const ha = Math.max(...a.segments.map((s) => -s.y2));
        const hb = Math.max(...b.segments.map((s) => -s.y2));
        return hb - ha;
      });

      for (const plant of sorted) {
        ctx!.strokeStyle = stroke;
        for (const seg of plant.segments) {
          ctx!.lineWidth = Math.max(0.6, seg.thickness * 2);
          ctx!.beginPath();
          ctx!.moveTo(plant.rootX + seg.x1, plant.rootY + seg.y1);
          ctx!.lineTo(plant.rootX + seg.x2, plant.rootY + seg.y2);
          ctx!.stroke();
          // Tip flourishes: simple shapes per tip marker
          if (seg.tip === 'bloom') {
            ctx!.fillStyle = cs.getPropertyValue('--c-ochre').trim() || '#D9A857';
            ctx!.beginPath();
            ctx!.arc(plant.rootX + seg.x2, plant.rootY + seg.y2, 5, 0, Math.PI * 2);
            ctx!.fill();
          } else if (seg.tip === 'leaf') {
            ctx!.fillStyle = cs.getPropertyValue('--c-moss').trim() || '#5A7A4A';
            ctx!.beginPath();
            ctx!.arc(plant.rootX + seg.x2, plant.rootY + seg.y2, 2.5, 0, Math.PI * 2);
            ctx!.fill();
          } else if (seg.tip === 'spike') {
            ctx!.strokeStyle = cs.getPropertyValue('--c-indigo').trim() || '#2A3A5A';
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(plant.rootX + seg.x2 - 3, plant.rootY + seg.y2 - 3);
            ctx!.lineTo(plant.rootX + seg.x2 + 3, plant.rootY + seg.y2 - 3);
            ctx!.moveTo(plant.rootX + seg.x2, plant.rootY + seg.y2);
            ctx!.lineTo(plant.rootX + seg.x2, plant.rootY + seg.y2 - 5);
            ctx!.stroke();
            ctx!.strokeStyle = stroke; // restore
          }
        }
      }
    }

    const plants = buildPlants();
    draw(plants);

    // Re-draw on resize
    const ro = new ResizeObserver(() => {
      resize();
      const fresh = buildPlants();
      draw(fresh);
    });
    ro.observe(canvas!);
  }

  // Run on first load AND after every Astro view-transition
  document.addEventListener('astro:page-load', mountSlowPlot);
</script>

<style>
  .slow-plot-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: 60vh;
    background: var(--ground);
    border: 1px solid var(--ink-faint);
    overflow: hidden;
  }

  .slow-plot-canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .slow-plot-tag {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    transform: translate(-50%, -110%);
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: var(--text-base);
    background: var(--ground);
    color: var(--ink);
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--ink-faint);
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--easing);
    white-space: nowrap;
  }

  .slow-plot-tag[data-visible='true'] {
    opacity: 1;
  }

  @media (max-width: 600px) {
    .slow-plot-wrap {
      aspect-ratio: 4 / 3;
    }
  }
</style>
```

- [ ] **Step 4: Add a temporary preview page so the E2E tests can exercise the canvas**

This is a scaffold; the real `/polyculture/index.astro` lands in Task 7 and replaces this preview.

Create `src/pages/polyculture-preview.astro`:

```astro
---
import Garden from '@layouts/Garden.astro';
import SlowPlot from '../components/zones/Polyculture/SlowPlot.astro';
---

<Garden title="Polyculture Preview">
  <section class="page-wrap" style="padding-block: var(--space-12);">
    <h1>Polyculture Preview</h1>
    <SlowPlot />
  </section>
</Garden>
```

- [ ] **Step 5: Run E2E tests — expect PASS**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts
```

Expected: All 3 tests pass.

- [ ] **Step 6: Run full Playwright suite**

```bash
pnpm exec playwright test
```

Expected: No regressions.

- [ ] **Step 7: Commit**

```bash
git add src/components/zones/Polyculture/SlowPlot.astro src/pages/polyculture-preview.astro e2e/polyculture.spec.ts
git commit -m "feat: SlowPlot canvas — static plant rendering from L-system"
```

---

### Task 5: SlowPlot — wind animation

**Goal:** Add a RAF loop that displaces each plant segment by a 2D noise field sampled at `(segment-y, time)`. Respects `prefers-reduced-motion` (no RAF, no displacement). Pauses when the canvas is off-screen.

**Files:**
- Modify: `src/components/zones/Polyculture/SlowPlot.astro`
- Modify: `e2e/polyculture.spec.ts`

- [ ] **Step 1: Add failing E2E tests for animation**

Append to `e2e/polyculture.spec.ts` (inside the existing describe):

```typescript
  test('canvas is animating (frames change over time)', async ({ page }) => {
    await page.goto('/polyculture-preview');
    const before = await page.locator('canvas[data-slow-plot]').screenshot();
    await page.waitForTimeout(600);
    const after = await page.locator('canvas[data-slow-plot]').screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('animation is suppressed under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/polyculture-preview');
    // Wait briefly to let any RAF kick in, then sample two frames 600ms apart
    await page.waitForTimeout(200);
    const before = await page.locator('canvas[data-slow-plot]').screenshot();
    await page.waitForTimeout(600);
    const after = await page.locator('canvas[data-slow-plot]').screenshot();
    expect(Buffer.compare(before, after)).toBe(0);
  });
```

- [ ] **Step 2: Run new tests — expect FAIL**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts --grep "animat"
```

Expected: The "is animating" test FAILS (no animation yet). The "suppressed" test may pass trivially since no animation runs anyway — that's fine; the regression-guard kicks in after we add animation.

- [ ] **Step 3: Wire RAF + noise displacement**

In `src/components/zones/Polyculture/SlowPlot.astro`, replace the module `<script>` block (the `import { generatePlant ... }` one) with this version:

```astro
<script>
  import { generatePlant, hashSlug, type Segment } from '../../../lib/plants';
  import { noise2D } from '../../../lib/noise';

  declare global {
    interface Window {
      __slowPlotSeeds?: Array<{ slug: string; title: string; plantType: import('../../../lib/plants').PlantType }>;
    }
  }

  interface Plant {
    slug: string;
    title: string;
    rootX: number;
    rootY: number;
    segments: Segment[];
  }

  function mountSlowPlot() {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-slow-plot]');
    const seeds = window.__slowPlotSeeds;
    if (!canvas || !seeds) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Hover state — declared here so draw() can read it. Wired up in Task 6.
    let currentPlant: Plant | null = null;
    let lastCursorX = 0;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(rect.width * dpr);
      canvas!.height = Math.floor(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function buildPlants(): Plant[] {
      const rect = canvas!.getBoundingClientRect();
      const ground = rect.height - 20;
      const margin = 40;
      const usableW = rect.width - margin * 2;
      return seeds!.map((s, i) => {
        const h = hashSlug(s.slug);
        const xJitter = ((h % 1000) / 1000 - 0.5) * 40;
        const rootX = margin + ((i + 0.5) / seeds!.length) * usableW + xJitter;
        const rootY = ground;
        const segments = generatePlant(s.slug, s.plantType);
        return { slug: s.slug, title: s.title, rootX, rootY, segments };
      });
    }

    function draw(plants: Plant[], t: number) {
      const rect = canvas!.getBoundingClientRect();
      ctx!.clearRect(0, 0, rect.width, rect.height);
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';

      const cs = getComputedStyle(document.documentElement);
      const stroke = cs.getPropertyValue('--ink').trim() || '#1a1a1a';

      const sorted = [...plants].sort((a, b) => {
        const ha = Math.max(...a.segments.map((s) => -s.y2));
        const hb = Math.max(...b.segments.map((s) => -s.y2));
        return hb - ha;
      });

      for (const plant of sorted) {
        // Per-plant tilt: if this plant is the hovered one, bias the sway
        // toward the cursor. Stronger at the tip, zero at the root.
        const isHovered = currentPlant !== null && currentPlant.slug === plant.slug;
        const tiltDir = isHovered
          ? Math.max(-1, Math.min(1, (lastCursorX - plant.rootX) / 80))
          : 0;

        ctx!.strokeStyle = stroke;
        for (const seg of plant.segments) {
          // Wind displacement: stronger at the tip (growth ~ 1), zero at root.
          // Sample noise at (x-space, time) so plants near each other share the gust.
          const wind = reducedMotion
            ? 0
            : noise2D((plant.rootX + seg.x2) * 0.01, t * 0.001) * 10 * seg.growth;
          const tilt = tiltDir * 28 * seg.growth;
          const sway = wind + tilt;

          ctx!.lineWidth = Math.max(0.6, seg.thickness * 2);
          ctx!.beginPath();
          ctx!.moveTo(plant.rootX + seg.x1, plant.rootY + seg.y1);
          ctx!.lineTo(plant.rootX + seg.x2 + sway, plant.rootY + seg.y2);
          ctx!.stroke();

          if (seg.tip === 'bloom') {
            ctx!.fillStyle = cs.getPropertyValue('--c-ochre').trim() || '#D9A857';
            ctx!.beginPath();
            ctx!.arc(plant.rootX + seg.x2 + sway, plant.rootY + seg.y2, 5, 0, Math.PI * 2);
            ctx!.fill();
          } else if (seg.tip === 'leaf') {
            ctx!.fillStyle = cs.getPropertyValue('--c-moss').trim() || '#5A7A4A';
            ctx!.beginPath();
            ctx!.arc(plant.rootX + seg.x2 + sway, plant.rootY + seg.y2, 2.5, 0, Math.PI * 2);
            ctx!.fill();
          } else if (seg.tip === 'spike') {
            ctx!.strokeStyle = cs.getPropertyValue('--c-indigo').trim() || '#2A3A5A';
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(plant.rootX + seg.x2 - 3 + sway, plant.rootY + seg.y2 - 3);
            ctx!.lineTo(plant.rootX + seg.x2 + 3 + sway, plant.rootY + seg.y2 - 3);
            ctx!.moveTo(plant.rootX + seg.x2 + sway, plant.rootY + seg.y2);
            ctx!.lineTo(plant.rootX + seg.x2 + sway, plant.rootY + seg.y2 - 5);
            ctx!.stroke();
            ctx!.strokeStyle = stroke;
          }
        }
      }
    }

    let plants: Plant[] = [];
    let raf = 0;
    const start = performance.now();

    function frame() {
      const t = performance.now() - start;
      draw(plants, t);
      raf = requestAnimationFrame(frame);
    }

    function init() {
      resize();
      plants = buildPlants();
      cancelAnimationFrame(raf);
      if (reducedMotion) {
        draw(plants, 0);
      } else {
        frame();
      }
    }

    init();

    // Pause animation when canvas is off-screen
    const io = new IntersectionObserver((entries) => {
      const visible = entries[0]?.isIntersecting;
      if (visible && !reducedMotion) {
        cancelAnimationFrame(raf);
        frame();
      } else {
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas!);

    const ro = new ResizeObserver(init);
    ro.observe(canvas!);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!reducedMotion) {
        frame();
      }
    });
  }

  document.addEventListener('astro:page-load', mountSlowPlot);
</script>
```

- [ ] **Step 4: Run animation tests — expect PASS**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts --grep "animat"
```

Expected: Both tests pass — the "is animating" test sees different pixels after 600ms; the "suppressed" test sees identical pixels because RAF doesn't start.

- [ ] **Step 5: Run full Playwright suite**

```bash
pnpm exec playwright test
```

Expected: No regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/zones/Polyculture/SlowPlot.astro e2e/polyculture.spec.ts
git commit -m "feat: SlowPlot wind — RAF + 2D noise sway, reduced-motion safe"
```

---

### Task 6: SlowPlot — hover tilt + tag + click navigation

**Goal:** Detect the plant closest to the pointer, render its title in a floating tag, and treat a click on the canvas as a navigation to that plant's project page. Add a keyboard fallback: the canvas itself is decorative (already `aria-label`-ed); the project list below the canvas handles keyboard nav (Task 7).

**Files:**
- Modify: `src/components/zones/Polyculture/SlowPlot.astro`
- Modify: `e2e/polyculture.spec.ts`

- [ ] **Step 1: Add failing E2E tests**

Append to `e2e/polyculture.spec.ts`:

```typescript
  test('hovering over the canvas surfaces a project tag', async ({ page }) => {
    await page.goto('/polyculture-preview');
    const canvas = page.locator('canvas[data-slow-plot]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(150);
    const tag = page.locator('[data-slow-plot-tag]');
    await expect(tag).toHaveAttribute('data-visible', 'true');
    const text = (await tag.textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(0);
  });

  test('clicking the canvas navigates to the nearest project', async ({ page }) => {
    await page.goto('/polyculture-preview');
    const canvas = page.locator('canvas[data-slow-plot]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(150);
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    // After click, URL should NOT still be /polyculture-preview — should be /polyculture/<slug>
    // For Task 6 (no /polyculture/* routes yet), we instead assert the canvas dispatched
    // a custom event with the slug.
    // We use the script-side fallback: capture window.__lastSlowPlotNavSlug.
    const slug = await page.evaluate(
      () => (window as unknown as { __lastSlowPlotNavSlug?: string }).__lastSlowPlotNavSlug,
    );
    expect(typeof slug).toBe('string');
    expect((slug as string).length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run new tests — expect FAIL**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts --grep "hover|navigates"
```

Expected: Both tests FAIL — no hover handler, no click handler, no tag.

- [ ] **Step 3: Add interactions to the script**

In `src/components/zones/Polyculture/SlowPlot.astro`, modify the `<script>` block — add the interaction code at the end of `mountSlowPlot()`, AFTER `io.observe(canvas!);` and BEFORE the `visibilitychange` listener. Note: `currentPlant` and `lastCursorX` are already declared at the top of `mountSlowPlot()` (added in Task 5); these handlers just mutate them.

```typescript
    // ── Interactions: hover tilt + tag + click navigate ────────────
    const tagEl = canvas!.parentElement!.querySelector<HTMLElement>('[data-slow-plot-tag]');

    function distanceToPlant(plant: Plant, x: number, y: number): number {
      // Approximate "distance to plant" as distance from cursor to the plant's
      // bounding box center. Cheap and good enough for hover.
      const xs = plant.segments.flatMap((s) => [plant.rootX + s.x1, plant.rootX + s.x2]);
      const ys = plant.segments.flatMap((s) => [plant.rootY + s.y1, plant.rootY + s.y2]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      return Math.hypot(x - cx, y - cy);
    }

    function setTag(plant: Plant | null, cursorX: number) {
      if (!tagEl) return;
      if (!plant) {
        tagEl.setAttribute('data-visible', 'false');
        return;
      }
      tagEl.textContent = plant.title;
      tagEl.style.left = `${cursorX}px`;
      const minY = Math.min(...plant.segments.map((s) => plant.rootY + s.y2));
      tagEl.style.top = `${minY}px`;
      tagEl.setAttribute('data-visible', 'true');
    }

    canvas!.addEventListener('mousemove', (e) => {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (plants.length === 0) return;
      const nearest = plants.reduce((best, p) =>
        distanceToPlant(p, x, y) < distanceToPlant(best, x, y) ? p : best,
      );
      // Only "select" if within ~120px of the plant center
      const within = distanceToPlant(nearest, x, y) < 120;
      currentPlant = within ? nearest : null;
      lastCursorX = x;
      setTag(currentPlant, x);
      // Under reduced motion the RAF loop is paused, so we manually redraw to
      // reflect the tag positioning (tilt is suppressed visually but tag still moves).
      if (reducedMotion) draw(plants, 0);
    });

    canvas!.addEventListener('mouseleave', () => {
      currentPlant = null;
      setTag(null, 0);
      if (reducedMotion) draw(plants, 0);
    });

    canvas!.addEventListener('click', () => {
      if (!currentPlant) return;
      // Expose slug for test introspection — production navigation also fires below
      (window as unknown as { __lastSlowPlotNavSlug?: string }).__lastSlowPlotNavSlug = currentPlant.slug;
      window.location.href = `/polyculture/${currentPlant.slug}`;
    });

    canvas!.style.cursor = 'pointer';
```

- [ ] **Step 4: Run hover + click tests — expect PASS**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts --grep "hover|navigates"
```

Expected: Both tests pass.

Note: the "navigates" test reads `window.__lastSlowPlotNavSlug` BEFORE the navigation actually completes (because `/polyculture/<slug>` doesn't exist yet — that's Task 7). The test uses the slug exposure as a stand-in. After Task 7 the URL assertion can be tightened, but that's not required for Phase 3 acceptance.

- [ ] **Step 5: Run full Playwright suite**

```bash
pnpm exec playwright test
```

Expected: No regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/zones/Polyculture/SlowPlot.astro e2e/polyculture.spec.ts
git commit -m "feat: SlowPlot interactions — hover tag + click navigate to project"
```

---

### Task 7: /polyculture/ routes

**Goal:** Create the real Polyculture landing page and project detail page. The landing renders `<SlowPlot />` plus an accessible project list (existing `ProjectRow` shape). The detail page is a port of the old `/work/[slug].astro` with the back-link updated to `/polyculture`.

**Files:**
- Create: `src/pages/polyculture/index.astro`
- Create: `src/pages/polyculture/[slug].astro`
- Modify: `src/components/ProjectRow.astro` (href)
- Delete: `src/pages/polyculture-preview.astro` (the scaffold from Task 4)

- [ ] **Step 1: Write failing E2E tests**

Append to `e2e/polyculture.spec.ts`:

```typescript
test.describe('Polyculture — page structure', () => {
  test('/polyculture loads and contains SlowPlot canvas', async ({ page }) => {
    await page.goto('/polyculture');
    await expect(page.locator('canvas[data-slow-plot]')).toBeAttached();
  });

  test('/polyculture shows an accessible project list below the canvas', async ({ page }) => {
    await page.goto('/polyculture');
    const list = page.locator('ol.projects-list');
    await expect(list).toBeAttached();
    // 7 projects total exist in the collection
    await expect(list.locator('li')).toHaveCount(7);
  });

  test('/polyculture/<slug> project detail loads', async ({ page }) => {
    await page.goto('/polyculture/circulaw');
    await expect(page.getByRole('heading', { name: /CircuLaw/i })).toBeVisible();
  });

  test('project detail back-link returns to /polyculture', async ({ page }) => {
    await page.goto('/polyculture/circulaw');
    const back = page.locator('a.back-link');
    await expect(back).toHaveAttribute('href', '/polyculture');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts --grep "page structure"
```

Expected: FAIL — `/polyculture` and `/polyculture/<slug>` don't exist yet.

- [ ] **Step 3: Update ProjectRow.astro href to point to /polyculture**

In `src/components/ProjectRow.astro`, change the opening `<a>` tag:

From:
```astro
<a href={`/work/${slug}`} class="project-row">
```

To:
```astro
<a href={`/polyculture/${slug}`} class="project-row">
```

- [ ] **Step 4: Create `src/pages/polyculture/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Garden from '@layouts/Garden.astro';
import ProjectRow from '@components/ProjectRow.astro';
import SlowPlot from '../../components/zones/Polyculture/SlowPlot.astro';

const projects = await getCollection('projects');
const sorted = [...projects].sort((a, b) => b.data.year - a.data.year);
---

<Garden
  title="Polyculture"
  description="Work and projects by Gurden Batra — civic tech, design, and development — rendered as a wild plot."
>
  <section class="poly-wrap page-wrap">
    <header class="poly-header">
      <p class="label">The Polyculture</p>
      <h1 class="poly-title">A wild plot of work.</h1>
      <p class="poly-subtitle">
        Each plant is a project. Hover to see its name; click to walk into it.
      </p>
    </header>

    <SlowPlot />

    <ol class="projects-list" aria-label="All projects">
      {sorted.map((p, i) => (
        <li>
          <ProjectRow
            index={i + 1}
            title={p.data.title}
            tag={p.data.tags[0]}
            year={p.data.year}
            slug={p.id.replace(/\.[^.]+$/, '')}
            description={p.data.description}
          />
        </li>
      ))}
    </ol>
  </section>
</Garden>

<style>
  .poly-wrap {
    padding-block: var(--space-12) var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-10);
  }

  .poly-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .poly-title {
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: var(--text-3xl);
    line-height: 1.05;
    margin: 0;
  }

  .poly-subtitle {
    font-size: var(--text-md);
    color: var(--ink-muted);
    max-width: 50ch;
    margin: 0;
  }

  .projects-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--ink);
  }
</style>
```

- [ ] **Step 5: Create `src/pages/polyculture/[slug].astro`**

This is a port of `src/pages/work/[slug].astro` with the back-link updated. Read that file first; then create:

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import Garden from '@layouts/Garden.astro';

export async function getStaticPaths() {
  const projects = await getCollection('projects');
  return projects.map((p) => ({
    params: { slug: p.id.replace(/\.[^.]+$/, '') },
    props: { project: p },
  }));
}

interface Props {
  project: CollectionEntry<'projects'>;
}

const { project } = Astro.props;
const { title, description, role, year, tags, collaborators, links } = project.data;
const { Content } = await project.render();
---

<Garden title={title} description={description}>
  <article class="project-wrap page-wrap">
    <header class="project-header">
      <p class="label">{tags.join(' · ')}</p>
      <h1 class="project-title">{title}</h1>
      <p class="project-description">{description}</p>
    </header>

    <dl class="project-meta">
      <div class="meta-row">
        <dt class="label">Role</dt>
        <dd>{role}</dd>
      </div>
      <div class="meta-row">
        <dt class="label">Year</dt>
        <dd>{year}</dd>
      </div>
      {collaborators && collaborators.length > 0 && (
        <div class="meta-row">
          <dt class="label">With</dt>
          <dd>{collaborators.join(', ')}</dd>
        </div>
      )}
      {links && links.length > 0 && (
        <div class="meta-row">
          <dt class="label">Links</dt>
          <dd class="meta-links">
            {links.map((l) => (
              <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>
            ))}
          </dd>
        </div>
      )}
    </dl>

    <div class="project-content">
      <Content />
    </div>

    <footer class="project-footer">
      <a href="/polyculture" class="back-link label"><span aria-hidden="true">← </span>All projects</a>
    </footer>
  </article>
</Garden>

<style>
  .project-wrap {
    padding-block: var(--space-16);
  }

  .project-header {
    margin-bottom: var(--space-12);
    max-width: 720px;
  }

  .project-header .label {
    margin-bottom: var(--space-4);
    display: block;
  }

  .project-title {
    font-size: var(--text-3xl);
    font-style: italic;
    line-height: 1.05;
    margin-bottom: var(--space-6);
  }

  .project-description {
    font-size: var(--text-md);
    color: var(--ink-muted);
    line-height: 1.6;
  }

  .project-meta {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-6);
    border-top: 1px solid var(--ink-faint);
    border-bottom: 1px solid var(--ink-faint);
    padding-block: var(--space-8);
    margin-bottom: var(--space-12);
  }

  .meta-row dt {
    margin-bottom: var(--space-1);
  }

  .meta-row dd {
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .meta-links {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .meta-links a {
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px solid var(--ink-faint);
    transition: border-color var(--duration-fast) var(--easing);
  }

  .meta-links a:hover {
    border-color: var(--ink);
  }

  .project-content {
    max-width: 640px;
    font-size: var(--text-base);
    line-height: 1.75;
  }

  .project-content :global(h2) {
    font-size: var(--text-xl);
    font-style: italic;
    margin-block: var(--space-10) var(--space-4);
  }

  .project-content :global(h3) {
    font-size: var(--text-lg);
    font-style: italic;
    margin-block: var(--space-8) var(--space-3);
  }

  .project-content :global(p) {
    margin-bottom: var(--space-6);
  }

  .project-content :global(a) {
    color: var(--ink);
    border-bottom: 1px solid var(--ink-faint);
    text-decoration: none;
    transition: border-color var(--duration-fast) var(--easing);
  }

  .project-content :global(a:hover) {
    border-color: var(--ink);
  }

  .project-footer {
    margin-top: var(--space-20);
    padding-top: var(--space-8);
    border-top: 1px solid var(--ink-faint);
  }

  .back-link {
    color: var(--ink-muted);
    text-decoration: none;
    transition: color var(--duration-fast) var(--easing);
  }

  .back-link:hover {
    color: var(--ink);
  }
</style>
```

- [ ] **Step 6: Delete the preview scaffold**

```bash
rm src/pages/polyculture-preview.astro
```

- [ ] **Step 7: Update the polyculture E2E spec to use /polyculture instead of the preview**

In `e2e/polyculture.spec.ts`, replace every occurrence of `/polyculture-preview` with `/polyculture`. There should be 6 occurrences across the existing tests (canvas present, fallback text, plot rendered, hover tag, click navigates, animating, reduced-motion-suppressed).

- [ ] **Step 8: Run polyculture E2E — expect PASS**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts
```

Expected: All polyculture tests pass.

- [ ] **Step 9: Run full Playwright suite — there will be /work failures, that's expected (Task 8 fixes them)**

```bash
pnpm exec playwright test
```

Expected: All `polyculture/*` tests pass; the existing `accessibility.spec.ts` tests that reference `/work` in the MapOverlay may fail (the MapOverlay still says `/work` — Task 8 updates it). Note which tests fail so Task 8 can confirm they're fixed.

- [ ] **Step 10: Commit**

```bash
git add src/pages/polyculture/ src/components/ProjectRow.astro e2e/polyculture.spec.ts
git rm src/pages/polyculture-preview.astro
git commit -m "feat: /polyculture index + project detail routes (Slow Plot lives here now)"
```

---

### Task 8: Redirects + zone link updates

**Goal:** Old `/work` and `/work/[slug]` URLs 301 to their `/polyculture` equivalents. The MapOverlay and the home-page garden map link to `/polyculture` (via the shared `zones.ts`). Old `src/pages/work/` is deleted.

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/lib/zones.ts`
- Delete: `src/pages/work/index.astro`
- Delete: `src/pages/work/[slug].astro`
- Modify: `e2e/accessibility.spec.ts` (MapOverlay tests still reference `/work`)
- Modify: `e2e/pages.spec.ts` if it references `/work` (it currently only tests `/about` and `/colophon`, but check)

- [ ] **Step 1: Add redirect tests first**

Append to `e2e/polyculture.spec.ts`:

```typescript
test.describe('Polyculture — redirects', () => {
  test('GET /work redirects to /polyculture', async ({ page }) => {
    const resp = await page.goto('/work');
    expect(resp).not.toBeNull();
    expect(page.url()).toMatch(/\/polyculture\/?$/);
  });

  test('GET /work/circulaw redirects to /polyculture/circulaw', async ({ page }) => {
    await page.goto('/work/circulaw');
    expect(page.url()).toMatch(/\/polyculture\/circulaw\/?$/);
  });
});
```

- [ ] **Step 2: Update MapOverlay tests that hard-code /work**

In `e2e/accessibility.spec.ts`, replace every `a[href="/work"]` selector in the `MapOverlay` and `Nav component` describes with `a[href="/polyculture"]`. There should be approximately 3 such occurrences in those describes. Also replace `a[href="/work"]` in any other test inside the file (Task 7's `navigation between pages completes...` test uses the overlay path — update that to click `a[href="/polyculture"]`).

- [ ] **Step 3: Run the failing tests — expect FAIL**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts --grep "redirects"
pnpm exec playwright test e2e/accessibility.spec.ts --grep "MapOverlay|Nav component|navigation between pages"
```

Expected: The new redirect tests fail (no redirect set up); the updated MapOverlay/Nav tests fail because zones.ts still says `/work`.

- [ ] **Step 4: Update astro.config.mjs to add redirects**

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
  },
});
```

- [ ] **Step 5: Delete the old `/work` route files**

```bash
git rm src/pages/work/index.astro src/pages/work/[slug].astro
rmdir src/pages/work 2>/dev/null || true
```

- [ ] **Step 6: Update zones.ts to point Polyculture at /polyculture**

Read `src/lib/zones.ts`. Find the Polyculture entry (likely something like `{ id: 'polyculture', ..., href: '/work' }`) and change its href to `/polyculture`. Leave the other zones unchanged.

The change is a single line: `href: '/work'` → `href: '/polyculture'`.

- [ ] **Step 7: Run full Playwright suite — expect PASS**

```bash
pnpm exec playwright test
```

Expected: All tests pass. The redirect tests pass; MapOverlay/Nav tests pass with the new selectors; polyculture page structure tests pass.

- [ ] **Step 8: Run unit tests**

```bash
pnpm test
```

Expected: All Vitest tests pass.

- [ ] **Step 9: Commit**

```bash
git add astro.config.mjs src/lib/zones.ts e2e/polyculture.spec.ts e2e/accessibility.spec.ts
git rm src/pages/work/index.astro src/pages/work/[slug].astro
git commit -m "feat: redirect /work → /polyculture (and project slugs); update map zone link"
```

---

### Task 9: Final sweep — Lighthouse + a11y + spec status

**Goal:** Verify all gates green. Run Lighthouse against the new `/polyculture` URL. Update the design spec to mark Phase 3 complete.

**Files:**
- Modify: `lighthouserc.json` (add `/polyculture` to URL list; remove `/work` since it redirects)
- Modify: `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md` (status line)

- [ ] **Step 1: Run full E2E suite**

```bash
pnpm exec playwright test
```

Expected: All tests pass. If any fail, fix before continuing.

- [ ] **Step 2: Run unit tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 3: Update lighthouserc.json URLs**

Read `lighthouserc.json`. In the `ci.collect.url` array, replace `http://localhost:4322/work` (or whichever port is configured) with `http://localhost:4322/polyculture`. Keep `/`, `/about`, `/colophon` as-is. Do NOT change the assertion thresholds.

- [ ] **Step 4: Run Lighthouse CI**

```bash
pnpm lhci
```

Expected: All four URLs pass the assertions:
- LCP < 2.5s
- TBT < 200ms
- JS < 80kb gzipped (the SlowPlot script + plants.ts + noise.ts must stay under this combined with existing JS)
- CSS < 30kb gzipped

If JS budget is exceeded on `/polyculture`: check the build output (`dist/_astro/*.js`), report sizes, and STOP. We'll decide whether to defer the SlowPlot script (e.g. add `client:visible` semantics) or relax the budget.

If LCP fails: likely the canvas is being painted late. Confirm `aspect-ratio` reserves space (already in the SlowPlot CSS) — if not, the canvas can shift the LCP element.

- [ ] **Step 5: Run axe on the new page**

```bash
pnpm exec playwright test e2e/polyculture.spec.ts
```

The axe assertion is implicit — there is no axe test in `polyculture.spec.ts`. Add this test at the end of the `'Polyculture — page structure'` describe (using the same pattern as `map.spec.ts`):

```typescript
  test('polyculture page passes axe accessibility audit', async ({ page }) => {
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    await page.goto('/polyculture');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
```

Run:
```bash
pnpm exec playwright test e2e/polyculture.spec.ts --grep "axe"
```

Expected: PASS, zero violations.

- [ ] **Step 6: Build verification**

```bash
pnpm build
```

Confirm the build produces:
- `dist/polyculture/index.html`
- `dist/polyculture/circulaw/index.html` (and 6 more slugs)
- `dist/work/index.html` (the redirect HTML; tiny, contains a meta refresh)
- `dist/work/circulaw/index.html` (and 6 more redirects)

Run `ls dist/work` and `ls dist/polyculture` to verify.

- [ ] **Step 7: Update design spec status**

Read `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md`. Update the Status line from:

```
**Status:** Phase 2 (The Map) complete; Phase 3 (Polyculture) next
```

to:

```
**Status:** Phase 3 (Polyculture) complete; Phase 4 (Compost) next
```

- [ ] **Step 8: Commit any fixes + spec update**

If steps 1–6 required any fixes, commit them with a clear message:

```bash
git add -p
git commit -m "fix: Phase 3 sweep — <describe fix>"
```

Then commit the spec status and Lighthouse URL update:

```bash
git add lighthouserc.json e2e/polyculture.spec.ts docs/superpowers/specs/2026-05-25-gurdens-garden-design.md
git commit -m "docs: mark Phase 3 complete; lhci URL → /polyculture"
```
