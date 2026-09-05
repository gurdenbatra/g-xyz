# Garden v4 — "Show the Range, Sharpen the Craft" Design Spec

**Date:** 2026-09-05
**Status:** Approved (design); pending implementation plans (one per phase)
**Topic:** Fourth iteration of Gurden's Garden. Make the site clearly convey Gurden's
breadth (skills + the many hats he wears at Dark Matter Labs), sharpen the homepage
illustrations to pure crisp-geometric ASCII, scale and modernise the work/projects
and Hive content, remove the map, and add a subtle WebGL ambient background plus a
bee↔title interaction — all while preserving the site's SSG / no-JS / reduced-motion
/ a11y / Lighthouse invariants.

---

## Goal

Two things a visitor should now feel that they don't today: (1) **range** — that
Gurden does many different things well, across many roles; (2) **craft** — sharper,
intentional illustration and motion. Plus housekeeping: current content, fewer
extraneous controls, correct links.

## Requirements (from the user)

1. Homepage illustrations → **pure ASCII, sharp** (not "kid-drawn"). One direction
   chosen: **crisp geometric** (box-drawing + shade blocks); drop the SVG hybrid.
2. `/flora` projects → **remove the list, keep only the generative plot**; scale it;
   add six new projects: **xCO, INO Learning System, Many-to-Many, Planetary
   Compendium, RiskSense, Medulla**.
3. Surface **skills** — the site should show Gurden can do many different things well.
4. Surface the **many hats** at DM: civic tech lead, IT lead, strategy, bid writing,
   idea 0→1, partner holding, web dev for various projects, AI & workflows, service
   design, and more.
5. Rework the **Hive**: drop "Reading"; refresh "Now"; refresh the out-of-date
   network and the content below it.
6. **Remove the map** feature.
7. Add **WebGL shaders** — a cool background effect (and elsewhere where it fits).
8. A **bee↔title** hover interaction when the cursor-bee nears "Gurden's Garden".
9. **Mobile** must work great throughout.

## Decisions locked during brainstorming

- **Skills/hats placement:** woven into existing zones (skills on Flora, hats on the
  Hive) — no new homepage band or new zone.
- **ASCII style:** crisp geometric (box-drawing `│ ─ ╱ ╲ ╭ ╮ ╰ ╯` + shade blocks
  `░ ▒ ▓ █`); SVG dropped entirely from `ZoneGlyph`.
- **Shader:** subtle ambient background only, day/night-tinted, motion- and
  perf-gated, homepage only (interior accents explicitly out of scope for v4).
- **New projects:** researched + drafted from public sources; anything not verifiably
  public is flagged and left minimal until the owner confirms.

Reference for the target ASCII sharpness (Hive glyph):

```
      ▁▁▁▁▁▁▁
    ╱█████████╲
   ▕ ═════════ ▏
   ▕ ═══════○═ ▏
   ▕ ═════════ ▏
    ▀▀▀▀▀┳▀▀▀▀▀
```

---

## Architecture overview

Static Astro 5 site, SSG-first. All content and layout render without JS. The only
new client JS is (a) the WebGL ambient island and (b) the bee↔title proximity
enhancement — both idle-loaded, motion-gated, and LCP-neutral, following the existing
island discipline (reduced-motion gate, `requestIdleCallback` with `{timeout}`,
pause on `document.hidden`, re-acquire on `astro:page-load`, cancel on
`astro:before-preparation`). The ASCII glyphs and all new content are pure static
markup.

### Phase 1 — Content & IA

**Modify**
- `src/lib/zones.ts` — no id changes; `longDesc`/copy only if needed.
- `src/content/now/index.mdx` — drop the `reading` field; refresh `carrying`; keep
  `contact` (fix GitHub URL to `https://github.com/gurdenbatra`). The `nowSchema`
  (`src/content/schemas.ts`) must drop `reading` from the required shape, and
  `LiveFlock.astro` must stop consuming it.
- `src/pages/hive/index.astro` + `LiveFlock.astro` — remove Reading; add a **Hats**
  section (static list of roles); refresh the network intro/"stuff below."
