# Garden Re-narration & Ambient Ecology — Design Spec

**Date:** 2026-06-11
**Status:** Approved (design); pending implementation plan
**Topic:** Re-map the garden's six zones to five new ecological metaphors (with full
route/id renames), give Work prime visual focus and Art secondary, merge the
collaborator network into the Hive, add a local-hour day/night theme, and add a
sparse ambient ecology layer (sunlight, airflow, water, passing wildlife) to the
homepage.

---

## Goal

Re-narrate the garden so each content area sits where it ecologically belongs, with
a clear visual hierarchy (Work prime, Art secondary), and bring the scene to life
with a calm, time-aware ambient layer — while preserving the site's SSG / no-JS /
Lighthouse / a11y / reduced-motion invariants.

## Requirements (from the user)

1. **Work & projects** — prime focus; metaphor broadens to *rich flora & fauna*
   (plants, trees, flowers, vegetables).
2. **Art, music, poetry, essays** — secondary focus; metaphor becomes *microbes,
   fungi, mulch*.
3. **Story & origins** — metaphor becomes *soil & roots*.
4. **Now, contact, current interests** — stays the Hive; the *collaborators/network*
   merges into this zone (no separate zone).
5. **Colophon & care** — rename "Colophon" to *Design & tech details*; metaphor
   becomes *compost, aged manure, worm castings*.
6. Place everything in a garden-like narrative — where things ecologically belong.
7. Add fun ambient animations that **come and go slowly over time**: sunlight
   passing, dark mode, airflow, water; earthworms & invertebrates, insects, birds,
   wildlife passing.

## Decisions locked during brainstorming

- **Remap depth:** full rename, including route slugs and zone ids (with redirects).
- **Scope:** one combined spec (re-narration + ambient ecology), sequenced plan.
- **Care slug:** human-facing name "The Compost", URL `/castings` (worm castings) —
  avoids the `/compost` collision so every old link redirects cleanly.
- **Work slug:** renamed to `/flora`.
- **Day/night:** matches the visitor's local hour; OS `prefers-color-scheme` and a
  manual toggle override it. No looping cycle.
- **Wildlife style:** ASCII sprites for small fauna, simple SVG line-art for the
  occasional larger creature.
- **Ambient cadence:** sparse & calm — one pass at a time, roughly every 25–60s.
- **Ambient scope:** homepage garden only (interior pages keep their own animations).

---

## The five zones

`ZoneId` becomes `flora | mulch | roots | hive | castings` (down from six).

| id | name | slug | content (`longDesc`) | glyph metaphor | focus |
|----|------|------|----------------------|----------------|-------|
| `flora` | The Flora & Fauna | `/flora` | Work & projects | tree + flower + vegetable + a critter accent | **prime** (largest, central) |
| `hive` | The Hive | `/hive` | Now, contact & network | skep + bees + comb-cell web (merged network) | sky, upper-right |
| `mulch` | The Mulch | `/mulch` | Art, music, poetry & essays | leaf-litter + fungal caps + microbe dots | **secondary** (medium) |
| `roots` | The Roots | `/roots` | Story & origins | descending taproot + soil strata | underground, lower-left |
| `castings` | The Compost | `/castings` | Design, tech & care | aged heap + worm + castings | underground, lower-right |

`shortDesc`/`longDesc` updated to match. All five glyphs are redrawn in the existing
`ZoneGlyph.astro` language (crisp SVG silhouette + `<clipPath>`-clipped monospace
ASCII texture rows, zone-prefixed clip ids). Flora renders larger than the others;
Mulch second; the remaining three at the base size.

### Ecological placement (homepage cross-section)

Top → bottom, anchored to the existing `AsciiEarth` horizon (~62%):

- **Sky (above the earth line):** Flora (prime — central, largest, most alive) and
  the Hive (pollinators near the flora, upper-right).
- **Surface litter (at/just below the line):** Mulch (secondary — the decomposer
  surface where creative material breaks down).
- **Underground:** Roots (origins, descending — lower-left) and the Compost
  (worm castings nourishing the garden — lower-right).

