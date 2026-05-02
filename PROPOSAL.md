# gurden.xyz v2 — Phase 0 Proposal

_Last updated: 2026-05-02_

---

## 1. Stack Recommendation: Astro

**Recommendation: Astro 4 with MDX content collections, deployed to Netlify.**

### Justification per criterion

**1. Static-first / fast / cheap to host**
Astro's output is plain HTML/CSS by default — zero JavaScript shipped unless you explicitly opt in with an island. This is the strongest position of any framework candidate for hitting Lighthouse ≥ 95 on mobile. Deployments are static file bundles: Netlify free tier handles it trivially. GitHub Pages and Cloudflare Pages are also zero-config alternatives. Next.js static export produces a JS-heavy bundle even for mostly-static pages; SvelteKit static can match Astro but requires more explicit configuration to get there.

**2. Good DX for content authoring**
Astro has first-class MDX support via `@astrojs/mdx`. Content collections let you define a Zod schema per content type (projects, poems, journal entries) so a missing field throws a build error rather than silently rendering wrong. Adding a new project or poem means writing one `.mdx` file — no code changes. Frontmatter is typed and validated. This is the closest any static framework gets to a headless CMS without actually adding one.

**3. Rich interactive components without a heavy SPA**
Astro's islands architecture is exactly right here: the vast majority of the site is static HTML (fast, accessible, works without JS), while interactive pieces — the Marginalia hero, GLSL shaders, generative art sketches — are isolated islands that load independently and can be lazy-loaded. A canvas sketch in `/art` doesn't affect the bundle size of `/work`. No other candidate makes this tradeoff as cleanly.

**4. Creative-coding sketch ecosystem**
Each generative piece is an Astro island: a `.astro` or vanilla JS component with a `<canvas>` or WebGL context, loaded with `client:visible` so it only initialises when scrolled into view. No p5.js as a site-wide dependency — load it per-sketch only where it's genuinely the right tool. The GLSL shaders on the home page are vanilla WebGL islands: no Three.js, no framework, just compiled shader programs.

**Rejected candidates:**
- _SvelteKit static_: Excellent DX but better suited when the whole site needs reactivity. Adds complexity for a content-heavy site that's mostly static.
- _Next.js static export_: Large base bundle, App Router adds cognitive overhead without benefit, not designed for static-first.
- _11ty + modern bundling_: The current site is already 11ty. MDX integration is non-native, interactive islands require manual plumbing, and the upgrade path from the current starter would be rewriting everything anyway. Starting fresh in Astro is cleaner.

---

## 2. Information Architecture

Confirmed as brief specifies, with three refinements:

| Route | Purpose | Change from brief |
|-------|----------|-------------------|
| `/` | Hero (Skills + Marginalia) + Projects + Art portal | Expanded — see §4 |
| `/story` | Long-form life narrative | No change |
| `/work` | Project index | No change |
| `/work/[slug]` | Individual project page | No change |
| `/art` | Generative / creative coding — dark mode | Dark ground, experimental |
| `/music` | Music section | No change |
| `/writing` | Poetry and writing | No change |
| `/about` | Short bio + contact | No change |
| `/colophon` | Stack, fonts, carbon, credits | Renamed from "Built With" |
| `/feed.xml` | RSS feed | Already exists — preserve |
| `/404` | Custom 404 | Keep |

**Refinement 1 — No `/contact` page.** Contact lives on `/about`.

**Refinement 2 — `/writing` owns poetry AND longer prose.** Avoids a thin `/journal` route.

**Refinement 3 — Old URL redirects.** Current site has `/posts/[slug]`. Maps to `/work/[slug]`. Netlify `_redirects` handles this. Phase 5 work, planned from the start.

---

## 3. Visual Direction: The Index

**Feel:** Archival, intentional, unhurried. The site reads like a well-designed monograph — off-white paper ground, everything measured and placed. No motion for motion's sake. Shaders and generative elements are structural, not decorative.

### Typography

