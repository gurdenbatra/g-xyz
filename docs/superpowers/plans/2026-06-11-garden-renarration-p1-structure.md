# Garden Re-narration — Phase 1 (Structure) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-map the six garden zones to five new ecological identities with full route/id renames, redirects, the `canopy`→`mulch` content-collection rename, and the collaborator-network merge into the Hive — leaving a fully working, testable site on its own.

**Architecture:** Pure structural refactor. `zones.ts` shrinks to five zones; page directories are renamed; legacy slugs become redirects; the `canopy` content collection becomes `mulch`; `NodesGraph` (the network) moves into the Hive page. Glyph *drawings*, homepage composition, day/night, and the ambient layer are explicitly out of scope (Phases 2–4) — in this phase glyphs only need to keep rendering under their new ids.

**Tech Stack:** Astro 5, TypeScript, Astro content collections, MDX, Playwright (chromium+webkit, baseURL `http://localhost:4321`), Vitest, Lighthouse CI, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-11-garden-renarration-and-ambient-ecology-design.md`

**Scope note:** This is the first of four sequential plans for the approved spec. P2 (glyph redraws + prime/secondary composition), P3 (local-hour day/night), and P4 (ambient ecology) each get their own plan after this one lands green.

---

## Reference — the rename map

| Content | Old id / slug | New id / slug | Old page dir | New page dir | Component(s) |
|---|---|---|---|---|---|
| Work & projects | `polyculture` `/polyculture` | `flora` `/flora` | `pages/polyculture/` | `pages/flora/` | SlowPlot (`projects` collection) |
| Art/music/poetry/essays | `canopy` `/canopy` | `mulch` `/mulch` | `pages/canopy/` | `pages/mulch/` | ScatteredNotes, PieceDetail (`mulch` collection) |
| Now/contact + network | `hive` + `mycelium` `/hive` `/mycelium` | `hive` `/hive` | `pages/hive/` (+ delete `pages/mycelium/`) | `pages/hive/` | LiveFlock + **NodesGraph (merged in)** |
| Story & origins | `compost` `/compost` | `roots` `/roots` | `pages/compost/` | `pages/roots/` | Strata |
| Design/tech & care | `beds` `/beds` | `castings` `/castings` | `pages/beds/` | `pages/castings/` | TendedBeds |

New `zones` array order (drives MapOverlay + homepage ecological order): `flora, hive, mulch, roots, castings`.

`MapOverlay.astro` reads `zones` dynamically (`zone.id/href/name/longDesc`) — it needs **no edit**; it inherits the new five automatically. Verify in Task 7.

---

## Task 0: Preflight — clean tree + green baseline

**Files:** none (verification only)

- [ ] **Step 1:** Run `git status --short` → expect empty. If not, stop and ask.
- [ ] **Step 2:** Run `pnpm test` → expect all pass (135).
- [ ] **Step 3:** Run `pnpm exec playwright test --project=chromium` → note the pass count and the 2 pre-existing `compost.spec.ts` scroll-reveal failures (lines ~52, ~68). These are known-flaky and unrelated; everything else passes.

---

## Task 1: `zones.ts` → five zones (TDD) + fix compile-time consumers

Renaming the `ZoneId` union breaks every file that hardcodes an old id at compile time: `index.astro` (its `ecologicalOrder` + `zonePos`) and `ZoneGlyph.astro` (its `id === '…'` branches). All three change together so the build compiles. Glyph *drawings* are not redrawn here — each new id simply renders the most-fitting existing drawing (P2 redraws them).

**Files:**
- Create: `src/lib/zones.test.ts`
- Modify (full rewrite): `src/lib/zones.ts`
- Modify: `src/pages/index.astro` (frontmatter only)
- Modify: `src/components/home/ZoneGlyph.astro` (branch ids + clip ids)

- [ ] **Step 1: Write the failing test**

Create `src/lib/zones.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { zones, type ZoneId } from './zones';

