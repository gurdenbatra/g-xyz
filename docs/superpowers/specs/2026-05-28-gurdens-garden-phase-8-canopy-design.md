# Phase 8: The Canopy — Design Spec

**Status:** Complete — Phase 8 implemented and verified  
**Zone:** `/canopy`  
**Date:** 2026-05-28

---

## Overview

The Canopy is the art zone of Gurden's Garden. It collects poems, essays, music, and audio-visual work — the creative output that grows alongside the professional work. Content currently lives across Tumblr (poems/essays), SoundCloud (music), and Instagram (audio-reactive AV).

**Scope:** Minimal viable Canopy — four piece kinds, 3–5 seed pieces, no filtering, two routes. Build the foundation; expand later.

---

## Content Schema

### canopySchema

Replaces the existing `poemSchema` and `artSchema` stubs in `src/content/schemas.ts`.

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

**Fields:**
- `title` — display title, used on note card and detail page
- `kind` — determines note colour on index and rendering path on detail page
- `year` — shown on note card and detail page
- `description` — optional one-liner shown on note card (below title)
- `embedUrl` — required for `music` and `av`; used as `iframe src`. Omitted for `poem` and `essay`.

**Authoring examples:**

Text piece (poem/essay):
```mdx
---
title: "Elegy for the undercommons"
kind: poem
year: 2023
description: "After Stefano Harney"
---

There is a kind of knowing
that lives below the floor —
```

Embed piece (music/AV):
```mdx
---
title: "Eternal noises III"
kind: music
year: 2024
description: "Texture study, late summer"
embedUrl: "https://w.soundcloud.com/player/?url=..."
---
```

---

## Routes

### `/canopy` — Index

Scattered notes layout. All pieces rendered as absolutely positioned note cards on a paper (`--c-paper`) background. The noise.ts Perlin wind field drives continuous per-note sway via RAF.

**Zone header** (matches other zones):
- 🌳 emoji, "The Canopy" h1
- Subtitle: "Poems, essays, music, and audio-visual work — the art that grows alongside the rest."

**Note cards:**
- Absolute position derived from slug LCG hash — deterministic, stable across visits
- 3-column grid; exact x/y offset and rotation within cell from hash
- Each note shows: kind label (uppercase, 8px), title (italic, 11px), description (9px, optional), year (8px)
- Hover: `scale(1.04)` + deeper shadow + `z-index: 10`
- Colour coding by kind:
  - poem → `#5A7A4A` (moss) with cream text
  - essay → `#D9A857` (ochre) with ink text
  - music → `#8A4F2E` (soil) with cream text
  - av → `#2a3a5a` (indigo) with cream text

**Wind animation:**
- Base transform set from `data-x`, `data-y`, `data-r` attributes at mount
- RAF loop: each note samples `noise2D(nx + t, ny + t)` for ±4° rotation delta, `noise2D(nx, ny + t*0.5)` for ±3px vertical drift
- Respects `prefers-reduced-motion`: animation loop does not start; CSS `transform` from base position only
- `astro:page-load` / `astro:before-swap` lifecycle for cleanup

**Mobile (< 640px):** Single column, notes stack with slight rotation. Wind still active.

**Colour key:** Bottom of scatter area — small swatches + labels for each kind.

### `/canopy/[slug]` — Detail

Ink immersive. Entering a piece means stepping from paper into ink.

**Shell (all kinds):**
- Background: `--c-ink` (`#1A1A1A`), overrides Garden layout's default paper via `<style>` block
- Back link: `← The Canopy` top-left, `#4A4A48`, uppercase 9px
- Kind badge: coloured per kind (same palette as index notes), uppercase 8px, 2px letter-spacing
- Year: `#4A4A48`, 8px, same line as kind badge
- Title: `--c-paper` (`#f1e8d0`), 22px italic, 1.25 line-height

**Text rendering path (poem / essay):**
- MDX `<Content />` body
- Poem: 13px italic, `#c8c0b0`, 2× line-height
- Essay: 14px upright, `#c8c0b0`, 1.75 line-height
- Max-width: 480px

**Embed rendering path (music / AV):**
- `<iframe src={embedUrl} loading="lazy" title={title} />` — full width within column
- Below iframe: `↗ Open on [SoundCloud / Instagram]` fallback link (derived from embedUrl host)
- No body content in MDX for embed pieces

**No animation on detail page.** Reduced motion requires no special handling.

---

## File Map

