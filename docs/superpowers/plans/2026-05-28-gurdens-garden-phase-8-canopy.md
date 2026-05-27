# Phase 8: The Canopy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Canopy zone — a scattered-notes index at `/canopy` and ink-immersive detail pages at `/canopy/[slug]` — for poems, essays, music, and AV content.

**Architecture:** One new Astro content collection (`canopy`) with MDX files validated by `canopySchema`. `ScatteredNotes.astro` renders all pieces as absolutely positioned note cards with noise.ts-driven wind animation via RAF. `PieceDetail.astro` renders an ink-dark shell with either MDX body text (poems/essays) or an iframe embed (music/AV).

**Tech Stack:** Astro 5, Zod, MDX, `src/lib/noise.ts` (existing Perlin noise), Vitest (schema tests), Playwright + axe-core (E2E + accessibility), Lighthouse CI.

**Design spec:** `docs/superpowers/specs/2026-05-28-gurdens-garden-phase-8-canopy-design.md`

---

## Context

This is Phase 8 of the Gurden's Garden portfolio. The project is an Astro 5 SSG site at `/Users/gurden/Documents/code/g-xyz`. All development happens on `main`.

**Key existing files you'll touch:**
- `src/content/schemas.ts` — add `canopySchema`, remove `poemSchema`/`artSchema` stubs
- `src/content/config.ts` — register `canopy` collection, retire `poems`/`art`
- `src/content/schemas.test.ts` — update schema tests (vitest, `pnpm test`)
- `src/lib/zones.ts` — set `canopy.href` from `null` → `'/canopy'`
- `src/lib/noise.ts` — existing Perlin noise library, import as `import { noise2D } from '../../../lib/noise'`
- `lighthouserc.json` — add `/canopy` to the URL list
- `e2e/map.spec.ts` — update canopy zone from inactive to active

**Existing patterns to follow:**
- Astro layout: `import Garden from '@layouts/Garden.astro'` (aliased)
- Content rendering: `const { Content } = await entry.render()` (v4 compat API, still works in Astro 5.18)
- MDX file ids include extension: use `entry.id.replace(/\.[^.]+$/, '')` to get slug
- Lifecycle: `astro:page-load` to mount, `astro:before-swap` to clean up
- E2E: `pnpm exec playwright test` (or `pnpm e2e`); vitest: `pnpm test`
- Build: `pnpm build`; preview for LHCI: `pnpm preview --host 127.0.0.1 --port 4321`

---

## Task 1: canopySchema — TDD

**Files:**
- Modify: `src/content/schemas.ts`
- Modify: `src/content/schemas.test.ts`
- Modify: `src/content/config.ts`

---

- [ ] **Step 1: Remove `poemSchema` and `artSchema` tests**

Open `src/content/schemas.test.ts`. Delete the entire `describe('poemSchema', ...)` block and the entire `describe('artSchema', ...)` block. Leave `projectSchema` and `nowSchema` tests intact.

- [ ] **Step 2: Add failing `canopySchema` tests**

Append to `src/content/schemas.test.ts`:

```typescript
import { canopySchema } from './schemas';

describe('canopySchema', () => {
  it('accepts a valid poem with no embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'Elegy for the undercommons',
      kind: 'poem',
      year: 2023,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid essay with optional description', () => {
    const result = canopySchema.safeParse({
      title: 'What civic technology actually means',
      kind: 'essay',
      year: 2024,
      description: 'On care as infrastructure',
    });
    expect(result.success).toBe(true);
  });

  it('accepts music with embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'Eternal noises III',
      kind: 'music',
      year: 2024,
      embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts av with embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'Reactive study #4',
      kind: 'av',
      year: 2023,
      embedUrl: 'https://www.instagram.com/p/placeholder/embed/',
    });
    expect(result.success).toBe(true);
  });

  it('rejects music without embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'A track',
      kind: 'music',
      year: 2024,
    });
    expect(result.success).toBe(false);
  });

  it('rejects av without embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'A video',
      kind: 'av',
      year: 2023,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid kind', () => {
    const result = canopySchema.safeParse({
      title: 'Test',
      kind: 'photo',
      year: 2023,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-URL embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'A track',
      kind: 'music',
      year: 2024,
      embedUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects year below 1900', () => {
    const result = canopySchema.safeParse({
      title: 'Ancient poem',
      kind: 'poem',
      year: 1800,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = canopySchema.safeParse({ kind: 'poem', year: 2023 });
    expect(result.success).toBe(false);
  });
});
```