describe('zones', () => {
  it('has exactly five zones', () => {
    expect(zones).toHaveLength(5);
  });

  it('uses the new ecological ids in order', () => {
    expect(zones.map((z) => z.id)).toEqual([
      'flora',
      'hive',
      'mulch',
      'roots',
      'castings',
    ] satisfies ZoneId[]);
  });

  it('has a unique, non-null href per zone', () => {
    const hrefs = zones.map((z) => z.href);
    expect(hrefs.every((h) => typeof h === 'string' && h.startsWith('/'))).toBe(true);
    expect(new Set(hrefs).size).toBe(zones.length);
  });

  it('drops every retired id', () => {
    const ids = new Set<string>(zones.map((z) => z.id));
    for (const gone of ['polyculture', 'canopy', 'compost', 'beds', 'mycelium']) {
      expect(ids.has(gone)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `pnpm test src/lib/zones.test.ts` → FAIL (still six zones / old ids).

- [ ] **Step 3: Rewrite `src/lib/zones.ts`**

Replace the ENTIRE contents with:

```ts
export type ZoneId =
  | 'flora'
  | 'hive'
  | 'mulch'
  | 'roots'
  | 'castings';

export interface Zone {
  id: ZoneId;
  name: string;
  shortDesc: string;
  longDesc: string;
  href: string | null;
}

export const zones: readonly Zone[] = [
  {
    id: 'flora',
    name: 'The Flora & Fauna',
    shortDesc: 'Work',
    longDesc: 'Work & projects',
    href: '/flora',
  },
  {
    id: 'hive',
    name: 'The Hive',
    shortDesc: 'Now',
    longDesc: 'Now, contact & network',
    href: '/hive',
  },
  {
    id: 'mulch',
    name: 'The Mulch',
    shortDesc: 'Art',
    longDesc: 'Art, music, poetry & essays',
    href: '/mulch',
  },
  {
    id: 'roots',
    name: 'The Roots',
    shortDesc: 'Story',
    longDesc: 'Story & origins',
    href: '/roots',
  },
  {
    id: 'castings',
    name: 'The Compost',
    shortDesc: 'Care',
    longDesc: 'Design, tech & care',
    href: '/castings',
  },
] as const;
```

- [ ] **Step 4: Update `src/pages/index.astro` frontmatter**

Replace the `ecologicalOrder` array and the `zonePos` record with:

```ts
const ecologicalOrder: readonly ZoneId[] = [
  'flora',
  'hive',
  'mulch',
  'roots',
  'castings',
];
const orderedZones = ecologicalOrder.flatMap((id) => {
  const z = zones.find((zone) => zone.id === id);
  if (!z) throw new Error(`[index.astro] Zone "${id}" not found in zones`);
  return z;
});

// Interim placements (valid + non-overlapping). Phase 2 sets the final
// prime/secondary composition and glyph sizing.
const zonePos: Record<ZoneId, { x: string; y: string }> = {
  flora: { x: '32%', y: '24%' },
  hive: { x: '70%', y: '20%' },
  mulch: { x: '28%', y: '58%' },
  roots: { x: '18%', y: '84%' },
  castings: { x: '72%', y: '84%' },
};
```

Leave the rest of `index.astro` (template + `<style>`) unchanged.

- [ ] **Step 5: Update `src/components/home/ZoneGlyph.astro` branch ids**

The component renders one `<svg>` per `id === '…'` branch. Keep every drawing body byte-for-byte; only change which id triggers it and rename the zone-prefixed clipPath ids so they stay self-describing. Apply these exact id substitutions (condition + any `zg-<old>-…` clip id + its `url(#…)`):

- `id === 'polyculture'` → `id === 'flora'` (drawing has no clipPath id to rename)
- `id === 'canopy'` → `id === 'mulch'`; rename `zg-canopy-crown` → `zg-mulch-crown` (both the `<clipPath id>` and the `clip-path="url(#…)"`)
- `id === 'compost'` → `id === 'roots'`; rename `zg-compost-heap` → `zg-roots-heap`
- `id === 'beds'` → `id === 'castings'`; rename `zg-beds-box` → `zg-castings-box`
- `id === 'hive'` → unchanged (`zg-hive-body` stays)
- **Delete** the entire `{id === 'mycelium' && ( … )}` block.

No CSS or other markup changes. (P2 redraws all five bodies to their true metaphors; this step only keeps them compiling and rendering.)

- [ ] **Step 6: Run unit tests** — `pnpm test src/lib/zones.test.ts` → PASS; `pnpm test` → all pass (135 + new file).
- [ ] **Step 7: Type-check** — `pnpm exec astro check` → no NEW errors (the pre-existing dynamic-route error is acceptable; note that route-file errors for renamed pages are addressed in Task 3).
- [ ] **Step 8: Commit**

```bash
git add src/lib/zones.ts src/lib/zones.test.ts src/pages/index.astro src/components/home/ZoneGlyph.astro
git commit -m "feat: re-map garden to five ecological zones (flora/hive/mulch/roots/castings)"
```

---

## Task 2: Rename the `canopy` content collection → `mulch` (TDD)

The collection key, its schema export, the content directory, and every consumer move from `canopy` to `mulch`. The `now` and `projects` collections are untouched.

**Files:**
- Modify: `src/content/schemas.test.ts`, `src/content/schemas.ts`, `src/content/config.ts`
- Rename: `src/content/canopy/` → `src/content/mulch/`
- Modify: `src/components/zones/Canopy/ScatteredNotes.astro`, `src/components/zones/Canopy/PieceDetail.astro`
- Modify: `src/pages/canopy/index.astro`, `src/pages/canopy/[slug].astro` (the `getCollection`/`CollectionEntry` calls only — the dir move is Task 3)

- [ ] **Step 1: Update the failing test** — in `src/content/schemas.test.ts`, replace every `canopySchema` with `mulchSchema` (import on line 2, the `describe('canopySchema', …)` label, and all `canopySchema.safeParse(` call sites — 12 occurrences):

Run to find them: `grep -n canopySchema src/content/schemas.test.ts`
Then change the import line to:

```ts
import { projectSchema, nowSchema, mulchSchema } from './schemas';
```

and the describe label to `describe('mulchSchema', () => {`, and each `canopySchema.safeParse(` → `mulchSchema.safeParse(`.

- [ ] **Step 2: Run to verify FAIL** — `pnpm test src/content/schemas.test.ts` → FAIL (`mulchSchema` not exported).

- [ ] **Step 3: Rename the export** — in `src/content/schemas.ts`, change `export const canopySchema = z.object({` to `export const mulchSchema = z.object({`. Leave the schema body unchanged.

- [ ] **Step 4: Update the collection config** — replace `src/content/config.ts` with:

```ts
import { defineCollection } from 'astro:content';
import { projectSchema, mulchSchema, nowSchema } from './schemas';

export const collections = {
  projects: defineCollection({ type: 'content', schema: projectSchema }),
  mulch:    defineCollection({ type: 'content', schema: mulchSchema }),
  now:      defineCollection({ type: 'content', schema: nowSchema }),
};
```

- [ ] **Step 5: Move the content directory**

```bash
git mv src/content/canopy src/content/mulch
```

- [ ] **Step 6: Update the collection consumers** — change every `getCollection('canopy')` → `getCollection('mulch')` and `CollectionEntry<'canopy'>` → `CollectionEntry<'mulch'>`:
  - `src/components/zones/Canopy/ScatteredNotes.astro` (line ~7: `pieces: CollectionEntry<'canopy'>[]`)
  - `src/components/zones/Canopy/PieceDetail.astro` (line ~6: `entry: CollectionEntry<'canopy'>`)
  - `src/pages/canopy/index.astro` (line ~6: `await getCollection('canopy')`)
  - `src/pages/canopy/[slug].astro` (line ~7: `await getCollection('canopy')`; line ~15: `entry: CollectionEntry<'canopy'>`)

  Run to confirm none remain: `grep -rn "'canopy'" src` → only the page-route paths/labels (handled in Task 3) should remain, no collection refs.

- [ ] **Step 7: Verify** — `pnpm test src/content/schemas.test.ts` → PASS; `pnpm exec astro check` → no NEW collection errors.
- [ ] **Step 8: Commit**

```bash
git add src/content src/components/zones/Canopy src/pages/canopy
git commit -m "refactor: rename canopy content collection to mulch"
```

---

## Task 3: Rename page routes + internal links + redirects

Move four page directories to their new slugs, update in-page internal links, and rewrite the redirect table. (The Hive/Mycelium merge is Task 4 — leave `pages/mycelium/` in place here so the build stays valid until Task 4 removes it.)

**Files:**
- Rename: `pages/polyculture/`→`pages/flora/`, `pages/canopy/`→`pages/mulch/`, `pages/compost/`→`pages/roots/`, `pages/beds/`→`pages/castings/`
- Modify: `src/components/zones/Canopy/ScatteredNotes.astro`, `src/components/zones/Canopy/PieceDetail.astro`, any internal links in the moved pages and in `SlowPlot`
- Modify: `astro.config.mjs` (redirects)

- [ ] **Step 1: Move the page directories**

```bash
git mv src/pages/polyculture src/pages/flora
git mv src/pages/canopy src/pages/mulch
git mv src/pages/compost src/pages/roots
git mv src/pages/beds src/pages/castings
```

- [ ] **Step 2: Fix the art-zone internal links** — `/canopy` URLs are now `/mulch`:
  - `src/components/zones/Canopy/ScatteredNotes.astro` line ~22: `href={`/canopy/${slug}`}` → `href={`/mulch/${slug}`}`
  - `src/components/zones/Canopy/PieceDetail.astro` line ~30: `<a href="/canopy" class="back-link">← The Canopy</a>` → `<a href="/mulch" class="back-link">← The Mulch</a>`

- [ ] **Step 3: Find every other hardcoded old slug in moved pages + components** —

```bash
grep -rn "/polyculture\|/canopy\|/compost\|/beds" src/pages src/components
```

For each hit (e.g. a "back to the plot" link in `src/pages/flora/[slug].astro` or inside `SlowPlot.astro`), update the slug to its new route (`/polyculture`→`/flora`, `/canopy`→`/mulch`, `/compost`→`/roots`, `/beds`→`/castings`). Do NOT touch `/mycelium` or `/hive` here.

- [ ] **Step 4: Rewrite the redirect table** — replace the `redirects` block in `astro.config.mjs` with:

```js
  redirects: {
    '/work': '/flora',
    '/work/[slug]': '/flora/[slug]',
    '/polyculture': '/flora',
    '/polyculture/[slug]': '/flora/[slug]',
    '/canopy': '/mulch',
    '/canopy/[slug]': '/mulch/[slug]',
    '/about': '/roots',
    '/compost': '/roots',
    '/colophon': '/castings',
    '/beds': '/castings',
    '/mycelium': '/hive',
  },
```

- [ ] **Step 5: Update each moved page's header copy + `<title>` to its new name** — in the four moved `index.astro` files, update the human-facing zone name so the page reads correctly (the metaphor changed even where the component didn't):
  - `src/pages/flora/index.astro`: title/`<h1>` "The Polyculture" → "The Flora & Fauna"; wrapper/intro copy may stay.
  - `src/pages/mulch/index.astro`: "The Canopy" → "The Mulch".
  - `src/pages/roots/index.astro`: "The Compost" → "The Roots" (this page is now Story & origins — its existing biographical/strata content already fits).
  - `src/pages/castings/index.astro`: "The Beds" → "The Compost"; in the intro, "Colophon" → "Design & tech details".

  (Only change visible names/titles — leave component imports and CSS class names; those are Task 5.)

- [ ] **Step 6: Build + type-check** — `pnpm build` → succeeds; `pnpm exec astro check` → no NEW errors.
- [ ] **Step 7: Smoke-test routes** — `pnpm dev` then in another shell:

```bash
for p in /flora /mulch /roots /castings /hive; do printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4321$p"; done
```

Expected: all `200`. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: rename zone routes to flora/mulch/roots/castings + redirects"
```

---

## Task 4: Merge the network into the Hive

`NodesGraph` is self-contained (it imports `./graph` and `../../../lib/collaborators`). Moving it (with `graph.ts`/`graph.test.ts`) into the Hive component directory keeps its relative imports valid, then the Hive page renders it as a second section. The standalone `/mycelium` page is deleted; its redirect was already added in Task 3.

**Files:**
- Rename: `src/components/zones/Mycelium/{NodesGraph.astro,graph.ts,graph.test.ts}` → `src/components/zones/Hive/`
- Modify: `src/pages/hive/index.astro`
- Delete: `src/pages/mycelium/index.astro` (+ empty `src/pages/mycelium/`)
- Modify: `e2e/map.spec.ts` is NOT touched here (Task 6)

- [ ] **Step 1: Move the network component + its module into Hive**

```bash
git mv src/components/zones/Mycelium/NodesGraph.astro src/components/zones/Hive/NodesGraph.astro
git mv src/components/zones/Mycelium/graph.ts src/components/zones/Hive/graph.ts
git mv src/components/zones/Mycelium/graph.test.ts src/components/zones/Hive/graph.test.ts
```

`NodesGraph.astro` imports `./graph` (now resolves in Hive/) and `../../../lib/collaborators` (same depth as before — still valid). No import edits needed. Confirm `src/components/zones/Mycelium/` is now empty: `ls src/components/zones/Mycelium`.

- [ ] **Step 2: Add the network section to the Hive page** — replace `src/pages/hive/index.astro` with:

```astro
---
import Garden from '@layouts/Garden.astro';
import LiveFlock from '../../components/zones/Hive/LiveFlock.astro';
import NodesGraph from '../../components/zones/Hive/NodesGraph.astro';
---

<Garden
  title="The Hive — Gurden's Garden"
  description="What I'm working on now, what I'm reading, how to reach me, and the network the work grows through."
>
  <div class="hive-wrap page-wrap">

    <header class="hive-header">
      <h1>The Hive</h1>
      <p class="hive-intro">
        What I'm carrying right now, what I'm reading, how to reach me — and the
        network of collaborators, organisations, and ideas the work grows through.
      </p>
    </header>

    <section class="flock-section" aria-labelledby="flock-heading">
      <h2 id="flock-heading" class="label section-heading">Live Flock</h2>
      <LiveFlock />
    </section>

    <section class="network-section" aria-labelledby="network-heading">
      <h2 id="network-heading" class="label section-heading">Network</h2>
      <p class="network-intro">
        Collaborators, organisations, and ideas. The lists are the
        keyboard-navigable equivalent of the graph. Signals pass between nodes.
      </p>
      <NodesGraph />
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

  .network-section {
    margin-bottom: var(--space-20);
    padding-top: var(--space-12);
    border-top: 1px solid var(--ink-faint);
  }

  .network-intro {
    font-size: var(--text-md);
    line-height: 1.65;
    max-width: 560px;
    margin-bottom: var(--space-8);
  }
</style>
```

- [ ] **Step 3: Delete the standalone network page**

```bash
git rm src/pages/mycelium/index.astro
rmdir src/pages/mycelium 2>/dev/null || true
```

- [ ] **Step 4: Verify the move left no dangling refs**

```bash
grep -rn "zones/Mycelium\|pages/mycelium" src
```

Expected: no matches.

- [ ] **Step 5: Unit + build** — `pnpm test src/components/zones/Hive/graph.test.ts` → PASS; `pnpm build` → succeeds.
- [ ] **Step 6: Smoke-test** — `pnpm dev`; confirm `/hive` is `200` and `/mycelium` redirects to `/hive`:

```bash
curl -s -o /dev/null -w "hive %{http_code}\n" http://localhost:4321/hive
curl -s -o /dev/null -w "mycelium %{redirect_url} %{http_code}\n" http://localhost:4321/mycelium
```

Expected: `hive 200`; `/mycelium` returns a redirect to `/hive`. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: merge collaborator network into the Hive, retire /mycelium"
```

---

## Task 5: Rename zone component directories to match the new zones

Cosmetic-but-coherent: the component directories still carry old metaphor names. Rename them and fix the page imports. Purely mechanical; tests + `astro check` catch any miss. (If under time pressure this task is the safe one to defer — nothing user-facing depends on directory names.)

**Files:**
- Rename: `src/components/zones/{Polyculture→Flora, Canopy→Mulch, Compost→Roots, Beds→Castings}`
- Modify: import paths in `src/pages/{flora,mulch,roots,castings}/*.astro`

- [ ] **Step 1: Rename the directories**

```bash
git mv src/components/zones/Polyculture src/components/zones/Flora
git mv src/components/zones/Canopy src/components/zones/Mulch
git mv src/components/zones/Compost src/components/zones/Roots
git mv src/components/zones/Beds src/components/zones/Castings
```

(`Hive` already holds LiveFlock + the merged NodesGraph/graph; leave it.)

- [ ] **Step 2: Update the page imports** — fix each moved import path:
  - `src/pages/flora/index.astro` + `src/pages/flora/[slug].astro`: `components/zones/Polyculture/` → `components/zones/Flora/`
  - `src/pages/mulch/index.astro` + `src/pages/mulch/[slug].astro`: `components/zones/Canopy/` → `components/zones/Mulch/`
  - `src/pages/roots/index.astro`: `components/zones/Compost/Strata.astro` → `components/zones/Roots/Strata.astro`
  - `src/pages/castings/index.astro`: `components/zones/Beds/TendedBeds.astro` → `components/zones/Castings/TendedBeds.astro`

  Find any remaining stale paths: `grep -rn "zones/Polyculture\|zones/Canopy\|zones/Compost\|zones/Beds" src` → expect no matches.

- [ ] **Step 3: Build + type-check** — `pnpm build` → succeeds; `pnpm exec astro check` → no NEW errors.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename zone component dirs to match new zones"
```

---

## Task 6: Update E2E + accessibility tests for the new structure

Rename the per-zone spec files, update slugs/order/counts, and rewrite the redirect specs. Run chromium throughout this task (webkit + full sweep is Task 7).

**Files:**
- Rename: `e2e/polyculture.spec.ts`→`flora.spec.ts`, `e2e/canopy.spec.ts`→`mulch.spec.ts`, `e2e/compost.spec.ts`→`roots.spec.ts`, `e2e/beds.spec.ts`→`castings.spec.ts`
- Delete: `e2e/mycelium.spec.ts` (its assertions fold into `hive.spec.ts`)
- Modify: `e2e/map.spec.ts`, `e2e/pages.spec.ts`, `e2e/hive.spec.ts`, `e2e/accessibility.spec.ts`, `e2e/axe.spec.ts`, `e2e/cursor-bee.spec.ts`

- [ ] **Step 1: Rename the per-zone spec files**

```bash
git mv e2e/polyculture.spec.ts e2e/flora.spec.ts
git mv e2e/canopy.spec.ts e2e/mulch.spec.ts
git mv e2e/compost.spec.ts e2e/roots.spec.ts
git mv e2e/beds.spec.ts e2e/castings.spec.ts
```

- [ ] **Step 2: Slug-swap the renamed per-zone specs** — in each renamed file apply the literal substitutions (paths, collection name, and any visible "The X" zone-name text):
  - `e2e/flora.spec.ts`: `/polyculture` → `/flora`; "The Polyculture" → "The Flora & Fauna".
  - `e2e/mulch.spec.ts`: `/canopy` → `/mulch`; `'canopy'` → `'mulch'`; "The Canopy" → "The Mulch".
  - `e2e/roots.spec.ts`: `/compost` → `/roots`; "The Compost" → "The Roots". (Leave the two known-flaky scroll-reveal tests as-is — they were failing pre-change; do not "fix" them here.)
  - `e2e/castings.spec.ts`: `/beds` → `/castings`; "The Beds" → "The Compost".

  After editing, confirm no stale slugs remain: `grep -rn "/polyculture\|/canopy\|/compost\|/beds\|'canopy'" e2e/flora.spec.ts e2e/mulch.spec.ts e2e/roots.spec.ts e2e/castings.spec.ts` → no matches.

- [ ] **Step 3: Rewrite `e2e/pages.spec.ts`** — replace the ENTIRE file with the redirect + page checks for the new routes:

```ts
import { test, expect } from '@playwright/test';

test.describe('Legacy redirects', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['/about', '/roots'],
    ['/compost', '/roots'],
    ['/colophon', '/castings'],
    ['/beds', '/castings'],
    ['/canopy', '/mulch'],
    ['/polyculture', '/flora'],
    ['/work', '/flora'],
    ['/mycelium', '/hive'],
  ];
  for (const [from, to] of cases) {
    test(`${from} redirects to ${to}`, async ({ page }) => {
      await page.goto(from);
      expect(page.url()).toContain(to);
    });
  }
});

test.describe('Roots page (story & origins)', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/roots');
    expect(r?.status()).toBe(200);
  });

  test('shows name and biographical strata', async ({ page }) => {
    await page.goto('/roots');
    await expect(page.getByText(/Gurden/i).first()).toBeVisible();
    await expect(page.getByText(/Dark Matter Labs/i).first()).toBeVisible();
    await expect(page.getByText(/Georgia Tech/i).first()).toBeVisible();
    await expect(page.getByText(/Aalto/i).first()).toBeVisible();
    await expect(page.getByText(/Delhi/i).first()).toBeVisible();
  });

  test('shows contact email', async ({ page }) => {
    await page.goto('/roots');
    await expect(page.getByRole('link', { name: /gurden@darkmatterlabs/i })).toBeVisible();
  });
});