- `src/lib/collaborators.ts` — refresh to the real co-inceptors named across the
  project frontmatter (and any the owner supplies); flagged for owner review.
- `src/pages/flora/index.astro` — **remove the `<ol>` project list**; keep `SlowPlot`;
  add a **Skills** section (the six CV skills) below the plot.
- `astro.config.mjs` — no route changes (map has no routes).

**Create**
- `src/content/projects/{xco,ino-learning-system,many-to-many,planetary-compendium,
  risksense,medulla}.mdx` — six new projects (frontmatter + researched body). xCO is
  detailed in the CV (LLM organisational learning infrastructure with agent
  orchestration; federated wiki, NL interface; live, in daily use). Others researched;
  unverifiable specifics flagged, bodies kept minimal until confirmed. Each gets a
  `plantType` so SlowPlot places it.

**Delete**
- `src/components/map/MapToggle.astro`, `src/components/map/MapOverlay.astro`, their
  imports/mount in `src/layouts/Garden.astro`, the map-open `<script>` logic in the
  layout, and the map E2E (`accessibility.spec.ts` "MapOverlay" describe + any
  `MapToggle` assertions). `MapOverlay` reads `zones` — removing it doesn't touch
  `zones.ts`.

### Phase 2 — Illustration overhaul

**Modify (full rewrite)**
- `src/components/home/ZoneGlyph.astro` — replace the SVG-silhouette + clipped-ASCII
  hybrid with five hand-authored crisp-geometric ASCII pieces, one per zone
  (`flora, hive, mulch, roots, castings`), rendered as `<pre aria-hidden="true">` in
  `var(--font-mono)`, palette-colored via a per-line/per-zone class, `white-space:pre`.
  Keep the `scale` prop (prime/secondary/base) driving font-size (not SVG width).
  Keep the wrapper `.zone-glyph` + the always-visible `.zone-label` and hover nudge.
- `src/pages/flora/index.astro` — generative-only (list removal lands in Phase 1;
  this phase confirms the plot reads well as the sole visual and at the larger project
  count).

**Tests**
- `e2e/map.spec.ts` (the homepage suite) — the glyph tests change from "has `<text>`"
  / "`.f-moss` fill" (SVG assertions) to "each zone glyph `<pre>` contains non-empty
  ASCII"; the fill-regression test is removed (no SVG fills anymore). Ecological
  order, labels, axe, reduced-motion assertions stay.

### Phase 3 — Motion (WebGL shader + bee↔title)

**Create**
- `src/components/home/AmbientShader.astro` — a full-bleed `<canvas>` behind the
  garden; an idle-loaded inline module compiles a small raw-WebGL fragment shader
  (flowing value-noise / soft light), reads day/night + palette from CSS custom
  properties to tint it, renders at a throttled framerate, pauses on hidden, and does
  nothing under `prefers-reduced-motion` (canvas stays absent/transparent → current
  paper shows). No external library (CSP-safe). Mounted in `index.astro` at the
  garden's back (`z-index` below the earth line and glyphs).
- `src/lib/shader.ts` (optional, pure) — the GLSL source strings + a tiny
  compile/link helper, unit-testable for "returns a program-or-null and never throws."

**Modify**
- `src/components/bee/CursorBee.astro` (or a small sibling module) — when the bee's
  position is within a threshold of the title's bounding box, dispatch a proximity
  value the title consumes; add the per-letter bloom to `index.astro`'s title
  (wrap letters in spans; a CSS custom property drives a subtle scale/warmth ripple).
  Motion-gated; pointer-only (no touch). Falls back to the current static title.

---

## Content detail

### Skills (Flora) — from the CV, verbatim set