Desktop scatter uses absolute positioning (exact `zonePos` coordinates fixed in the
plan); Flora's glyph box is visibly larger, Mulch's slightly larger than the base.
Mobile keeps a single ecological-order column (Flora, Hive, Mulch, Roots, Compost).

---

## Component re-homing & the Hive merge

Existing interactive pieces relocate to their new metaphor home — moved, not rebuilt:

- `SlowPlot` → **Flora** (`/flora`)
- `ScatteredNotes` + `PieceDetail` → **Mulch** (`/mulch`)
- `Strata` → **Roots** (`/roots`) — soil layers already fit the metaphor
- `TendedBeds` + `worms` (`worms.ts`/`worms.test.ts`) → **Compost** (`/castings`)
- `LiveFlock` stays on **Hive**; `NodesGraph` (+`graph.ts`/`graph.test.ts`) folds into
  the Hive page as a "network" section. `/mycelium` becomes a redirect to `/hive`.

The zone component directories (`src/components/zones/{Polyculture,Canopy,Compost,
Beds,Hive,Mycelium}`) are renamed to match the new zones; imports updated. NodesGraph
moves under the Hive directory.

---

## Routes, redirects, content collections

**New pages:** `/flora` (+ `/flora/[slug]`), `/mulch` (+ `/mulch/[slug]`), `/roots`,
`/hive` (now hosts the network section), `/castings`.

**Redirects (in `astro.config`):**

| from | to |
|------|----|
| `/work`, `/work/[slug]` | `/flora`, `/flora/[slug]` |
| `/polyculture`, `/polyculture/[slug]` | `/flora`, `/flora/[slug]` |
| `/canopy`, `/canopy/[slug]` | `/mulch`, `/mulch/[slug]` |
| `/about`, `/compost` | `/roots` |
| `/colophon`, `/beds` | `/castings` |
| `/mycelium` | `/hive` |

**Content collections:** `projects` (Flora) and `now` (Hive) keep their names; the
`canopy` collection is renamed `mulch` (directory + `content/config.ts` +
`schemas.ts`/tests + all queries). Collaborators/graph seed data folds into the data
the Hive page consumes.

No old slug remains a live page — each becomes a redirect, so the `/compost` URL no
longer resolves to a real page and its redirect to `/roots` is unambiguous.

---

## Day/night by local hour

- **Pure module** `src/lib/daytime.ts`: `timeOfDay(hour: number) → 'dawn' | 'day' |
  'dusk' | 'night'` (Node-safe, deterministic, unit-tested). Boundaries fixed in the
  plan (e.g. dawn 5–8, day 8–17, dusk 17–20, night 20–5).
- **Theming:** an idle/inline script reads the visitor's local hour, computes the
  phase, and sets `data-daytime` on `<html>`; CSS keys palette/light custom
  properties off it (warm bright midday → amber dusk → cool dark night). Sunlight is
  a faint directional wash whose warmth/angle follow the phase.
- **Overrides (precedence):** manual toggle > OS `prefers-color-scheme: dark` >
  local-hour phase. The manual toggle is a small accessible control (persists choice
  in `localStorage`); when unset, OS dark preference forces the night/dark palette;
  otherwise the hour decides.
- Re-applied on `astro:page-load`. With no JS, the page renders a sensible default
  phase (`day`) so SSG output is correct and unstyled-flash-free.

This composes with the existing seasonal logic (season tints the palette; daytime
sets light/dark) — they layer, they don't fight.

---

## Ambient ecology layer (homepage only)

- **Pure scheduler** `src/lib/ambient.ts`: given a current time and an injected RNG,
  returns the next pass descriptor `{ kind, lane, durationMs, delayMs }` where `kind`
  ∈ a fixed set (`worm`, `insect`, `bird`, `butterfly`, `critter`, `seed-drift`,
  `dew`). Deterministic under a seeded RNG → unit-testable in Node. Enforces
  sparse-and-calm pacing (one pass at a time, ~25–60s gaps) with no `Math.random()`
  at module scope.
