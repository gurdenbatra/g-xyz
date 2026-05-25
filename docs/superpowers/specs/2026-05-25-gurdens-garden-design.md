# Gurden's Garden — Design Spec

**Date:** 2026-05-25
**Status:** Draft for review
**Replaces:** the current portfolio site at gurden.xyz (Astro 4, conventional layout)

---

## 1. Concept

The site is a wild permaculture garden you walk through. It tells visitors who Gurden is, what he makes, who he works with, and what he's tending right now — but through the metaphor of an actual garden: regenerative, multi-species, alive, intentionally untidy, with visible care.

Brand evolves from "gurden.xyz" to **Gurden's Garden**. URL stays. Title, identity, and IA shift.

The metaphor is the IA, not decoration: visitors do not see a project list, an about page, and a contact form. They see a garden map, and they walk into named zones to find content.

---

## 2. Information Architecture

Six zones + a persistent map overlay. Each zone is an Astro route.

| Zone | Element | Content | URL |
|---|---|---|---|
| 🌿 The Polyculture | wild plants growing together | work (project index + details) | `/polyculture`, `/polyculture/[slug]` |
| 🌳 The Canopy | leaves hanging from a tree | art: poems, songs, A/V, long-form essays/blogs | `/canopy`, `/canopy/[slug]` |
| 🐝 The Hive | live, buzzing, current | what I'm working on now + contact | `/hive` |
| 🪱 The Compost | decomposing layers = timeline | about + story (origins, what shaped me) | `/compost` |
| 🍄 The Mycelium | node graph + connections | network of collaborators, orgs, idea nodes | `/mycelium` |
| 🛠 The Beds | raised beds = built + maintained | colophon + care protocols (a11y, sustainability) | `/beds` |

**Home (`/`)** is the map: a top-down illustration of the garden with all six zones clickable. From every zone, a top-right map-toggle re-opens the map as an overlay.

**Persistent global UI** (visible from every zone):
- Paper-grain background shader
- Cursor bee (follows pointer, slows on click)
- Map toggle button (top-right)
- Map overlay panel (opens from toggle)
- Skip-link + keyboard nav scaffolding

**v1 explicitly out of scope:**
- Night-mode toggle (palette tokens ready, UI ships in v2)
- 3D walkthrough zone (could become a single Canopy piece later)
- Hemisphere-aware seasonal detection (v1 hardcodes northern hemisphere; v2 detects)
- Search across zones

---

## 3. Visual System

### 3.1 Style

Cut-paper riso illustration (flat, bold, layered shapes — Charley Harper × Eric Carle vocabulary) is the resting state. Procedural generative shaders are the living layer. Both coexist: visitors see cut-paper at rest, see generative work alive everywhere.

### 3.2 Palette — Earth-Rooted Riso

Base tokens (cream, terracotta, ochre, moss, indigo) live in `tokens.css`. The palette is intentionally rooted in soil + plant + sky colors.

```
--paper:        #f1e8d0   /* cream */
--soil:         #8a4f2e   /* terracotta */
--ochre:        #d9a857   /* dandelion */
--moss:         #5a7a4a   /* foliage */
--indigo:       #2a3a5a   /* deep sky / structural ink */
--chartreuse:   #c4d670   /* generative accent / pollen */
--ink:          #1a1a1a   /* riso black */
```

All combinations pass WCAG 2.2 AA on body text and UI controls.

### 3.3 Seasonal Modifier

A `seasonal.css` layer swaps three accent tokens based on the visitor's current date (northern hemisphere by default, user-toggleable). Palette is chosen on first visit and persists for the session (does not shift mid-session).

- **Spring** (Mar–May): chartreuse-leaning, brighter
- **Summer** (Jun–Aug): ochre-leaning, sun-soaked
- **Autumn** (Sep–Nov): rust-leaning, warmer
- **Winter** (Dec–Feb): indigo-leaning, cooler, quieter

### 3.4 Typography

- **Body**: keep current serif (Source Serif or equivalent) — readability and continuity
- **Zone titles + display**: add a geometric sans (Futura-adjacent — Mona Sans or Inter Tight Black) for "PRINTED POSTER" feel
- **Marginalia + handwritten labels**: italic serif or a humanist hand (already in use)

### 3.5 Dark Mode

Tokens designed dark-mode-ready from day one. Night-mode UI (bioluminescent twilight palette: deep moss base, cream illustration, glowing chartreuse generative layer) ships in v2.

---

## 4. Motion System

### 4.1 Tier — Performative

Each zone has one **hero generative piece** that IS portfolio work, not decoration. Visitors stop and watch. See Section 5 for piece-by-piece detail.

