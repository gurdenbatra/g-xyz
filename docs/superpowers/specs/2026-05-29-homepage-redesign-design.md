# Homepage Redesign — "Gurden's Garden" Design Spec

**Date:** 2026-05-29
**Status:** Approved (design); pending implementation plan
**Topic:** Replace the block-grid homepage with an organic, garden-like landing page.

---

## Goal

Redesign the homepage (`src/pages/index.astro`) so it feels like a garden rather than a
grid of blocks — inspired by the open, scattered, whitespace-heavy mood of
sanjanabraju.com — while keeping the site's earth-rooted palette and literary tone.

## Requirements (from the user)

1. Less block-based; "feel more like a garden."
2. Remove `gurden.xyz` from the top of the homepage.
3. Make **Gurden's Garden** *way* bigger and bold.
4. Remove **all** emojis (site-wide, confirmed).
5. Scatter the zone links around the field (not a tidy stack).
6. Each zone link gets its own visual mark (a bespoke botanical glyph replacing the emoji).
7. More ambient flora than the first mockup.

## Chosen design (validated via visual companion)

- **Direction C3 — centered:** the giant name dominates the center of the viewport.
- **Scattered zones:** the six zones are placed organically around the name (two upper,
  two mid-sides, two lower), each pairing a hand-drawn botanical SVG glyph with its name.
- **Hover-reveal:** zone name shown at rest; the longer description fades in on hover/focus.
- **Botanical line-art flora:** decorative SVG sprigs/seed-heads/leaves in the earth
  palette, swaying slowly (CSS), filling the margins.
- **No nav on home:** the `gurden.xyz` nav strip is not rendered on `/`; the giant name is
  the masthead. Inner pages keep the small nav logo.

---

## Architecture

Static Astro 5 page. **No new client JS and no canvas** — the flora sway and the
hover-reveal are pure CSS (keyframes + `:hover`/`:focus-within`). This keeps the
Lighthouse budget healthy and the homepage fully functional without JavaScript. (This is
a deliberate simplification from "reuse the Canopy `noise.ts` wind engine" considered
during brainstorming: a staggered CSS sway gives the same gentle motion with zero JS
cost and no canvas paint on the LCP screen.)

### File structure

**Create**
- `src/components/home/ZoneGlyph.astro` — renders the correct inline SVG glyph for a
  given `id: ZoneId`. One small, focused component; a `switch`/lookup over the six zones.
- `src/components/home/GardenFlora.astro` — renders the ambient decorative sprigs
  (each `aria-hidden`, swaying via CSS, with staggered delays). Owns the `@keyframes sway`
  and `prefers-reduced-motion` guard for the ambient flora.

**Modify**
- `src/pages/index.astro` — full rewrite of the page body + styles (the redesign target).
- `src/styles/tokens.css` — add a `--text-display` token for the giant name.
- `src/lib/zones.ts` — remove the `emoji` field from the `Zone` interface and all 6 entries.
- `src/layouts/Garden.astro` — pass `home` to `<Nav>`; preload the `ExtraItalicBold` font.
- `src/components/Nav.astro` — accept a `home` prop; render nothing when `home` is true.
- `src/components/map/MapOverlay.astro` — remove the `zone-emoji` spans + CSS (text-only).
- `src/pages/{canopy,compost,hive,mycelium,beds}/index.astro` — remove the hard-coded
  `zone-emoji` `<p>` and its `.zone-emoji` CSS. (`polyculture/index.astro` has no emoji.)

**Modify (tests)**
- `e2e/map.spec.ts` — update homepage selectors (no `.garden-map` / `.zone-patch`).
- `e2e/accessibility.spec.ts` — move the nav-landmark & logo-link assertions off `/` onto
  an inner page; add a "homepage has no nav logo / no gurden.xyz" assertion.
