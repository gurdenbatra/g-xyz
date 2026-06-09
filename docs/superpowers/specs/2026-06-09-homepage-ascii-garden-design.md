# Homepage v3 — "ASCII Garden Cross-Section" Design Spec

**Date:** 2026-06-09
**Status:** Approved (design); pending implementation plan
**Topic:** Third iteration of the Gurden's Garden homepage — ASCII-hybrid glyphs, a
legible garden cross-section with an ASCII earth horizon (the contained pretext piece),
and responsive/UX fixes surfaced by a visual audit.

---

## Goal

Make the homepage *feel like a garden*: sharp, recognizable illustrations that mix the
drawn SVG line-art with ASCII-art texture; a visible sky/ground/soil cross-section
anchored by an ASCII earth horizon; organic motion; and a clean responsive story —
while preserving the site's SSG / no-JS / Lighthouse / a11y invariants.

## Requirements (from the user)

1. Mix the drawn illustrations with ASCII art — unique, more expressive glyphs
   (layered hybrid chosen: SVG silhouette + ASCII texture inside).
2. Use `@chenglou/pretext` for ONE contained, progressively-enhanced animated piece
   (scope decision: glyphs need no pretext; site-wide JS layout explicitly declined).
3. Audit and improve the design as much as possible: garden feel, sharp illustrations,
   good use of ASCII, good UX, responsive.

## Audit findings driving this design (verified in-browser 2026-06-09)

- **Fill bug (FIXED, commit `740765a`):** `.zone-glyph circle { fill:none }` outranked
  `.f-* { fill: var(…) }`, so every filled shape was invisible — canopy was a bare
  stick, mycelium a "Y", the hive lost its bee. Fixed by prefixing color classes
  (`.zone-glyph .f-moss`); an E2E computed-fill regression test now guards it.
- Cross-section story invisible: no horizon/soil cues — placement-only ecology reads
  as six floating marks.
- Glyphs too small for the stage (64px in a 1280×900 field); labels outweigh art.
- Composition imbalance; uniform flora sway (identical ±4°/5s) feels mechanical.
- Mobile: a seed-head sprig overlaps the title; stack order is data order (Work
  first), not garden order; excessive empty scroll; map toggle pill collides with the
  last glyph.

---

## Architecture

Static Astro 5 page. The glyph hybrids and the static earth are pure SSG markup
(inline SVG + text). The ONLY new client JS is one lazy, motion-gated script that
upgrades the static ASCII earth line to a living "variable-typographic" ripple using
dynamically-imported `@chenglou/pretext` (browser-only, v0.0.x — never imported under
reduced motion or before idle). LCP (the giant title) is untouched.

### Files

**Create**
- `src/components/home/AsciiEarth.astro` — the earth band: static authored ASCII
  horizon line + sparse soil specks (all `aria-hidden`), plus the inline module script
  that (idle + motion-allowed) dynamically imports pretext and animates the line.
- `src/lib/ascii-earth.ts` — PURE logic, Vitest-tested: undulating ground-line frame
  generation `groundFrame(width, t)`, character selection by target brightness+width
  `pickChar(candidates, targetBrightness, targetWidth)`. No DOM, no pretext import —
  measured widths/brightness tables are injected, so it unit-tests in Node.
- `src/lib/ascii-earth.test.ts` — unit tests for the above.

**Modify**
- `src/components/home/ZoneGlyph.astro` — ASCII-hybrid rewrite: keep crisp outline
  silhouettes; add `<clipPath>`-clipped monospace `<text>` rows of zone-specific ASCII
  texture; restore/keep solid fills; size up.
- `src/components/home/GardenFlora.astro` — per-sprig sway variance (duration +
  amplitude), 2–3 small ASCII flora accents, hide the two top-field seed-heads <768px
  (they collide with the title).
- `src/pages/index.astro` — ecological DOM order, `<AsciiEarth />` placement, soil
  wash gradient, zonePos v3, mobile spacing/padding fixes.
- `package.json` — add `@chenglou/pretext`.

**Modify (tests)**
- `e2e/map.spec.ts` — earth presence (static), mobile ecological order, glyph texture
  presence; keep all current assertions (incl. the fill regression).

---

## Detail

### 1. ASCII-hybrid glyphs (`ZoneGlyph.astro`)

- Rendered size: **96px desktop, 72px <768px** (CSS only; same 48-unit viewBox).
- Each glyph = (a) outline silhouette strokes (current language, thin & sharp),
  (b) solid accent fills (bee dot, bud, nodes, mushroom cap), and (c) an **ASCII
  texture layer**: a `<g clip-path="url(#<zone>-clip)">` containing 4–8 `<text>` rows
  (font: `var(--font-mono)`, `font-size` ≈ 4–5 viewBox units, palette-colored,
  `opacity ≈ 0.65`) clipped inside the silhouette's main volume.
- Per-zone texture palettes (exact strings pinned in the plan):
  - canopy crown: `@ % &` in moss + chartreuse rows
  - hive interior: comb rows `= o =`
  - compost heap: `. : ; *` graded denser toward the bottom
  - mycelium: thread accents `/ \ ·` with `*` nodes
  - beds (inside the planter box): tilled rows `, ^ v`
  - polyculture (along its soil line): `~ , .`