test.describe('Castings page (design, tech & care)', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/castings');
    expect(r?.status()).toBe(200);
  });

  test('shows stack + care content', async ({ page }) => {
    await page.goto('/castings');
    await expect(page.getByText(/Astro/i).first()).toBeVisible();
    await expect(page.getByText(/Netlify/i).first()).toBeVisible();
    await expect(page.getByText(/Mazius/i).first()).toBeVisible();
  });
});
```

- [ ] **Step 4: Update `e2e/map.spec.ts`** — three edits:

Replace the `ZONE_HREFS` array (top of file) with the new five:

```ts
const ZONE_HREFS = [
  '/flora',
  '/hive',
  '/mulch',
  '/roots',
  '/castings',
] as const;
```

Change the count assertion `toHaveCount(6)` → `toHaveCount(5)`.

In the `zones carry data-zone identifiers` test, replace the id list with `['flora', 'hive', 'mulch', 'roots', 'castings']`.

In the fill-regression test, change the selector zone from `canopy` to `mulch` (the `.f-moss` bud now lives in the mulch glyph): `[data-zone="mulch"] .zone-glyph .f-moss`.

In the texture test loop, replace the id list with `['flora', 'hive', 'mulch', 'roots', 'castings']`.

Replace the ecological-order expectation with:

```ts
    expect(order).toEqual(['flora', 'hive', 'mulch', 'roots', 'castings']);