### 4.2 Global persistent motion

Lives in the root layout, runs across all zones:
- Paper-grain shader (continuous, very subtle)
- Cursor bee (follows pointer, gentle physics)
- Portal shader during view-transitions (animated organic mask wipes between zones)

### 4.3 Reduced motion — "Dimmed but alive"

When `prefers-reduced-motion: reduce`:
- Generative pieces freeze on a representative still frame
- Each piece shows a small "▶ start motion" affordance — user opt-in to motion per piece
- Particles slow to ~0.5Hz drift max; no autoplay sway, no scroll-linked motion
- Portal transitions become fast crossfades
- All content + IA + interactions remain functional

### 4.4 Mobile fidelity

Full IA + content; reduced canvas sizes; lower particle counts; prefer Canvas 2D over WebGL where possible.

### 4.5 Performance budgets (enforced in CI)

| Metric | Budget |
|---|---|
| LCP (mobile, throttled Moto G4) | < 2.5s |
| INP | < 200ms |
| TBT | < 200ms |
| Homepage JS | < 80kb gzipped (excl. hero piece, which lazy-loads) |
| Total CSS | < 30kb gzipped |
| Per-piece frame budget | < 5ms on mid-tier mobile |

---

## 5. Hero Generative Pieces

One per zone. All v1.

### 🗺 Home — "The Map"
SVG top-down garden map; cursor bee follows pointer; zones gently breathe (subtle scale pulse). Clicking a zone triggers a portal-shader view-transition into it.
**Tech:** SVG + Canvas overlay (bee) + WebGL portal shader.
**Reduced motion:** no breathing; bee freezes when idle.

### 🌿 Polyculture — "Slow Plot"
A wild plot. Each project is a procedurally-grown plant (deterministic L-system seeded by project slug). Plant types — fern, sunflower, thistle, vine — assigned via optional `plantType` frontmatter field, falling back to a hash of the slug. Plants sway in a Perlin wind field. Hover = plant tilts toward cursor + handwritten tag appears. Click = navigate to project.
**Tech:** Canvas 2D for L-systems; WebGL fragment shader for wind displacement.
**Reduced motion:** plants static; no sway; tags still appear on hover.

### 🌳 Canopy — "Heavy Leaves"
A branch close-up. Each leaf is one piece of art. Wind rustles the branch. Click = leaf drops into focus and the piece plays inline:
- Poem-leaf (thin/elongated) → text overlay
- Song-leaf (curled) → audio-reactive shader plays with the audio
- A/V-leaf (broad/glossy) → embedded media
- Essay-leaf (largest, visible "veining") → unfolds into full readable view

The audio-reactive shaders are themselves portfolio pieces.
**Tech:** OGL/WebGL for leaves + wind sim; per-piece shaders for audio reactivity; HTML/CSS for text content.
**Reduced motion:** branch static; leaves still clickable; audio-reactive shader replaced with a waveform visualization on play.

### 🐝 Hive — "Live Flock"
A Perlin flow-field bee flock (~30 bees desktop, ~12 mobile). Flowers in the field are labeled with current "now" items + contact methods. Bees carry pollen parcels between flowers. Hover a flower = bees converge + content card slides in.
**Tech:** Canvas 2D (no WebGL needed for this density).
**Reduced motion:** bees freeze in last positions; flowers remain interactive.

### 🪱 Compost — "Strata"
A vertical soil cross-section. Each decomposing layer = a chapter of the story (childhood, school, first jobs, current). Scroll reveals deeper layers. Procedural soil noise; sprite worms wriggle between layers; clicking a worm reveals a hidden anecdote or photo.
**Tech:** SVG noise filter for soil + Canvas 2D for worms + scroll-linked layer reveal (Motion One).
**Reduced motion:** layers reveal on plain scroll (no parallax); worms shown still.

### 🍄 Mycelium — "Nodes"
A force-directed graph of collaborators, organizations, and idea nodes. Each node is a small hand-drawn illustration. Connections pulse as if signals flow. Click a person/org-node = info card; click an idea-node = associated work + recent Canopy essays surface as neighbors.
**Tech:** Canvas 2D with hand-rolled force simulation (no d3 dependency).
**Reduced motion:** graph settles immediately to stable positions; no ongoing pulse; signals static.

### 🛠 Beds — "Tended Beds"
A neat grid of raised beds: tech stack, accessibility commitments, performance budget, license, sustainability (page weight, hosting). A watering can icon visits each bed in turn — a slow, quiet "tending" loop. Hover = manual tending; idle = auto-cycle.
**Tech:** Pure CSS + SVG animation (the intentionally cheap piece).
**Reduced motion:** tending happens only on hover/tap; no auto-cycle.