Two typefaces, both from [Collletttivo](https://www.collletttivo.it/) (SIL Open Font License, self-hosted):

| Face | Weights / Styles | Role |
|------|-----------------|------|
| **Mazius Display** | Regular, Bold, Extra Italic, Extra Italic Bold | All display text: hero tagline, project titles, poem titles, Marginalia paragraph, pull quotes. The Extra Italic is the personality of the site. |
| **Necto Mono** | Regular | All metadata and infrastructure: dates, nav items, labels, index columns, categories, annotation refs. Slanted terminals distinguish it from generic monospace. |

Body text (project descriptions, `/story` paragraphs) uses Mazius Display Regular at 17–18px. High contrast serifs hold at this size on modern screens; no third typeface needed.

### Color tokens

| Token | Value | Use |
|-------|-------|-----|
| `--ground` | `#F5F2ED` | Page background — warm off-white |
| `--ink` | `#1A1A18` | Body text, primary |
| `--ink-muted` | `#6B6760` | Metadata, labels, secondary text |
| `--ink-faint` | `#C4BFB6` | Ruled lines, borders, connecting lines |
| `--art-ground` | `#0D0F10` | Art section / portal background |
| `--art-ink` | `#E8E4DD` | Text on dark ground |

No separate accent color. Emphasis is typographic (italic, weight) not chromatic.

### Motion principle

One rule: _does this motion carry information?_ Annotation drift-in communicates sequence. Skills stagger communicates reading order. The paper grain shader communicates surface. Nothing else moves without a reason.

### Section divergence

- **Work / Story / About / Colophon:** Full Index system. Off-white, Mazius italic headings, Necto Mono labels.
- **Art:** Dark ground (`--art-ground`). Experimental; sketch islands break the grid. The `/art` section is its own design world — dark mode primary, more visual freedom.
- **Writing:** Inverts to near-black. Per-poem typography is encouraged — a poem that needs different spacing or layout gets it.

---

## 4. Home Page Structure

The home page communicates: **who Gurden is, what he does, selected work, and the art practice** — in that order.

### 4.1 Skills hero

Large Mazius Extra Italic stacked tagline:

```
Design.
Code.
Bring ideas to life.
```

Third line in Mazius Regular (lighter weight) to create rhythm. **pretext.js** powers the character-level stagger reveal on load — pretext measures exact glyph widths via canvas, enabling word-accurate stagger timing without DOM reflow. The stagger fires word-by-word on the first two lines, phrase-by-phrase on the third.

### 4.2 Marginalia bio

A paragraph of biography in Mazius Regular at 19px, set in a two-column grid:

- **Left column (narrower):** The paragraph. Key phrases underlined with a hairline.
- **Right column:** Five annotation notes in Necto Mono at 11px, full-ink (`--ink`), left-bordered with `--ink-faint`. Each note has a small uppercase label (Role / Project / Education) in `--ink-muted`.

Hovering a marked phrase dims all notes and highlights the relevant one. Notes reveal sequentially on load (opacity + 4px translateY, staggered 350ms each).

**Hero paragraph (confirmed):**
> Gurden is the Civic Tech Lead at Dark Matter Labs. Over the past five years, he has led the development of civic tools including CircuLaw, a legal registry for circular economy transitions with the City of Amsterdam and TreesAI, which models urban forestry as civic infrastructure for cities like Berlin, London, Glasgow, and Canadian municipalities. He has shaped Dark Matter Labs' digital identity, communications, and internal tech and tools practice. With a background in Computer Science from Georgia Tech and New Media Design from Aalto University, Gurden bridges governance innovation and implementation, turning systemic frameworks into things people can actually use.

**Annotation map:**

| Phrase | Label | Note |
|--------|-------|------|
| Civic Tech Lead at Dark Matter Labs | Role | Berlin — since 2020 |
| CircuLaw | Project | Legal tooling for circular economy / City of Amsterdam & EU |
| TreesAI | Project | Urban forest as civic infrastructure / Berlin · London · Glasgow |
| Computer Science from Georgia Tech | Education | Atlanta — 2009 to 2013 |
| New Media Design from Aalto University | Education | Helsinki — 2015 to 2017 |

### 4.3 Projects index

Index-style rows (Necto Mono grid: number · name · tag · year). Three featured projects, with a "All projects →" link in Necto Mono. Project names in Mazius Italic.

### 4.4 Art portal

A full-width dark card (`--art-ground`) with a live GLSL fragment shader — layered sinusoidal noise, palette-mapped to deep civic blues and earth tones, mouse-reactive. The shader is the signal: this section has different energy. Typography: art label in Necto Mono, title in Mazius Extra Italic.

On mobile: shader replaced by a static dark card with gradient overlay (no WebGL required for the portal link to function).

---

## 5. Shaders & Interactive Layer

### 5.1 Paper grain (home page background)

A WebGL canvas fixed-position behind all content, `mix-blend-mode: multiply`, `opacity: ~0.55`. Fragment shader: two-octave smooth noise, animated slowly — fine grain that makes the off-white feel like paper. Barely perceptible but felt.

**Performance:** Single draw call per frame, ~100 lines of GLSL, no textures. Budget: < 1ms GPU time on mid-range mobile. With `prefers-reduced-motion: reduce` or `prefers-reduced-data`: static flat background, shader not initialised.

### 5.2 Art portal shader

Vivid layered sinusoidal noise mapped through a palette function (deep blues, earth tones — not neon). Mouse position passed as a uniform: cursor attracts the field slightly. 4-iteration loop, runs in the dark art portal card only.

**Accessibility:** Both canvases are `aria-hidden="true"`. Content is readable without them. Toggle in page footer disables all canvas animation (sets `data-no-shader` on `<body>`).

### 5.3 pretext.js

Used for: skills tagline stagger on home page hero. pretext measures exact character widths via canvas (`CanvasRenderingContext2D.measureText`), enabling word-boundary-accurate stagger timing. This means the animation doesn't split mid-word regardless of container width — it always staggers whole words. Loaded as a small Astro island (`client:load`), isolated from the rest of the page.

Future use: per-poem layout in `/writing` (pretext for wrapping-aware text that's positioned manually over shaped containers).

---

## 6. Open Questions — Needed Before Phase 1

### Blocking for Phase 1

- [ ] **Self-hosted fonts confirmed.** Mazius Display + Necto Mono from Collletttivo GitHub. Files at `collletttivo/mazius-display` and `collletttivo/necto-mono`. Download and commit to `public/fonts/` — do not use GitHub raw URLs in production.
- [ ] **Domain.** Is `gurden.xyz` on Netlify? Confirm site name for Phase 5 swap.

### Blocking for Phase 2

- [ ] **Story copy.** Long-form narrative for `/story`. I will not write this. Rough draft, voice note, or bullet outline — any format.
- [ ] **Project content.** Each project needs: summary, your role, collaborators, outcome, ≥ 1 media asset. Work through project-by-project or provide a doc.
- [ ] **CV.** PDF to link, or a styled `/cv` page?

### Blocking for Phase 4

- [ ] **Art section.** Live interactive sketches (Astro island) or static exports, or both per-piece?
- [ ] **Music.** Spotify/SoundCloud embeds, originals, or a mix?
- [ ] **Writing.** Poems or prose ready? Which pieces get custom layout treatment?

### Non-blocking

- [ ] **Analytics.** None for now, or Plausible?
- [ ] **Contact on `/about`.** Form, `mailto:`, or social links only?
- [ ] **Old slugs.** Which of the six current posts (`CircuLaw`, `Sheffield_City_Goals`, `LifePact`, `Dm_site`, `LBS`, `Planetary_Civics`) map to `/work/[slug]`, and are any being dropped?

---

## 7. Phase Plan

### Phase 1 — Scaffold & Design System (2–3 days)
- Init Astro project, configure MDX, content collection schemas (projects, poems, art)
- Design tokens as CSS custom properties; `tailwind.config` if using Tailwind, else plain CSS
- Base layout: skip link, semantic landmarks, focus styles, reduced-motion layer
- Self-host Mazius Display + Necto Mono; establish type scale
- `/styleguide` page: all tokens, type scale, components
- Lighthouse + axe baseline before Phase 2

### Phase 2 — Core Pages (3–4 days)
- Home page scaffold (skills hero placeholder, Marginalia with real copy, projects index, art portal — no shaders yet)
- `/story` layout (requires copy)
- `/work` project index
- `/work/[slug]` project page template
- `/about`, `/colophon`
- One real project wired to MDX content collection as smoke test
- Lighthouse ≥ 95, zero axe violations before Phase 3

### Phase 3 — Shaders + Marginalia + pretext.js (2–3 days)
- Paper grain WebGL shader island (home page background)
- Art portal GLSL shader island
- Marginalia interaction: annotation column, hover sync, stagger reveal
- pretext.js skills stagger
- Reduced-motion fallbacks for all of the above
- Mobile fallbacks: static dark card for art portal, flat background for grain
- Screen-reader test, keyboard test, performance check (hero JS ≤ 10KB)

### Phase 4 — Art, Music, Writing (3–4 days)
- `/writing` — dark inversion, base poem template, per-poem custom layouts
- `/art` — dark mode, sketch island pattern (`client:visible`), source links
- `/music` — embed pattern per content type
- First generative sketch deployed as island

### Phase 5 — Polish & Launch (2–3 days)
- Real content across all sections
- Image optimisation: AVIF/WebP, `<Image>` component, all dimensions set
- Lighthouse pass: ≥ 95 all four categories on mobile
- axe-core pass: zero violations
- Manual VoiceOver test (macOS Safari)
- Cross-browser: Safari/WebKit, Firefox, Chrome
- Old URL redirects via Netlify `_redirects`
- RSS, sitemap, OG images, 404
- Website Carbon Calculator: A or A+
- DNS swap

---

## Appendix: Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Astro 4 | Islands architecture, MDX-native, static-first |
| Fonts | Mazius Display + Necto Mono (Collletttivo) | Open-source, distinctive, not generic — user confirmed |
| Generative layer | Vanilla WebGL shaders per-island | No Three.js/p5.js global dependency |
| Background shader | Paper grain (two-octave noise, multiply blend) | Surface texture, not decoration |
| Art portal shader | Layered sinusoidal noise, palette-mapped, mouse-reactive | Signals different energy; earned by context |
| Typography effects | pretext.js for skills hero stagger | Word-accurate stagger without DOM reflow |
| Color mode | Light primary; art/writing sections dark | Work = sober credibility; art = free |
| Signature element | The Marginalia (two-column: para + notes) | Original, earned by legal annotation reference |
| Hero paragraph | Confirmed copy from user (2026-05-02) | |
| Analytics | None (default) | Brief specifies |
| Hosting | Netlify | Already in use |