```

In the always-visible-label test, change `data-zone="polyculture"` → `data-zone="flora"` and update the expected label text to `'Work & projects'` (unchanged string, new zone).

- [ ] **Step 5: Fold network coverage into `e2e/hive.spec.ts`** — add these tests inside the existing hive describe (the network now lives on /hive), then delete the old mycelium spec:

```ts
  test('hive shows both the flock and the network sections', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /live flock/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /network/i })).toBeVisible();
  });

  test('hive renders the collaborator nodes canvas', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.locator('[data-nodes-graph]')).toBeAttached();
  });
```

```bash
git rm e2e/mycelium.spec.ts
```

(If `mycelium.spec.ts` had unique node-list assertions you want to keep, port them onto `/hive` first — the `data-nodes-graph` markup is identical, only the page moved.)

- [ ] **Step 6: Sweep the remaining specs for old slugs** —

```bash
grep -rn "/polyculture\|/canopy\|/mycelium\|/compost\|/beds\|'canopy'" e2e
```

Update any hits in `e2e/accessibility.spec.ts`, `e2e/axe.spec.ts`, and `e2e/cursor-bee.spec.ts` using the same mapping (`/polyculture`→`/flora`, `/canopy`→`/mulch`, `/compost`→`/roots`, `/beds`→`/castings`, `/mycelium`→`/hive`). In `cursor-bee.spec.ts`, the click target `data-zone="polyculture"` → `data-zone="flora"`. Re-run the grep → expect no matches.

- [ ] **Step 7: Run the E2E suite (chromium)** — `pnpm exec playwright test --project=chromium`
  Expected: all pass except the two pre-existing `roots.spec.ts` (formerly compost) scroll-reveal flakes. If any test fails on a slug/name you can trace to this rename, fix it; do not modify the flaky scroll-reveal tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: update e2e + a11y suites for five renamed zones and the hive merge"
```