---

## 6. Architecture

### 6.1 Routing & navigation

Astro 5 (upgrade from 4) for stable View Transitions API. Each zone is a `.astro` route. The view-transition between routes runs a portal shader — a full-viewport WebGL pass that animates an organic mask wiping the old zone away and revealing the new one. Non-supporting browsers fall back to a fast crossfade.

### 6.2 Persistent vs per-zone state

**Persistent (root layout, survives navigation):**
- Paper-grain shader
- Cursor bee
- Map-toggle button + map overlay panel
- Palette tokens + seasonal modifier
- Keyboard nav infrastructure

**Per-zone (mounts on enter, unmounts on leave):**
- Hero generative piece
- Zone content
- Zone-scoped CSS

### 6.3 Canvas mounting pattern

Every hero piece is an Astro island with `client:visible` + an `IntersectionObserver`-gated start. Pieces pause when off-screen, resume on return. Each piece exports a `mount(canvas, opts)` + `destroy()` so they are testable and lifecycle-safe.

### 6.4 File structure

```
src/
  pages/
    index.astro             # the map (home)
    polyculture/
      index.astro
      [slug].astro          # project detail
    canopy/
      index.astro
      [slug].astro          # individual art / essay piece
    hive/index.astro
    compost/index.astro
    mycelium/index.astro
    beds/index.astro
  layouts/
    Garden.astro            # root: grain, cursor bee, map toggle, view transitions
  components/
    map/
      MapOverlay.astro
      MapToggle.astro
    bee/
      CursorBee.astro
    transitions/
      PortalShader.astro
    zones/
      Polyculture/SlowPlot.ts
      Canopy/HeavyLeaves.ts
      Hive/LiveFlock.ts
      Compost/Strata.ts
      Mycelium/Nodes.ts
      Beds/TendedBeds.astro
    generative/
      lsystem.ts             # shared
      flowField.ts           # shared
      forceGraph.ts          # shared
      wind.glsl              # shared shader
      noise.glsl             # shared shader
  content/
    projects/                # existing — keeps current schema + adds optional plantType
    art/                     # NEW — poems/songs/AV/essays for Canopy
    collaborators.yml        # NEW — for Mycelium nodes
    now.mdx                  # NEW — single file, edited regularly, read by Hive
  styles/
    tokens.css               # extended: zone palettes, seasonal modifiers
    seasonal.css             # NEW
    typography.css           # extended: display face for zone titles
```

### 6.5 Stack — additions

| Package | Purpose | Justification |
|---|---|---|
| `astro@5` (upgrade) | framework | stable View Transitions API |
| `@astrojs/mdx@4` | content | upgrade alongside Astro 5 |
| `ogl@^1` | WebGL | ~10kb, modern, hand-rolled-shader-friendly |
| `motion@^11` (Motion One) | animation | ~4kb, WAAPI-based, no license issues |
| `@lhci/cli` (already present) | CI perf | add a budget file with hard caps |

### 6.6 Stack — explicitly NOT adding

- React / Solid / Preact (Astro islands + vanilla JS are sufficient)
- Tailwind (existing CSS tokens are working and lighter)
- GSAP (Motion One covers our needs; GSAP has commercial license costs)
- Three.js (too heavy; OGL gives us what we need)
- p5.js (ships separate runtime, too heavy)
- d3 (would only use force-sim; we hand-roll instead — ~100 lines)

---

## 7. Content Migration

### 7.1 Existing content — kept, repurposed

- `src/content/projects/` (7 projects, MDX + schema) → become plants in Polyculture. Schema gains optional `plantType: 'fern' | 'sunflower' | 'thistle' | 'vine' | 'grass' | 'shrub'`. If absent, hash slug to assign.
- About / story content → migrates into Compost strata layers.
- Colophon content → migrates into Tended Beds + new care protocols sections.

### 7.2 New content collections

- `src/content/art/` (NEW) — for Canopy. Schema:
  ```ts
  {
    title: string,
    kind: 'poem' | 'music' | 'av' | 'essay',
    year: number,
    file?: string,        // audio/video file path
    embed?: string,       // embed URL
    shader?: string,      // path to audio-reactive shader for music
    body: MDX             // the piece itself or accompanying notes
  }
  ```
- `src/content/collaborators.yml` (NEW) — for Mycelium nodes:
  ```yaml
  - name: ...
    kind: person | org | idea
    role?: ...
    url?: ...
    connections: [slug, slug, ...]
  ```
- `src/content/now.mdx` (NEW) — single file. Sections: "What I'm carrying right now", "What I'm reading", "Reach me". Edited manually, ~weekly.