Also update the import at the top of `schemas.test.ts` — it currently imports `poemSchema` and `artSchema`. Change it to:

```typescript
import { describe, it, expect } from 'vitest';
import { projectSchema, nowSchema, canopySchema } from './schemas';
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — `canopySchema` is not exported (or the import fails).

- [ ] **Step 4: Add `canopySchema` to `src/content/schemas.ts`**

Open `src/content/schemas.ts`. Remove the `poemSchema` and `artSchema` exports entirely. Add `canopySchema` after `projectSchema`:

```typescript
export const canopySchema = z.object({
  title:       z.string(),
  kind:        z.enum(['poem', 'essay', 'music', 'av']),
  year:        z.number().int().min(1900).max(2100),
  description: z.string().optional(),
  embedUrl:    z.string().url().optional(),
}).refine(
  (d) => !['music', 'av'].includes(d.kind) || d.embedUrl !== undefined,
  { message: 'embedUrl required for music and av', path: ['embedUrl'] }
);
```

Keep `projectSchema`, `PLANT_TYPES`, `PlantType`, and `nowSchema` — only remove `poemSchema` and `artSchema`.

The final `src/content/schemas.ts`:

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

export const canopySchema = z.object({
  title:       z.string(),
  kind:        z.enum(['poem', 'essay', 'music', 'av']),
  year:        z.number().int().min(1900).max(2100),
  description: z.string().optional(),
  embedUrl:    z.string().url().optional(),
}).refine(
  (d) => !['music', 'av'].includes(d.kind) || d.embedUrl !== undefined,
  { message: 'embedUrl required for music and av', path: ['embedUrl'] }
);

export const nowSchema = z.object({
  carrying: z.array(z.object({ label: z.string().min(1), detail: z.string().min(1) })).min(1),
  reading:  z.array(z.object({ label: z.string().min(1), detail: z.string().min(1) })).min(1),
  contact:  z.array(z.object({
    label:  z.string().min(1),
    url:    z.union([z.string().url(), z.string().startsWith('mailto:')]),
    detail: z.string().min(1).optional(),
  })).min(1),
});
```

- [ ] **Step 5: Update `src/content/config.ts`**

Replace the entire file with:

```typescript
import { defineCollection } from 'astro:content';
import { projectSchema, canopySchema, nowSchema } from './schemas';

export const collections = {
  projects: defineCollection({ type: 'content', schema: projectSchema }),
  canopy:   defineCollection({ type: 'content', schema: canopySchema }),
  now:      defineCollection({ type: 'content', schema: nowSchema }),
};
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm test
```

Expected: all tests PASS. The `canopySchema` suite should show 10 passing tests.

- [ ] **Step 7: Commit**

```bash
git add src/content/schemas.ts src/content/schemas.test.ts src/content/config.ts
git commit -m "feat: add canopySchema, retire poemSchema and artSchema stubs"
```

---

## Task 2: Seed MDX content

**Files:**
- Create: `src/content/canopy/elegy-for-the-undercommons.mdx`
- Create: `src/content/canopy/three-ways-to-hold-rain.mdx`
- Create: `src/content/canopy/what-civic-technology-actually-means.mdx`
- Create: `src/content/canopy/eternal-noises-iii.mdx`
- Create: `src/content/canopy/reactive-study-4.mdx`

---

- [ ] **Step 1: Create the canopy content directory and seed files**

Create `src/content/canopy/elegy-for-the-undercommons.mdx`:

```mdx
---
title: "Elegy for the undercommons"
kind: poem
year: 2023
description: "After Stefano Harney & Fred Moten"
---

There is a kind of knowing
that lives below the floor —

not buried, but rooted.
Not lost, but patient
in the way that mycelia
are patient.

We learn it at the edges,
where the institution
has not yet extended
its reach.

There, in the margin,
in the fugitive study,
in the coffee before the meeting —

something passes between us
that has no name in the minutes
but holds the whole thing up.
```