- Unique IDs: clipPath ids are zone-prefixed (`canopy-crown-clip` …) — all six glyphs
  render on one page, ids must not collide.
- Still `aria-hidden`; hover emphasis unchanged in spirit (scale 1.06 + a slight
  `rotate(-2deg)` wind nudge; none under reduced motion).

### 2. ASCII earth (`AsciiEarth.astro` + `ascii-earth.ts`) — the pretext piece

- **Static (SSG, what everyone gets):** a full-width, single-line undulating ASCII
  horizon (chars from `~ - , . '` + occasional sprout `"`), NectoMono, `--c-soil` at
  ~0.4 opacity, `aria-hidden`, `pointer-events: none`, `white-space: pre`,
  `overflow: hidden`. Below it, 2–3 sparse rows of soil specks (`. : ·`) at 0.15–0.25
  opacity. The authored frame is generated by `groundFrame()` at build time in the
  component frontmatter (deterministic, seeded by index — no `Math.random()`).
- **Placement (desktop):** absolutely positioned across the hero at **top: 62%**,
  z-index 0 (behind title text and zone links, above the background). The soil wash —
  a bottom-anchored CSS gradient (`--c-soil` at ~5% alpha, 60%→100% height) — sits on
  the hero so sky/ground/soil strata read without boxes.
- **Placement (mobile):** the earth line renders as a full-width divider between the
  title and the zone stack (in normal flow), specks omitted.
- **Progressive enhancement:** an inline module script: if
  `prefers-reduced-motion: reduce` → do nothing (pretext never imported). Otherwise on
  `requestIdleCallback` (fallback `setTimeout`), `await import('@chenglou/pretext')`,
  measure the candidate character widths once (serif font Georgia/MaziusDisplay — the
  variable-typographic trick needs proportional widths), then a ~12fps rAF-throttled
  loop recomputes the line via `groundFrame(width, t)` + `pickChar(...)` and swaps
  `textContent`. Re-acquire the element on `astro:page-load` (same pattern as
  CursorBee); pause when `document.hidden`.
- If the pretext import or measurement fails for any reason, catch and stay on the
  static frame (graceful no-op; log nothing in production).

### 3. Composition (`index.astro`, `GardenFlora.astro`)

- zonePos v3 (organic stagger, zones sit relative to the 62% horizon):

  | zone | x | y | band |
  |------|----|----|------|
  | canopy | 30% | 16% | sky |
  | hive | 68% | 18% | sky |
  | polyculture | 14% | 52% | ground |
  | beds | 86% | 52% | ground |
  | compost | 36% | 84% | soil |
  | mycelium | 64% | 86% | soil |

- Flora: per-sprig `animation-duration` (4.2s–6.4s) and amplitude (±3°–±5° via two
  keyframe variants); add 2–3 ASCII accents (`\|/` tuft, `*` seed-head) as positioned
  mono text, `aria-hidden`; hide the two top-field seed-heads below 768px.

### 4. Responsive & UX (`index.astro`)

- **DOM order becomes ecological** (sky→ground→soil: canopy, hive, polyculture, beds,
  compost, mycelium) via a homepage-local ordering of the `zones` array — `zones.ts`
  and the map overlay are untouched. Desktop scatter is position-absolute, so DOM
  order only affects mobile/tab order (and tab order matching the visual story is a
  win).
- Mobile stack: tightened gap (`--space-6` → `--space-5`), `padding-bottom` ≥ 6rem so
  the map toggle pill never overlaps the last zone, zone-link padding ensuring ≥44px
  touch targets.
- Labels unchanged (mono uppercase `longDesc`, always visible).

### 5. Invariants

- LCP title untouched; no render-blocking JS; pretext chunk lazy + motion-gated.
- Full function with JS disabled (identical static garden).
- All decoration `aria-hidden`; links named by `longDesc`; axe zero violations.
- `prefers-reduced-motion`: no sway, no hover transforms, no earth animation, no
  pretext import.
- Lighthouse budgets stay green on `/` and all zones.

## Data flow

`zones.ts` (unchanged) → homepage-local ecological ordering → links + `ZoneGlyph`.
`ascii-earth.ts` (pure) → static frame at build (frontmatter) AND animated frames in
the browser (island), so fallback and animation share one source of truth.

## Error handling

- Pretext import/measure failure → caught, static frame remains.
- `requestIdleCallback` missing (Safari) → `setTimeout(…, 200)` fallback.
- All six zones have non-null `href` (unchanged).

## Testing strategy

- **Unit (Vitest):** `groundFrame` determinism, width bounds, char membership;
  `pickChar` selects by brightness+width weighting (edge cases: empty candidates →
  throws; single candidate).
- **E2E (`map.spec.ts` + existing suites):** static earth line present with
  non-empty text (no JS required); glyph ASCII `<text>` rows present per zone; fill
  regression (existing); mobile (375px) stack order is ecological; reduced-motion:
  flora `animation: none` AND earth line text does not change over a 1s window; axe
  zero violations; bee tests unaffected.
- **Lighthouse CI:** all budgets green.
- **Manual:** desktop + mobile screenshots — strata legible, glyphs sharp, no
  overlaps (title/sprigs/map pill).

## Out of scope

- No site-wide pretext/JS layout (explicitly declined).
- No changes to zone interior pages, map overlay, `zones.ts`, or the cursor bee.
- No canvas; no new fonts.