- Add homepage coverage for: giant `h1`, six zone links, hover/focus reveal, no emoji,
  reduced-motion, and an axe pass (extend `axe.spec.ts` or `map.spec.ts`).

---

## Component & layout detail

### Giant name (`index.astro`)

```html
<h1 class="garden-title">
  <span>Gurden's</span>
  <span>Garden</span>
</h1>
```

- Accessible text remains "Gurden's Garden" (single `<h1>`). Two `<span>`s (each
  `display:block`) give the two-line stack without a hard `<br>`.
- Styling: `font-family: var(--font-serif)` (MaziusDisplay), `font-style: italic`,
  `font-weight: 700` → resolves to the **MaziusDisplay-ExtraItalicBold** face (heavy +
  italic = "bold"), `font-size: var(--text-display)`, `line-height: ~0.82`,
  `letter-spacing: -0.02em`, `color: var(--ink)`, centered.

### Display token (`tokens.css`)

```css
--text-display: clamp(4rem, 16vw, 11rem); /* homepage masthead — much larger than --text-4xl */
```

### Scattered zones (`index.astro` + `ZoneGlyph.astro`)

Render order is the `zones` array. Each zone:

```html
<a class="zone-link" href={zone.href} data-zone={zone.id} style={`--zx:${pos.x}; --zy:${pos.y};`}>
  <ZoneGlyph id={zone.id} />
  <span class="zone-name">{zone.name}</span>
  <span class="zone-hint">{zone.longDesc}</span>
</a>
```

- `zone.name` (e.g. "The Polyculture") is the visible label; `zone.longDesc`
  (e.g. "Work & projects") is the hover/focus hint. Both come straight from `zones.ts` —
  no invented copy. `data-zone` is retained for tests and parity with the map overlay.
- **Hover/focus reveal:** `.zone-hint { opacity: 0; transition: opacity }`, revealed by
  `.zone-link:hover .zone-hint`, `.zone-link:focus-within .zone-hint`. The hint is always
  in the DOM (not `display:none`) so it stays available to assistive tech and is keyboard
  reachable.
- **Glyphs** (`ZoneGlyph.astro`), each echoing the zone's existing identity, all stroked
  in palette colors, `aria-hidden="true"`:
  - polyculture → mixed multi-leaf sprig
  - canopy → tree (trunk + round crown)
  - hive → honeycomb hexagon cell
  - compost → soil strata lines + a worm curve
  - mycelium → branching node network
  - beds → seedling in a tilled row

**Positioning strategy (responsive):**
- **≥ 768px:** the page body is a `position: relative` stage filling
  `min-height: calc(100dvh - 4rem)` (matching today's `.map-section`; the header is
  absent on home, so the stage effectively spans the viewport). The giant name is centered
  (absolutely or via flex). Each `.zone-link` is `position: absolute`, placed via authored
  per-zone coordinates (`--zx`/`--zy` percentages) and `translate(-50%,-50%)` so the link
  centers on its anchor point. Authored positions (collision-free with the centered name):

  | zone | --zx | --zy |
  |------|------|------|
  | polyculture | 11% | 14% |
  | canopy | 86% | 12% |
  | hive | 7% | 55% |
  | compost | 92% | 57% |
  | mycelium | 22% | 86% |
  | beds | 77% | 85% |

- **< 768px:** drop absolute positioning — zones fall back to a centered vertical flow
  list beneath the name (no overlap on small screens, fully tappable). The scatter is a
  progressive enhancement for wider viewports.

### Ambient flora (`GardenFlora.astro`)

- ~7 decorative SVG sprigs at authored positions (taller ones rooted along the bottom,
  smaller seed-heads drifting upper-left/right), all `aria-hidden="true"`.
- `@keyframes sway` rotates ±4° about `transform-origin: bottom center`, ~5s ease-in-out,
  staggered `animation-delay` per sprig. Wrapped in
  `@media (prefers-reduced-motion: reduce) { animation: none }`.