```
src/
├── content/
│   ├── config.ts                  ← register canopy collection; retire poems/art stubs
│   ├── schemas.ts                 ← add canopySchema
│   └── canopy/                    ← new MDX directory
│       ├── elegy-for-the-undercommons.mdx
│       ├── three-ways-to-hold-rain.mdx
│       ├── eternal-noises-iii.mdx
│       ├── reactive-study-4.mdx
│       └── what-civic-technology-actually-means.mdx
│
├── components/zones/Canopy/
│   ├── ScatteredNotes.astro       ← index scatter + noise.ts wind
│   └── PieceDetail.astro          ← detail ink shell (text or embed)
│
├── pages/canopy/
│   ├── index.astro                ← Garden layout + ScatteredNotes
│   └── [slug].astro               ← getStaticPaths + PieceDetail
│
└── lib/
    └── zones.ts                   ← add canopy href: '/canopy'

lighthouserc.json                  ← add /canopy URL
e2e/canopy.spec.ts                 ← new E2E suite
```

---

## Component Specifications

### ScatteredNotes.astro

**Props:** `pieces: CollectionEntry<'canopy'>[]`

**Responsibilities:**
1. For each piece, compute base position from slug LCG hash:
   ```typescript
   function lcg(n: number): number {
     return ((n * 1664525 + 1013904223) & 0xffffffff) >>> 0;
   }
   function slugHash(slug: string): number {
     return slug.split('').reduce((h, c) => lcg(h ^ c.charCodeAt(0)), 0);
   }
   ```
   At mount time, measure container `clientWidth` (call it `W`):
   - Column: `col = hash % 3` (0, 1, 2)
   - Column width: `colW = Math.floor(W / 3)`
   - x: `col * colW + ((hash >> 4) % Math.floor(colW * 0.6))` (note stays within its column's left 60%)
   - y: `20 + ((hash >> 8) % 340)` (20px minimum top, 360px maximum — scatter container is 420px tall)
   - base rotation: `((hash >> 12) % 17) - 8` (range −8° to +8°)
2. Render notes as `<a href="/canopy/{slug}">` divs with `data-x`, `data-y`, `data-r` attributes
3. `<script>` block: mounts wind animation on `astro:page-load`, cleans up on `astro:before-swap`

**CSS:** `position: absolute` on notes, `position: relative; height: 420px` on container. Overflow hidden.

### PieceDetail.astro

**Props:** `entry: CollectionEntry<'canopy'>`

**Responsibilities:**
1. Destructure `{ title, kind, year, description, embedUrl }` from `entry.data`
2. Render dark shell (back link, kind badge, year, title)
3. Branch on `kind`:
   - `poem` | `essay`: render `<Content />` (MDX body)
   - `music` | `av`: render `<iframe>` + fallback link
4. `[slug].astro` includes `<style is:global>body { background-color: var(--c-ink); }</style>` to override the `var(--ground)` default set in `global.css`

---

## Seed Content (3–5 pieces)

| slug | kind | year | embedUrl needed |
|---|---|---|---|
| `elegy-for-the-undercommons` | poem | 2023 | no |
| `three-ways-to-hold-rain` | poem | 2022 | no |
| `what-civic-technology-actually-means` | essay | 2024 | no |
| `eternal-noises-iii` | music | 2024 | yes — SoundCloud |
| `reactive-study-4` | av | 2023 | yes — Instagram |

Embed URLs are placeholder strings in the seed data; real URLs can be swapped in at any time without touching the implementation.

---

## E2E Test Plan (`e2e/canopy.spec.ts`)

**Structure tests:**
- `/canopy` has h1 "The Canopy"
- At least one note card visible
- Colour key visible

**Navigation:**
- Clicking a note navigates to `/canopy/[slug]`
- Detail page has `← The Canopy` back link
- Back link returns to `/canopy`

**Detail page:**
- Poem detail: h1 present, body text present
- Music/AV detail: iframe present with non-empty `src`

**Accessibility:**
- axe audit on `/canopy` — zero violations
- axe audit on at least one detail page — zero violations

**Reduced motion:**
- `test.use({ contextOptions: { reducedMotion: 'reduce' } })` at describe level
- Notes still visible and positioned; no assertion on animation state

---

## What This Phase Does Not Include

- Filtering by kind
- Pagination
- Search
- RSS feed
- Comments or reactions
- A dedicated "Canopy" nav item (zone link in Garden map is sufficient for now)

---

## Reuse

| Existing code | Used for |
|---|---|
| `src/lib/noise.ts` | Wind field in ScatteredNotes |
| `Garden.astro` layout | Both pages |
| LCG hash pattern (from `graph.ts`) | Slug → position mapping |
| `zones.ts` | One-line zone link registration |
| Lighthouse CI config | Extend with `/canopy` URL |