- **Island** `src/components/home/AmbientEcology.astro`: idle-loaded
  (`requestIdleCallback`, `setTimeout` fallback). On each scheduled pass it spawns a
  sprite (ASCII glyph in a `<span>` for small fauna/effects; inline SVG line-art for
  the occasional larger creature), transitions it across its lane with CSS, and
  removes it on `transitionend`/timeout. Lanes map to the cross-section (sky for
  birds, the earth line for worms, mid-field for insects, ground for critters).
- **Effects:**
  - *Airflow* — extends the existing `GardenFlora` sway; adds a few drifting
    seed/leaf specks crossing slowly.
  - *Water* — sparse dew shimmer / a single soft ripple at the soil line.
  - *Sunlight* — handled by the daytime wash (above), drifting with the hour.
- **Guards:** fully gated by `prefers-reduced-motion: reduce` (no passes, no island
  work — static daytime palette only); idle-loaded so it never affects LCP; paused on
  `document.hidden`; re-acquired/cleaned on `astro:page-load` and
  `astro:before-preparation` (cancel timers + rAF — same discipline as the AsciiEarth
  island).

---

## Architecture & data flow

Static Astro 5 page, SSG-first. `zones.ts` (now five zones) → homepage links +
`ZoneGlyph`. `daytime.ts` (pure) → `data-daytime` on load AND a Node-safe default for
SSG. `ambient.ts` (pure) → scheduled passes consumed by the `AmbientEcology` island.
Glyphs and the earth line remain pure markup. The only new client JS is the daytime
theming script and the ambient island — both idle, motion-gated, LCP-neutral.

## Error handling

- Ambient island: any spawn/measure failure is caught; the scene stays calm and
  correct (no thrown errors, nothing logged in production).
- Daytime: if the script can't run (no JS), the SSG default phase stands.
- All five zones have non-null `href`. Every legacy slug resolves via redirect.

## Testing strategy

- **Unit (Vitest):** `timeOfDay` phase boundaries (incl. wrap-around at midnight);
  `ambient` scheduler determinism under a seeded RNG, pacing bounds, `kind`
  membership, one-at-a-time invariant; updated `schemas` tests for the renamed `mulch`
  collection.
- **E2E (Playwright, chromium + webkit):** homepage shows exactly five zone links in
  ecological order with the new slugs and glyph ASCII texture; every redirect in the
  table resolves to its new page; `data-daytime` is present and matches an injected
  hour; under `prefers-reduced-motion` the ambient layer produces no passes and the
  earth line stays static; the Hive page renders both the flock and the network
  section; axe zero violations on every page.
- **Lighthouse CI:** budgets green on `/` and all five zones (ambient + daytime are
  idle, post-LCP).

## Phasing (single spec, sequenced plan)

Each phase ends green (units + relevant E2E + `astro check`):

1. **P1 — Structure:** `zones.ts` (5 zones), new routes, redirects, content-collection
   rename (`canopy`→`mulch`), component re-homing, Hive ← network merge. Update E2E
   for new slugs/order/redirects.
2. **P2 — Visual:** redraw the 5 glyphs; homepage composition with prime (Flora) /
   secondary (Mulch) hierarchy; mobile ecological column.
3. **P3 — Day/night:** `daytime.ts` (TDD) + theming script + manual toggle + CSS
   phases; SSG default; E2E for `data-daytime`.
4. **P4 — Ambient:** `ambient.ts` scheduler (TDD) + `AmbientEcology` island + airflow
   /water/sprites; reduced-motion + idle + hidden-tab guards; E2E.
5. **P5 — Final sweep:** full units, full E2E (both browsers), Lighthouse CI, manual
   desktop+mobile confirmation.

## Out of scope

- Rebuilding interior zone visuals from scratch (components are re-homed, not
  redesigned).
- Ambient ecology on interior pages (homepage only).
- A looping day/night cycle (local-hour only).
- Changes to the cursor bee, the map overlay's interaction model, or the seasonal
  logic beyond layering daytime on top of it.