Create `src/content/canopy/three-ways-to-hold-rain.mdx`:

```mdx
---
title: "Three ways to hold rain"
kind: poem
year: 2022
---

i. in your hands, briefly,
   before the cold takes it.

ii. in a bucket left out
    for the garden to decide.

iii. in the way a city pretends
     it goes straight to the sea
     and misses everything
     in between.
```

Create `src/content/canopy/what-civic-technology-actually-means.mdx`:

```mdx
---
title: "What civic technology actually means"
kind: essay
year: 2024
description: "On care as infrastructure"
---

We say "civic technology" and we mean, usually, an app.
A dashboard. A portal through which residents may submit
requests that will be processed in 3–5 business days.

But the word *civic* comes from *civis* — the citizen,
the person who inhabits the city as a full participant,
not merely a user of its services.

Technology that is truly civic does not process requests.
It builds the capacity of people to act together.
It makes visible what was hidden.
It holds open the space for deliberation
long enough for something to actually happen.

This is harder than building an app.
It requires knowing what the city is for —
which is a political question,
not a technical one.

The most important civic technology
is not a platform.
It is a room where people
are willing to stay
and disagree
and keep talking.
```

Create `src/content/canopy/eternal-noises-iii.mdx`:

```mdx
---
title: "Eternal noises III"
kind: music
year: 2024
description: "Texture study, late summer"
embedUrl: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/placeholder&color=%23f1e8d0&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false"
---
```

Create `src/content/canopy/reactive-study-4.mdx`:

```mdx
---
title: "Reactive study #4"
kind: av
year: 2023
description: "Audio-reactive video"
embedUrl: "https://www.instagram.com/p/placeholder/embed/"
---
```

- [ ] **Step 2: Verify content collection validates**

```bash
pnpm build
```

Expected: build succeeds with no schema validation errors. You should see Astro generate pages for `/canopy/...` routes (they don't exist yet — that's fine, you'll see 0 canopy pages generated, which is correct since the pages aren't created yet).

- [ ] **Step 3: Commit**

```bash
git add src/content/canopy/
git commit -m "feat: add 5 seed pieces for Canopy content collection"
```

---

## Task 3: ScatteredNotes.astro + /canopy/index.astro (static, no wind yet)

**Files:**
- Create: `e2e/canopy.spec.ts` (structure tests — written first, will fail)
- Create: `src/components/zones/Canopy/ScatteredNotes.astro`
- Create: `src/pages/canopy/index.astro`
- Modify: `src/lib/zones.ts`

---

- [ ] **Step 1: Write failing E2E structure tests**

Create `e2e/canopy.spec.ts`:

```typescript
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
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
pnpm exec playwright test e2e/canopy.spec.ts
```