---

## Task 7: Final sweep — Phase 1

**Files:** none (verification; fixups if needed)

- [ ] **Step 1: No stale identifiers anywhere** —

```bash
grep -rn "polyculture\|'canopy'\|/canopy\|mycelium\|zones/Mycelium" src e2e astro.config.mjs
```

Expected: no matches except inside the `redirects` block of `astro.config.mjs` (the legacy `from` keys `'/polyculture'`, `'/canopy'`, `'/mycelium'` are intentional) and any redirect tests in `e2e/pages.spec.ts`.

- [ ] **Step 2: Units** — `pnpm test` → all pass.
- [ ] **Step 3: Type-check** — `pnpm exec astro check` → only pre-existing errors; nothing new from the rename.
- [ ] **Step 4: Build** — `pnpm build` → succeeds with five zone routes + the dynamic `[slug]` routes.
- [ ] **Step 5: Full E2E both browsers** — `pnpm exec playwright test` → all pass on chromium AND webkit except the two known `roots.spec.ts` scroll-reveal flakes (pre-existing, unrelated). Confirm `MapOverlay` shows the five new zones (it reads `zones` dynamically) via the map E2E.
- [ ] **Step 6: Lighthouse CI** — `pnpm lhci autorun` → budgets green on `/`, `/flora`, `/mulch`, `/roots`, `/hive`, `/castings`. If the LHCI config enumerates old URLs (`/polyculture`, `/canopy`, `/mycelium`, `/compost`, `/beds`), update them to the new routes first, then re-run.
- [ ] **Step 7 (only if fixups were made):**