### 7.3 URL redirects (preserve history + external links)

- `/work` → `/polyculture` (301)
- `/work/[slug]` → `/polyculture/[slug]` (301)
- `/about` → `/compost` (301)
- `/colophon` → `/beds` (301)

### 7.4 No deletions during migration

Pages are renamed/repurposed in place. Git history stays clean and traceable.

---

## 8. Testing & Quality

### 8.1 Unit (Vitest)

Every generative module (`lsystem.ts`, `flowField.ts`, `forceGraph.ts`, `noise.ts`) gets deterministic tests: given a seed, output is stable.

### 8.2 Component (Vitest + happy-dom)

Astro components compile-clean; props/slots render expected DOM; canvas islands mount + destroy without leaks.

### 8.3 E2E (Playwright)

Existing journeys ported to new routes; new zone journeys added. Each zone gets:
- Navigates from map and from another zone
- Content visible
- Hero piece mounts within budget
- Keyboard nav works (Tab, Enter, Esc)
- Reduced-motion variant works
- Mobile viewport works

### 8.4 Accessibility (axe in Playwright)

Zero violations on every zone in both palette mode (palette = current season) and reduced-motion mode. Re-tested on every PR.

### 8.5 Visual regression

Screenshot test the still-frame of each generative piece (with `prefers-reduced-motion: reduce` so they are deterministic).

### 8.6 Performance (Lighthouse CI)

Budget file enforces Section 4.5 caps. Build fails if exceeded. Reports posted to PR.

---

## 9. Build Phases

Each phase = its own PR, shippable independently. Order optimizes for: ship something visible early, defer the longest-tail content (art) to last.

| # | Phase | Scope | Ships |
|---|---|---|---|
| 1 | **Foundation** | Astro 5 upgrade, earth-rooted palette + seasonal modifier, display typeface, root `Garden.astro` layout, paper-grain + cursor-bee shaders, OGL + Motion One installed, Lighthouse budget file, no new routes yet | infrastructure + visible style change |
| 2 | **The Map** | new `/` map view, MapOverlay + MapToggle, view-transitions configured, portal shader skeleton. Old home archived. | new home page |
| 3 | **Polyculture + project detail** | `/polyculture` with Slow Plot, project detail moved to `/polyculture/[slug]`, `plantType` schema addition, `/work` 301 | work zone live |
| 4 | **Compost** | `/compost` with Strata piece, about/story migrated, `/about` 301 | about zone live |
| 5 | **Beds** | `/beds` with Tended Beds, colophon migrated + care protocols added, `/colophon` 301 | colophon zone live |
| 6 | **Hive** | `/hive` with Live Flock, `now.mdx` + contact, no migration | now/contact zone live |
| 7 | **Mycelium** | `/mycelium` with Nodes graph, first batch of collaborators seeded | network zone live |
| 8 | **Canopy** | `/canopy` with Heavy Leaves + audio-reactive shaders, seeded with whatever art content you upload | art zone live → v1 complete |
| 9 | *(v2)* | Night-mode toggle (bioluminescent twilight), seasonal hemisphere detection, refinements from feedback | v2 |

---

## 10. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Generative pieces blow the JS budget | Lazy-load per piece with `client:visible`; benchmark in dev mode; degrade aggressively on mobile |
| View Transitions browser support gaps | Crossfade fallback for non-supporting browsers; portal shader is enhancement, not requirement |
| Audio-reactive shaders in Canopy require real audio assets | Canopy is phase 8 (last) — gives time to author the assets |
| The site reads as "too clever" for visitors who just want a portfolio | Map view + clear zone names + keyboard nav + visible care protocols keep utility intact; metaphor is a layer, not a barrier |
| Reduced-motion experience feels diminished | "▶ start motion" affordance per piece + dimmed-alive ambience + a one-time "you can turn motion on" hint on the map |

**Open questions for follow-up planning (not blockers for the design):**
- Display typeface — pick the actual font (Mona Sans, Inter Tight, Space Grotesk, custom?) in Phase 1
- Exact L-system grammars per plant type — defined when building Slow Plot in Phase 3
- Audio-reactive shader scope per song — defined per piece in Phase 8

---

## 11. Success Criteria

v1 ships successfully when:

- All six zones live with their hero pieces
- All performance budgets met on mid-tier mobile
- Zero axe violations across all zones in both motion modes
- All existing content migrated; all 301s in place; no external links broken
- Reduced-motion variant fully functional
- Keyboard-only navigation reaches and operates every interactive element
- The site is recognizably **a garden** — not a portfolio with garden decoration