Expected: all tests FAIL with "page.goto: net::ERR_CONNECTION_REFUSED" or 404 (the route doesn't exist yet).

- [ ] **Step 3: Create `src/components/zones/Canopy/ScatteredNotes.astro`**

```astro
---
// src/components/zones/Canopy/ScatteredNotes.astro
import type { CollectionEntry } from 'astro:content';

interface Props {
  pieces: CollectionEntry<'canopy'>[];
}

const { pieces } = Astro.props;

// LCG hash — deterministic integer from a string
function lcg(n: number): number {
  return ((n * 1664525 + 1013904223) & 0xffffffff) >>> 0;
}
function slugHash(slug: string): number {
  return slug.split('').reduce((h, c) => lcg(h ^ c.charCodeAt(0)), 0);
}

// Colour per kind
const KIND_STYLE: Record<string, { bg: string; fg: string }> = {
  poem:  { bg: '#5A7A4A', fg: '#f1e8d0' },
  essay: { bg: '#D9A857', fg: '#1A1A1A' },
  music: { bg: '#8A4F2E', fg: '#f1e8d0' },
  av:    { bg: '#2a3a5a', fg: '#f1e8d0' },
};

// Compute base positions at build time using a 900px reference width.
// Left is stored as a percentage so it scales with the container.
// Top is stored in px because the container has a fixed height of 420px.
const W_REF = 900;
const COL_W = W_REF / 3; // 300px per column

const positionedPieces = pieces.map(piece => {
  const slug = piece.id.replace(/\.[^.]+$/, '');
  const h = slugHash(slug);
  const col = h % 3;
  const xPx = col * COL_W + ((h >> 4) % Math.floor(COL_W * 0.6));
  const yPx = 20 + ((h >> 8) % 340);
  const r   = ((h >> 12) % 17) - 8; // base rotation: −8° to +8°
  const leftPct = ((xPx / W_REF) * 100).toFixed(2);
  const { bg, fg } = KIND_STYLE[piece.data.kind] ?? KIND_STYLE.poem;
  return { piece, slug, leftPct, topPx: yPx, r, bg, fg };
});
---

<div class="scatter-wrap" data-scatter-wrap>
  {positionedPieces.map(({ piece, slug, leftPct, topPx, r, bg, fg }) => (
    <a
      href={`/canopy/${slug}`}
      class="note"
      data-note
      data-left-pct={leftPct}
      data-top-px={topPx}
      data-r={r}
      style={`left:${leftPct}%;top:${topPx}px;transform:rotate(${r}deg);background:${bg};color:${fg};`}
      aria-label={`${piece.data.kind}: ${piece.data.title}`}
    >
      <span class="note-kind">{piece.data.kind}</span>
      <span class="note-title">{piece.data.title}</span>
      {piece.data.description && <span class="note-desc">{piece.data.description}</span>}
      <span class="note-year">{piece.data.year}</span>
    </a>
  ))}

  <div class="colour-key" data-colour-key aria-hidden="true">
    <span class="key-label">Key:</span>
    <span class="key-item"><span class="key-swatch" style="background:#5A7A4A"></span>Poem</span>
    <span class="key-item"><span class="key-swatch" style="background:#D9A857"></span>Essay</span>
    <span class="key-item"><span class="key-swatch" style="background:#8A4F2E"></span>Music</span>
    <span class="key-item"><span class="key-swatch" style="background:#2a3a5a"></span>A/V</span>
  </div>
</div>

<style>
  .scatter-wrap {
    position: relative;
    height: 420px;
    overflow: hidden;
    margin-bottom: var(--space-8, 2rem);
  }

  .note {
    position: absolute;
    padding: 10px 14px;
    border-radius: 1px;
    font-style: italic;
    cursor: pointer;
    text-decoration: none;
    max-width: 150px;
    box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.18);
    transition: box-shadow 0.2s, filter 0.2s;
    transform-origin: top center;
  }

  .note:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
    filter: brightness(1.06);
    z-index: 10;
  }

  .note:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    z-index: 10;
  }

  .note-kind {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    opacity: 0.75;
    margin-bottom: 4px;
    font-style: normal;
  }

  .note-title {
    display: block;
    font-size: 11px;
    line-height: 1.4;
  }

  .note-desc {
    display: block;
    font-size: 9px;
    opacity: 0.7;
    margin-top: 3px;
    line-height: 1.4;
  }

  .note-year {
    display: block;
    font-size: 8px;
    opacity: 0.55;
    margin-top: 5px;
    font-style: normal;
  }

  .colour-key {
    position: absolute;
    bottom: 16px;
    left: 0;
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .key-label {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #B8B0A0;
  }

  .key-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    color: #4A4A48;
    font-style: normal;
  }

  .key-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .scatter-wrap {
      height: auto;
      min-height: 520px;
    }

    .note {
      max-width: 120px;
    }
  }
</style>
```

- [ ] **Step 4: Create `src/pages/canopy/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Garden from '@layouts/Garden.astro';
import ScatteredNotes from '../../components/zones/Canopy/ScatteredNotes.astro';

const pieces = await getCollection('canopy');
---

<Garden
  title="The Canopy — Gurden's Garden"
  description="Poems, essays, music, and audio-visual work — the art that grows alongside the rest."
>
  <div class="canopy-wrap page-wrap">

    <header class="canopy-header">
      <p class="label zone-emoji" aria-hidden="true">🌳</p>
      <h1>The Canopy</h1>
      <p class="canopy-intro">
        Poems, essays, music, and audio-visual work — the art that grows alongside the rest.
      </p>
    </header>

    <section class="scatter-section" aria-labelledby="scatter-heading">
      <h2 id="scatter-heading" class="label section-heading">All pieces</h2>
      <ScatteredNotes pieces={pieces} />
    </section>

  </div>
</Garden>

<style>
  .canopy-wrap {
    padding-block: var(--space-16);
  }

  .canopy-header {
    margin-bottom: var(--space-16);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .zone-emoji {
    font-size: var(--text-xl);
    margin-bottom: var(--space-3);
    display: block;
  }

  .canopy-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .canopy-intro {
    font-size: var(--text-md);
    line-height: 1.65;
    max-width: 560px;
  }

  .section-heading {
    display: block;
    margin-bottom: var(--space-8);
  }

  .scatter-section {
    margin-bottom: var(--space-20);
  }
</style>
```

- [ ] **Step 5: Update `src/lib/zones.ts` — activate Canopy**

Find the canopy entry in `zones.ts`:
```typescript
  {
    id: 'canopy',
    emoji: '🌳',
    name: 'The Canopy',
    shortDesc: 'Art',
    longDesc: 'Art, poetry & essays',
    href: null,
  },
```

Change `href: null` to `href: '/canopy'`.

- [ ] **Step 6: Run E2E tests to verify they pass**

```bash
pnpm exec playwright test e2e/canopy.spec.ts
```

Expected: all 5 structure and reduced-motion tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/zones/Canopy/ src/pages/canopy/index.astro src/lib/zones.ts e2e/canopy.spec.ts
git commit -m "feat: ScatteredNotes component and /canopy index page (static positions)"
```

---

## Task 4: Wind animation in ScatteredNotes

**Files:**
- Modify: `src/components/zones/Canopy/ScatteredNotes.astro`
- Modify: `e2e/canopy.spec.ts`

---

- [ ] **Step 1: Add a reduced-motion wind E2E test**

Open `e2e/canopy.spec.ts`. Add this test inside the existing `'Canopy index — reduced motion'` describe block (after the existing test):

```typescript
  test('note positions are set without animation under reduced motion', async ({ page }) => {
    await page.goto('/canopy');
    // Notes should have non-empty left/top inline styles from build time
    const note = page.locator('[data-note]').first();
    const style = await note.getAttribute('style');
    expect(style).toMatch(/left:\d/);
    expect(style).toMatch(/top:\d/);
  });
```

- [ ] **Step 2: Run to verify new test passes (it already should — positions are set at build time)**

```bash
pnpm exec playwright test e2e/canopy.spec.ts --grep "reduced motion"
```

Expected: PASS (positions are inline styles from SSG, no JS needed).

- [ ] **Step 3: Add the wind script to `ScatteredNotes.astro`**

Append this `<script>` block at the end of `src/components/zones/Canopy/ScatteredNotes.astro`, after the `<style>` block:

```astro
<script>
  import { noise2D } from '../../../lib/noise';

  let cleanup: (() => void) | null = null;

  function mount(): void {
    const wrap = document.querySelector<HTMLElement>('[data-scatter-wrap]');
    if (!wrap) return;

    const notes = Array.from(wrap.querySelectorAll<HTMLElement>('[data-note]'));
    if (notes.length === 0) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return; // inline styles from SSG already set correct positions

    const H = 420; // scatter container height in px

    let rafId: number;

    function tick(): void {
      const t = performance.now() / 4000;
      const W = wrap!.clientWidth;
      if (W === 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      notes.forEach(note => {
        const br        = parseFloat(note.dataset.r ?? '0');
        const leftPct   = parseFloat(note.dataset.leftPct ?? '0');
        const topPx     = parseFloat(note.dataset.topPx ?? '0');
        const x         = (leftPct / 100) * W;
        const y         = topPx;

        const nx    = x / W;
        const ny    = y / H;
        const windR = noise2D(nx + t, ny + t) * 4;        // ±4° rotation delta
        const driftY = noise2D(nx, ny + t * 0.5) * 3;     // ±3px vertical drift

        note.style.transform = `rotate(${br + windR}deg) translateY(${driftY}px)`;
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    cleanup = (): void => cancelAnimationFrame(rafId);
  }

  document.addEventListener('astro:page-load', () => {
    cleanup?.();
    cleanup = null;
    mount();
  });

  document.addEventListener('astro:before-swap', () => {
    cleanup?.();
    cleanup = null;
  });
</script>
```

- [ ] **Step 4: Verify the build still passes**

```bash
pnpm build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Run full canopy E2E suite**

```bash
pnpm exec playwright test e2e/canopy.spec.ts
```

Expected: all tests PASS (wind animation is purely additive to the existing styles, so the test suite remains green).

- [ ] **Step 6: Commit**

```bash
git add src/components/zones/Canopy/ScatteredNotes.astro e2e/canopy.spec.ts
git commit -m "feat: add noise.ts wind animation to ScatteredNotes (RAF, reduced-motion safe)"
```

---

## Task 5: PieceDetail.astro + /canopy/[slug].astro

**Files:**
- Create: `src/components/zones/Canopy/PieceDetail.astro`
- Create: `src/pages/canopy/[slug].astro`
- Modify: `e2e/canopy.spec.ts`

---

- [ ] **Step 1: Add failing E2E tests for the detail page**

Open `e2e/canopy.spec.ts`. Append these describe blocks:

```typescript
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
    await firstNote.click();
    await expect(page).toHaveURL(/\/canopy\/.+/);
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

test.describe('Canopy — accessibility', () => {
  test('index passes axe audit', async ({ page }) => {
    await page.goto('/canopy');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('poem detail passes axe audit', async ({ page }) => {
    await page.goto('/canopy/elegy-for-the-undercommons');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
pnpm exec playwright test e2e/canopy.spec.ts --grep "detail|navigation|accessibility"
```

Expected: FAIL — `/canopy/elegy-for-the-undercommons` returns 404.

- [ ] **Step 3: Create `src/components/zones/Canopy/PieceDetail.astro`**

```astro
---
// src/components/zones/Canopy/PieceDetail.astro
import type { CollectionEntry } from 'astro:content';

interface Props {
  entry:   CollectionEntry<'canopy'>;
  Content: unknown; // Astro MDX component
}

const { entry, Content } = Astro.props;
const { title, kind, year, description, embedUrl } = entry.data;

const KIND_COLOR: Record<string, string> = {
  poem:  '#5A7A4A',
  essay: '#D9A857',
  music: '#8A4F2E',
  av:    '#2a3a5a',
};
const kindColor = KIND_COLOR[kind] ?? '#f1e8d0';

function platformName(url: string): string {
  if (url.includes('soundcloud')) return 'SoundCloud';
  if (url.includes('instagram'))  return 'Instagram';
  return 'original source';
}
---

<div class="piece-wrap page-wrap">

  <a href="/canopy" class="back-link">← The Canopy</a>

  <div class="piece-shell">
    <div class="piece-meta">
      <span class="piece-kind" style={`color:${kindColor}`}>{kind}</span>
      <span class="piece-sep" aria-hidden="true">·</span>
      <span class="piece-year">{year}</span>
    </div>

    <h1 class="piece-title">{title}</h1>

    {description && <p class="piece-description">{description}</p>}

    {(kind === 'poem' || kind === 'essay') && (
      <div class={`piece-body piece-body--${kind}`}>
        <!-- @ts-ignore Astro MDX Content component -->
        <Content />
      </div>
    )}

    {(kind === 'music' || kind === 'av') && embedUrl && (
      <div class="piece-embed-wrap">
        <iframe
          src={embedUrl}
          loading="lazy"
          title={title}
          class="piece-embed"
          scrolling="no"
          allow="autoplay"
          width="100%"
          height="166"
        ></iframe>
        <a
          href={embedUrl}
          class="piece-source-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          ↗ Open on {platformName(embedUrl)}
        </a>
      </div>
    )}
  </div>

</div>

<style>
  .piece-wrap {
    padding-block: var(--space-16);
    max-width: 600px;
  }

  .back-link {
    display: inline-block;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #4A4A48;
    text-decoration: none;
    margin-bottom: var(--space-12, 3rem);
  }

  .back-link:hover {
    color: var(--c-paper, #f1e8d0);
  }

  .piece-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: var(--space-4, 1rem);
  }

  .piece-kind {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-style: normal;
  }

  .piece-sep {
    font-size: 8px;
    color: #3a3a3a;
  }

  .piece-year {
    font-size: 8px;
    color: #4A4A48;
    font-style: normal;
  }

  .piece-title {
    font-size: clamp(1.25rem, 3vw, 1.5rem);
    font-style: italic;
    color: var(--c-paper, #f1e8d0);
    line-height: 1.25;
    margin-bottom: var(--space-8, 2rem);
  }

  .piece-description {
    font-size: 11px;
    color: #6b6b6b;
    margin-bottom: var(--space-8, 2rem);
    line-height: 1.6;
  }

  /* Poem body */
  .piece-body--poem {
    font-size: 13px;
    color: #c8c0b0;
    line-height: 2;
    font-style: italic;
    white-space: pre-line;
  }

  .piece-body--poem p {
    margin-bottom: var(--space-4, 1rem);
  }

  /* Essay body */
  .piece-body--essay {
    font-size: 14px;
    color: #c8c0b0;
    line-height: 1.75;
  }

  .piece-body--essay p {
    margin-bottom: var(--space-6, 1.5rem);
  }

  .piece-body--essay em {
    font-style: italic;
    color: var(--c-paper, #f1e8d0);
  }

  /* Embed */
  .piece-embed-wrap {
    margin-top: var(--space-4, 1rem);
  }

  .piece-embed {
    display: block;
    width: 100%;
    border: none;
    border-radius: 1px;
  }

  .piece-source-link {
    display: inline-block;
    margin-top: var(--space-4, 1rem);
    font-size: 9px;
    color: #4A4A48;
    text-decoration: none;
    letter-spacing: 0.5px;
  }

  .piece-source-link:hover {
    color: var(--c-paper, #f1e8d0);
  }
</style>
```

- [ ] **Step 4: Create `src/pages/canopy/[slug].astro`**

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import Garden from '@layouts/Garden.astro';
import PieceDetail from '../../components/zones/Canopy/PieceDetail.astro';

export async function getStaticPaths() {
  const pieces = await getCollection('canopy');
  return pieces.map((entry) => ({
    params: { slug: entry.id.replace(/\.[^.]+$/, '') },
    props:  { entry },
  }));
}

interface Props {
  entry: CollectionEntry<'canopy'>;
}

const { entry } = Astro.props;
const { Content } = await entry.render();
const { title, description } = entry.data;
---

<Garden
  title={`${title} — The Canopy`}
  description={description ?? `A ${entry.data.kind} by Gurden Batra.`}
>
  <PieceDetail entry={entry} Content={Content} />
</Garden>

<style is:global>
  /* Ink-immersive: override the paper background for this page only */
  body {
    background-color: var(--c-ink, #1A1A1A);
  }
</style>
```

- [ ] **Step 5: Run E2E tests to verify they pass**

```bash
pnpm exec playwright test e2e/canopy.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/zones/Canopy/PieceDetail.astro src/pages/canopy/[slug].astro e2e/canopy.spec.ts
git commit -m "feat: PieceDetail component and /canopy/[slug] detail pages (ink immersive)"
```

---

## Task 6: Update map.spec.ts + verify full E2E suite

**Files:**
- Modify: `e2e/map.spec.ts`

---

- [ ] **Step 1: Update `e2e/map.spec.ts`**

In `map.spec.ts`, find the test `'active zones are keyboard-navigable links'`. The canopy zone is now active, so add it:

Find this block:
```typescript
  test('active zones are keyboard-navigable links', async ({ page }) => {
    await page.goto('/');
    const map = page.locator('.garden-map');
    await expect(map.locator('[data-zone="polyculture"] a[href="/polyculture"]')).toBeAttached();
    await expect(map.locator('[data-zone="compost"] a[href="/compost"]')).toBeAttached();
    await expect(map.locator('[data-zone="beds"] a[href="/beds"]')).toBeAttached();
    await expect(map.locator('[data-zone="hive"] a[href="/hive"]')).toBeAttached();
    await expect(map.locator('[data-zone="mycelium"] a[href="/mycelium"]')).toBeAttached();
  });
```

Add the canopy assertion:
```typescript
    await expect(map.locator('[data-zone="canopy"] a[href="/canopy"]')).toBeAttached();
```

Also find the test `'inactive zones have no interactive link'`:
```typescript
  test('inactive zones have no interactive link', async ({ page }) => {
    await page.goto('/');
    const map = page.locator('.garden-map');
    await expect(map.locator('[data-zone="canopy"] a')).not.toBeAttached();
  });
```

Delete this test entirely — canopy is now active.

- [ ] **Step 2: Run the full E2E suite**

```bash
pnpm exec playwright test
```

Expected: all tests PASS across chromium and webkit. No regressions.

- [ ] **Step 3: Commit**

```bash
git add e2e/map.spec.ts
git commit -m "test: update map spec — canopy zone now active"
```

---

## Task 7: Lighthouse CI + final sweep

**Files:**
- Modify: `lighthouserc.json`
- Modify: `docs/superpowers/specs/2026-05-28-gurdens-garden-phase-8-canopy-design.md`

---

- [ ] **Step 1: Add `/canopy` to `lighthouserc.json`**

Open `lighthouserc.json`. Find the `"url"` array inside `"collect"`:
```json
"url": [
  "http://localhost:4321/",
  "http://localhost:4321/polyculture",
  "http://localhost:4321/compost",
  "http://localhost:4321/beds",
  "http://localhost:4321/hive",
  "http://localhost:4321/mycelium"
],
```

Add `"http://localhost:4321/canopy"` to the array:
```json
"url": [
  "http://localhost:4321/",
  "http://localhost:4321/polyculture",
  "http://localhost:4321/compost",
  "http://localhost:4321/beds",
  "http://localhost:4321/hive",
  "http://localhost:4321/mycelium",
  "http://localhost:4321/canopy"
],
```

- [ ] **Step 2: Build the project**

```bash
pnpm build
```

Expected: build succeeds. Astro generates pages for `/canopy` and `/canopy/[slug]` for all 5 seed pieces.

- [ ] **Step 3: Run Lighthouse CI**

```bash
pnpm lhci autorun
```

Expected: all 7 URLs pass. Thresholds: performance ≥ 0.9, accessibility = 1.0. If `/canopy` fails performance (animation script), check that the script is below the 80kB budget — `noise.ts` is tiny and the script itself is minimal. If there are LHCI pre-existing warnings (bfcache, unminified JS in dev mode), check that they are pre-existing and not regressions introduced by this task.

If LHCI exits with code 1 due to pre-existing failures unrelated to canopy, note them in the commit message as pre-existing and move on.

- [ ] **Step 4: Run full vitest suite**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 5: Run full E2E suite one final time**

```bash
pnpm exec playwright test
```

Expected: all tests PASS across chromium and webkit.

- [ ] **Step 6: Update the design spec status**

Open `docs/superpowers/specs/2026-05-28-gurdens-garden-phase-8-canopy-design.md`. Change the status line at the top:

```markdown
**Status:** Approved — ready for implementation
```

to:

```markdown
**Status:** Complete — Phase 8 implemented and verified
```

- [ ] **Step 7: Commit**

```bash
git add lighthouserc.json docs/superpowers/specs/2026-05-28-gurdens-garden-phase-8-canopy-design.md
git commit -m "feat: add /canopy to Lighthouse CI; Phase 8 complete

- /canopy index: scattered notes with noise.ts wind animation
- /canopy/[slug]: ink-immersive detail (MDX body or iframe embed)
- 5 seed pieces: 2 poems, 1 essay, 1 music, 1 AV
- canopySchema replaces poemSchema + artSchema stubs
- Full E2E suite: structure, navigation, detail, axe, reduced motion"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ canopySchema with embedUrl refine — Task 1
- ✅ 5 seed MDX pieces — Task 2
- ✅ ScatteredNotes: LCG hash positions, 3-column layout, colour coding, hover, colour key — Task 3
- ✅ Wind animation: noise2D, RAF, reduced motion guard, astro lifecycle — Task 4
- ✅ PieceDetail: back link, kind badge, year, title, MDX body / iframe — Task 5
- ✅ /canopy/index.astro with Garden layout — Task 3
- ✅ /canopy/[slug].astro with dark body override — Task 5
- ✅ zones.ts href activated — Task 3
- ✅ E2E: structure, navigation, detail, axe, reduced motion — Tasks 3, 5
- ✅ lighthouserc.json extended — Task 7
- ✅ map.spec.ts updated — Task 6