```bash
git add -A
git commit -m "chore: phase 1 sweep — verify renamed routes across units, e2e, lighthouse"
```

---

## Self-Review (filled in by plan author)

**1. Spec coverage (Phase 1 scope only):** Five-zone `ZoneId` + names/slugs/descs → Task 1. Glyphs keep rendering under new ids (redraw deferred to P2) → Task 1 Step 5. `canopy`→`mulch` collection rename (config, schema, dir, consumers) → Task 2. Route renames + internal links → Task 3. Redirect table (all eight legacy paths incl. `/compost`→`/roots`, `/beds`→`/castings`, `/mycelium`→`/hive`) → Task 3 Step 4. Hive ← network merge (NodesGraph+graph relocated, page section, `/mycelium` retired) → Task 4. Component-dir coherence → Task 5. Tests (5-zone order/count, new slugs, redirects, hive network, a11y) → Task 6. Invariants sweep (units/types/build/E2E both browsers/LHCI) → Task 7. P2–P4 (glyph redraws, prime/secondary composition, day/night, ambient) intentionally out of this plan.

**2. Placeholder scan:** none — every code step ships full code or an exact, greppable substitution mapping; every command has an expected result. Test-file edits that aren't full rewrites (the per-zone specs) are specified as literal find/replace mappings with a verifying grep, because reproducing ~150 lines verbatim would be noise; the two files with real logic (`pages.spec.ts`, `map.spec.ts`) get full/explicit code.

**3. Type consistency:** `ZoneId = 'flora'|'hive'|'mulch'|'roots'|'castings'` is identical across `zones.ts`, `zones.test.ts`, `index.astro`, and the `map.spec.ts` id arrays. Collection key `mulch` matches across `config.ts`, `schemas.ts` (`mulchSchema`), `schemas.test.ts`, and all `getCollection('mulch')`/`CollectionEntry<'mulch'>` consumers. Redirect targets (`/flora`,`/mulch`,`/roots`,`/castings`,`/hive`) match the moved page directories and `zones[].href`. `data-nodes-graph` (Task 6 Step 5) matches the existing `NodesGraph.astro` markup.
