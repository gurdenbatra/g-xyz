# Homepage Refinement — "Garden Cross-Section" Design Spec

**Date:** 2026-05-29
**Status:** Approved (design); pending implementation plan
**Topic:** Second iteration of the Gurden's Garden homepage — recognizable glyphs,
ecological spatial layout, always-on labels, and a bee-cursor bug fix.

---

## Goal

Refine the approved scattered-garden homepage so that (1) each zone has a bigger,
clearly recognizable botanical/garden glyph, (2) the six zones are placed to tell a
coherent garden cross-section story rather than a random scatter, (3) the always-visible
text is the zone *description* (the zone name is dropped — the glyph carries identity),
and (4) the global cursor bee keeps working after client-side (view-transition)
navigations.

## Requirements (from the user)

1. Each homepage element gets a better, bigger, more detailed visual (e.g. "canopy
   doesn't seem like canopy right now").
2. Remove the current name labels — identity should be obvious from the visual — and
   surface the description (previously hover-only) as the always-visible label, so the
   user immediately knows what is what.
3. Arrange the zones in a coherent order that represents a real garden: canopy at the
   top, compost at the bottom, mycelium close to compost, hive around the canopy,
   polyculture and beds close. Placement is *informed by* the ecological connections —
   **no literal connection lines are drawn.**
4. Fix the bee cursor, which doesn't always work.

## Chosen design (validated with the user)

### Labels
- Description **always visible** under each glyph (`zone.longDesc`). The zone `name` is
  not rendered on the homepage. Hover/focus only emphasizes (subtle glyph scale + label
  underline); it does not reveal/hide text.

### Connections
- **No drawn lines.** The three-band vertical layering and proximity communicate the
  relationships. Placement is informed by ecology only.

---

## Architecture

Static Astro 5 page. No new client JS on the homepage and no canvas — glyphs and flora
remain inline SVG; emphasis and flora sway stay pure CSS, gated by
`prefers-reduced-motion`. The only JS change is a **fix** to the existing global
`CursorBee` script (no new island, no new dependency).

### Files

**Modify**
- `src/components/home/ZoneGlyph.astro` — replace all six SVGs with larger, more
  detailed line-art glyphs; bump rendered size to ~64px. Palette classes unchanged in
  spirit (may add a couple, e.g. a soil-fill class).
- `src/pages/index.astro` — update `zonePos` to the cross-section coordinates; drop the
  `.zone-name` span; render `zone.longDesc` as the always-visible `.zone-label`; adjust
  styles (always-on label, hover emphasis, larger glyph spacing).
- `src/components/bee/CursorBee.astro` — fix the stale-element bug: re-acquire
  `#cursor-bee` on `astro:page-load` while keeping a single persistent rAF loop + window
  pointer listener.

**Modify (tests)**
- `e2e/map.spec.ts` — update homepage assertions: zone label now shows the description
  text and is visible at rest; six glyphs present; no zone *name* text; keep axe,
  reduced-motion, giant-title, href, data-zone assertions.
- `e2e/cursor-bee.spec.ts` (new) — assert the bee tracks the pointer on `/` AND continues
  to track after a client-side navigation to an inner page (the regression guard).

---

## Component & layout detail

### Spatial map (`index.astro` `zonePos`)

Anchor coordinates (% of the relative stage; each `.zone-link` centered on its anchor via
`translate(-50%, -50%)`). Three ecological bands around the centered giant title:

| zone | --zx | --zy | band | rationale |
|------|------|------|------|-----------|
| canopy | 36% | 13% | sky | the tree, highest |
| hive | 64% | 13% | sky | bees around the canopy (beside it, top) |
| polyculture | 12% | 50% | ground | cultivated, frames the name (left) |
| beds | 88% | 50% | ground | cultivated, frames the name (right) |
| compost | 38% | 87% | soil | the heap, lowest |
| mycelium | 62% | 87% | soil | threads through the compost (beside it) |

Symmetric and balanced: canopy highest, compost lowest, hive beside canopy, mycelium
beside compost, polyculture + beds at ground level flanking the wordmark.

`< 768px`: keep the existing centered vertical stack (absolute scatter disabled), with
zones in ecological top→bottom order as they appear in the `zones` array. (The array
order is polyculture, canopy, hive, compost, mycelium, beds — acceptable for the mobile
stack; no reordering required.)

### Glyphs (`ZoneGlyph.astro`)

Rendered at ~64px, earth-palette line-art (stroke-based, `aria-hidden`), each
unmistakable:

- **canopy** (Art, poetry & essays) — a broad tree: trunk + 2–3 overlapping leaf clusters
  forming a rounded crown (not a single circle).
- **hive** (Now & contact) — a domed straw skep: dome outline + 3–4 horizontal coil
  lines + a small entrance arch, plus a tiny bee dot above.
- **polyculture** (Work & projects) — three different crops side by side: a leafy sprig,
  a tall grass blade, and a round bud — diversity in one bed.
- **beds** (Colophon & care) — a raised planter: a low box/row line with 2–3 seedlings
  sprouting from tilled rows.
- **compost** (Story & origins) — a layered heap: a mound silhouette with 2–3 internal
  strata lines and a couple of settling bits (small leaf/peel marks).
- **mycelium** (Collaborators & network) — a branching thread network with nodes, plus a
  small mushroom (cap + stem) sprouting from one branch.

Colors continue to come from scoped classes bound to palette CSS vars (`--c-moss`,
`--c-soil`, `--c-ochre`, `--c-chartreuse`); CSS vars are not used directly in SVG
presentation attributes. A solid soil-fill class may be added for the compost mound /
mushroom cap if a filled shape reads better.

### Labels (`index.astro`)

Each `.zone-link` is a vertical column: glyph on top, description below.

```html
<a class="zone-link" href={zone.href ?? '#'} data-zone={zone.id} style={`--zx:…;--zy:…;`}>
  <ZoneGlyph id={zone.id} />
  <span class="zone-label">{zone.longDesc}</span>
</a>
```

- `.zone-label` is always `opacity: 1` (no hide/reveal). Mono, uppercase, small —
  matching the previous `.zone-hint` styling.
- Hover/focus emphasis: `.zone-link:hover .zone-label` / `:focus-visible` underlines the
  label; the glyph scales slightly (`transform: scale(1.06)`), disabled under
  `prefers-reduced-motion`.
- The accessible name of each link is its description text (no `aria-label` needed). The
  glyph stays `aria-hidden`.

### Bee cursor fix (`CursorBee.astro`)

Root cause: the inline module script runs once on first load and captures
`#cursor-bee` then. `ClientRouter` swaps `<body>` on client-side navigation, so the
captured node is detached and the new node is never updated → the bee freezes after the
first navigation.

Fix (mirrors the map pattern already in `Garden.astro`):
- Keep one module-level `BeeState`, one window `pointermove` listener, and one rAF loop
  (all live on `window`/`document`, which persist across view transitions).
- Hold the element in a mutable `let el`; re-acquire it via
  `document.addEventListener('astro:page-load', () => { el = document.getElementById('cursor-bee'); })`.
- The loop guards `if (el) el.style.transform = …`.
- Reduced-motion guard unchanged (the element is hidden and the loop need not run).

No duplicate loops are created because the bundled module script executes once;
`astro:page-load` only refreshes the reference.

---

## Data flow

`zones.ts` remains the single source of truth. `index.astro` maps it to scattered links
+ `ZoneGlyph`, now rendering `longDesc` (not `name`) as the visible label. No data-model
change; `name` is still used by the map overlay and elsewhere.

## Error / edge handling

- All six zones have non-null `href`; six real links render.
- Motion (glyph emphasis, flora sway) fully disabled under `prefers-reduced-motion`.
- No-JS: links work; descriptions are always visible (no hover dependency).
- Bee: hidden entirely under reduced-motion; otherwise tracks across navigations.

## Testing strategy

- **`e2e/map.spec.ts`:** giant `h1` text; six `a.zone-link[data-zone][href]` with correct
  hrefs; each link's visible text contains its `longDesc`; the zone *names* ("The
  Canopy", etc.) do NOT appear; `.zone-label` opacity is `1` at rest (always visible); no
  emoji; flora sway suppressed under reduced motion; axe passes.
- **`e2e/cursor-bee.spec.ts` (new):** on `/` (motion enabled), move the pointer and assert
  `#cursor-bee` transform moves away from its off-screen start; then click a homepage zone
  link to navigate client-side, move the pointer again, and assert the bee transform
  updates on the new page (regression guard for the stale-element bug).
- **Reduced motion:** bee `display` is `none`; flora `animation` is `none`.
- **Lighthouse CI:** `/` budget stays green (no new JS/canvas on the homepage).
- **Unit tests:** none required — glyphs/labels are static; bee physics already covered by
  `src/lib/bee.test.ts` (unchanged).

## Out of scope

- No drawn connection lines (explicitly declined).
- No changes to zone interior pages, the map overlay structure, or `zones.ts` data.
- No new motif set beyond the botanical/garden line-art already established.