Full-Stack Development · AI & LLM Systems · Prompt Engineering · Product Management ·
Service & Interaction Design · Rapid Prototyping. Rendered as a compact, legible
mono list/section on the Flora page (styled like the site's `.label` system), with a
one-line framing sentence. Static markup; no new data model needed (a local array in
the page or a small `src/lib/skills.ts`).

### Hats (Hive) — from the user

Civic Tech Lead · IT Lead · Strategy · Bid Writing · Idea 0→1 · Partner Holding ·
Web Development · AI & Workflows · Service Design — "and more" acknowledged. Rendered
as a "Hats" section on the Hive page. Static list (`src/lib/hats.ts` or inline).

### Hive "Now" rework

Drop `reading`. Refresh `carrying` to current work (Civic Tech Lead at DML; applied
AI/LLM systems incl. xCO; platform delivery, bids & partnerships). Keep `contact`
(email, LinkedIn, GitHub) — **fix GitHub to `github.com/gurdenbatra`**. `LiveFlock`
maps `carrying` + `contact` to flowers (no longer `reading`).

### Network refresh

Rebuild `collaborators.ts` from the real co-inceptors named across project frontmatter
(e.g. Romy Snijders, Sofia Valentini, Arianna Smaron, Alessandra Puricelli, …) plus
any the owner adds; classify person/org/idea. Flagged for owner review before publish.

### New projects (research + draft, flag internal)

xCO (CV-detailed), INO Learning System, Many-to-Many, Planetary Compendium, RiskSense,
Medulla. Research DM public site/GitHub + CV; draft case-study bodies matching the
existing seven's voice; **do not publish specifics that aren't verifiably public** —
leave those bodies minimal and flag them. Each file carries full frontmatter (title,
description, role, year, tags, `plantType`, links where public).

## Data flow

`zones.ts` → homepage glyphs + labels (unchanged wiring; glyph internals become ASCII).
`projects` collection → SlowPlot plants (auto-scales) — list removed. `now` collection
(minus reading) → LiveFlock. `collaborators.ts` → Hive network. `skills`/`hats` →
static sections. Day/night CSS vars → AmbientShader tint. Bee position → title
proximity var.

## Error handling

- Shader: any WebGL failure (no context, compile error) → catch, remove/hide canvas,
  static paper stands. Never throws; nothing logged in production.
- Bee↔title: if the title or bee element isn't found, no-op.
- New-project MDX must compile (simple Markdown only) — verified by build.
- Removing `reading` must not break `nowSchema` consumers or tests.

## Testing strategy

- **Unit (Vitest):** `shader.ts` compile helper (returns null, never throws, on a
  stub/absent GL context); `nowSchema` no longer requires `reading`; any new pure
  helpers. Existing suites stay green.
- **E2E (Playwright, chromium + webkit):** homepage glyph `<pre>` ASCII present per
  zone; `/flora` shows the plot and NO `<ol>` project list; Flora skills section
  present; Hive shows Hats, no Reading, refreshed network, correct GitHub href; map
  toggle/overlay absent everywhere; shader canvas present with motion / absent-or-static
  under reduced-motion; bee↔title enhancement present with motion and inert under
  reduced-motion; axe zero violations in day AND night on every page; all new project
  pages 200.
- **Lighthouse CI:** budgets green on `/` and all zones (shader idle/post-LCP; ASCII is
  lighter than SVG).
- **Mobile (375px):** QA gate each phase — glyphs legible, skills/hats stack, shader
  cheap/omitted, bee interaction pointer-only, no overflow.

## Invariants

SSG / full no-JS rendering; `prefers-reduced-motion` disables shader, bee interaction,
and all sway; axe zero-violations day and night; Lighthouse budgets; the whole
unit + E2E suite green on both browsers. All decorative layers `aria-hidden`; links
keep accessible names.

## Out of scope

- Interior-page shader accents (homepage shader only).
- A new homepage skills/hats band or new zone (woven into Flora/Hive instead).
- Any Astro 5→7 migration.
- Restructuring the map's *routes* (it has none) or the zone routes/ids.

## Phasing

One spec, three plans built in order, each shipping green:
1. **Content & IA** — 6 projects, skills, hats, Hive rework (drop reading, refresh
   network), remove map, GitHub fix, generative-only /flora list removal.
2. **Illustration** — five crisp-geometric ASCII glyphs; confirm generative-only plot.
3. **Motion** — WebGL ambient shader; bee↔title interaction. Mobile QA gates all three.