- Pure decoration: no text, no links, no JS.

### Nav on home (`Nav.astro` + `Garden.astro`)

- `Garden.astro` already knows the page via `title`. Pass `home={title === 'Home'}` to
  `<Nav>`.
- `Nav.astro` accepts `home?: boolean`. When `home` is true it renders nothing (no `<nav>`,
  no logo, no empty sticky bar). When false, it renders today's `gurden.xyz` logo nav
  unchanged.
- The `<header>` wrapper in `Garden.astro` stays; on home it simply has no nav child.

### Font preload (`Garden.astro`)

The giant name is the LCP element and uses **MaziusDisplay-ExtraItalicBold**, which is not
currently preloaded. Add:

```html
<link rel="preload" href="/fonts/MaziusDisplay-ExtraItalicBold.woff2" as="font" type="font/woff2" crossorigin />
```

(Preload globally is fine; it's already used elsewhere for bold-italic display text.)

### Emoji removal (site-wide)

- `zones.ts`: delete `emoji` from the interface and every entry. This forces all consumers
  to stop referencing it (compile-time safety).
- `MapOverlay.astro`: remove both `<span class="zone-emoji">{zone.emoji}</span>` and the
  `.zone-emoji` rule; adjust `.zone-link` so the text column aligns without the glyph slot.
  Structure (`data-zone`, hrefs, `--soon` variant) is unchanged → existing overlay tests
  keep passing.
- `{canopy,compost,hive,mycelium,beds}/index.astro`: remove the
  `<p class="label zone-emoji" aria-hidden="true">…</p>` line and the `.zone-emoji` CSS
  block in each.

---

## Data flow

`zones.ts` (single source of truth) → `index.astro` maps it to scattered links +
`ZoneGlyph` → `MapOverlay.astro` maps it to the slide-out list. No new data; the `emoji`
field is removed, `id`/`name`/`longDesc`/`href` continue to drive both surfaces.

## Error / edge handling

- All six zones currently have non-null `href`, so the homepage renders six real links.
  The `--soon` (null href) branch is retained in the map overlay for future zones but is
  not exercised on the homepage today.
- Motion fully disabled under `prefers-reduced-motion`.
- No-JS: page is fully usable (links work, hints reveal on hover/focus via CSS).

---

## Testing strategy

- **`e2e/map.spec.ts`:** replace `.garden-map` / `.zone-patch` assertions. Assert: the
  homepage container exists; six `a.zone-link[data-zone=…][href=…]` are attached with the
  correct hrefs; the computed `font-size` of `h1.garden-title` is large (e.g. > 60px at
  desktop viewport, guarding "way bigger"); the rendered homepage text contains none of
  the six emoji characters.
- **`e2e/accessibility.spec.ts`:**
  - Move `nav landmark is present` and `nav contains the logo link` to run against
    `/polyculture` (inner page) instead of `/`.
  - Add: on `/`, there is **no** `nav` logo and the text `gurden.xyz` is absent.
  - Keep all MapToggle/MapOverlay tests (unchanged behavior).
  - Add: focusing a `.zone-link` reveals its `.zone-hint` (opacity > 0).
  - Add (or via `axe.spec.ts`): axe scan of `/` passes with no violations.
- **Reduced motion:** with `test.use({ contextOptions: { reducedMotion: 'reduce' } })`,
  assert the flora `animation` resolves to `none` (matches the Canopy pattern).
- **Lighthouse CI:** `/` budget stays green (the font preload protects LCP).
- **Unit tests:** none required — `ZoneGlyph`/`GardenFlora` are static presentational
  components and `zones.ts` has no logic (just data); coverage comes from E2E.

## Out of scope

- No changes to zone interior pages beyond emoji removal.
- No new geometric/whimsical motif set (botanical line-art only — direction A chosen).
- Map overlay keeps its text-only list; per-zone glyphs are a homepage-only feature.
