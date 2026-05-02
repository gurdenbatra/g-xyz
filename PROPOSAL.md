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
Astro's islands architecture is exactly right here: the vast majority of the site is static HTML (fast, accessible, works without JS), while interactive pieces — the Marginalia hero, generative art sketches, audio embeds — are isolated islands that load independently and can be lazy-loaded. A canvas sketch in `/art` doesn't affect the bundle size of `/work`. No other candidate makes this tradeoff as cleanly.

**4. Creative-coding sketch ecosystem**
Each generative piece is an Astro island: a `.astro` or vanilla JS component with a `<canvas>` element, loaded with `client:visible` so it only initialises when scrolled into view. No p5.js as a site-wide dependency — load it per-sketch only where it's genuinely the right tool (it often isn't). For the Marginalia hero: pure CSS + ~2KB of vanilla JS. For future art pieces: raw Canvas API, OGL for anything needing WebGL, or p5.js scoped to that one island.

**Rejected candidates:**
- _SvelteKit static_: Excellent DX but better suited when the whole site needs reactivity. Adds complexity for a content-heavy site that's mostly static.
- _Next.js static export_: Large base bundle, App Router adds cognitive overhead without benefit, not designed for static-first.
- _11ty + modern bundling_: The current site is already 11ty. It works, but MDX integration is non-native, interactive islands require manual plumbing, and the upgrade path from the current starter would be rewriting everything anyway. Starting fresh in Astro is cleaner.

---

## 2. Information Architecture

Confirmed as brief specifies, with three refinements:

| Route | Purpose | Change from brief |
|-------|----------|-------------------|
| `/` | Hero (Marginalia) + curated entry points | No change |
| `/story` | Long-form life narrative | No change |
| `/work` | Project index | No change |
| `/work/[slug]` | Individual project page | No change |
| `/art` | Generative / creative coding | No change |
| `/music` | Music section | No change |
| `/writing` | Poetry and writing | No change |
| `/about` | Short bio + contact | No change |
| `/colophon` | Stack, fonts, carbon, credits | Rename from "Built With" ✓ |
| `/feed.xml` | RSS feed | Already exists in current site — preserve |
| `/404` | Custom 404 | Keep |

**Refinement 1 — No `/contact` page.** Contact information lives on `/about`. A separate `/contact` route fragments what should be a single short page. If a contact form becomes necessary, it's a section of `/about`.

**Refinement 2 — `/writing` owns poetry AND longer prose.** The brief groups them; keeping them together avoids a thin `/journal` route. If the volume of prose grows, split then.

**Refinement 3 — Old URL redirects.** The current site has posts at `/posts/[slug]`. These map to `/work/[slug]` in the new IA. Netlify `_redirects` handles this: one line per old slug. Preserving these is Phase 5 work but must be planned from the start.

---

## 3. Visual Direction: The Index

_Selected from two candidates in the brainstorming session._

**Feel:** Archival, intentional, unhurried. The site reads like a well-designed monograph — off-white paper ground, everything measured and placed. No motion for motion's sake. The generative element is structural, not decorative.

**Typography:** Two typefaces, both free/open-source:
- **Cormorant Garamond** (display/voice): A high-contrast old-style serif with exceptional italic cuts. Used for headings, the hero paragraph, pull quotes, poem titles. The italic is the personality.
- **IBM Plex Mono** (metadata/infrastructure): Used for dates, labels, navigation items, index columns, code. Designed to be legible at small sizes in UI contexts. The contrast between warm serif and cool mono IS the visual system.

**Color:** One palette, section-shifted:

| Token | Value | Use |
|-------|-------|-----|
| `--ground` | `#F5F2ED` | Page background (warm off-white) |
| `--ink` | `#1A1A18` | Body text, primary |
| `--ink-muted` | `#6B6760` | Metadata, labels, secondary text |
| `--ink-faint` | `#C4BFB6` | Ruled lines, borders, graph edges |
| `--accent` | `#1A1A18` | Same as ink — no color accent in work/story |
| `--writing-ground` | `#0F0F0E` | Inverted for writing section |
| `--writing-ink` | `#E8E4DD` | Text on dark ground in writing section |

**Motion principle:** One rule — _does this motion carry information?_ If no, it doesn't ship. The Marginalia annotations drift in because timing communicates sequence. Nothing else animates without a reason.

**How sections diverge:**
- **Work / Story / About / Colophon:** Full Index system. Off-white, Cormorant italic headings, Plex Mono labels. Restrained.
- **Art:** Same ground but the sketch islands break the grid. Each piece gets its own container. Source code links in mono.
- **Writing:** Inverts to near-black ground. Per-poem typography is encouraged — a poem that needs a different typeface or unusual spacing gets it. The system loosens here on purpose.

---

## 4. Signature Interactive Element: The Marginalia

_Selected from three concepts._

**Concept:** The home page hero is a single paragraph of biography — voice-first, written in first person. As the page loads, annotations drift into the right margin: project names, dates, places, asides. Each annotation connects to a marked phrase in the paragraph via a hairline rule. Hovering an annotated phrase expands its note. Clicking navigates to the relevant section or project.

The interaction is **reading**, not clicking a portfolio grid.

**Why it's earned:** It directly references legal annotation (CircuLaw analyzes legal frameworks; annotated text is the medium). It references academic marginalia (Aalto, research practice). It's how the /writing section will work too — a coherent reading metaphor across the site.

**Technical approach:**

```
Hero paragraph (semantic HTML, readable without JS)
  ↓
<mark> elements wrap annotated phrases
  ↓
Corresponding <aside> elements are positioned absolutely
  in the right margin via CSS (position: absolute, right: -180px)
  ↓
On load: annotations transition in with opacity + slight translateX,
  staggered by ~200ms each (CSS custom property --delay)
  ↓
On hover: note expands (max-height transition), hairline rule highlights
  ↓
On click: navigate (standard anchor href)
```

**Mobile:** Right margin disappears below 768px. Annotations move below the relevant phrase inline — a `<details>`/`<summary>` pattern so they're accessible and toggleable. No layout shift.

**Reduced-motion:** With `prefers-reduced-motion: reduce`, annotations are present from the start (no drift), hover still works, nothing moves. Content is fully accessible.

**Screen-reader:** The `<aside>` elements are in reading order in the DOM (just repositioned visually via CSS). A screen reader reads the paragraph, then each aside naturally. No ARIA tricks needed — semantic HTML is sufficient.

**Toggle:** A small "hide annotations" control in the corner (Plex Mono, 10px, keyboard focusable) sets a `data-annotations="off"` attribute on `<body>`, which a CSS rule uses to hide the asides. State persisted to `localStorage`.

---

## 5. Open Questions — Needed Before Phase 1

These are content and decision gaps that will block work if unresolved. Marked by urgency.

### Blocking for Phase 1 (design system + scaffold)

- [ ] **Fonts confirmed?** Cormorant Garamond + IBM Plex Mono. Both are Google Fonts — do you want self-hosted (faster, no Google request, better privacy) or Google CDN? _Self-hosting recommended._
- [ ] **Domain setup.** Is `gurden.xyz` currently on Netlify? The `netlify.toml` in the current repo suggests yes. Confirm the site name / team so Phase 5 deployment can plan the swap.

### Blocking for Phase 2 (core pages)

- [ ] **Story copy.** The `/story` page is a long-form life narrative. I need actual copy, or a voice note / rough draft to work from. I will not write this for you. What's your preferred format for getting this to me?
- [ ] **Project content.** For the work index and project pages: each entry needs at minimum a summary, your role, collaborators, outcome, and at least one media asset. The current site has minimal versions of some. Do you want to work through these one project at a time, or provide a document?
- [ ] **CV.** The brief mentions a downloadable CV. Do you have a current PDF to link? Should the design include a styled `/cv` page or just a file download?

### Blocking for Phase 4 (art, music, writing)

- [ ] **Art section format.** Do you want live interactive sketches embedded (Astro island, runs in browser), static exports (image/GIF), or both depending on the piece? If live: do any existing sketches have source code I can reference for the island pattern?
- [ ] **Music.** What goes here? Spotify/SoundCloud embeds of existing releases? Original compositions? Playlists? I need to know the format before designing the section.
- [ ] **Writing.** Do you have poems or prose ready? Even a few pieces would let me design the typography for the writing section properly. Which pieces, if any, should get custom per-poem layout treatment?
- [ ] **Hero paragraph.** The Marginalia needs the actual bio paragraph — your voice, not mine. Rough draft is fine; I'll flag what to annotate.

### Non-blocking but useful

- [ ] **Analytics.** Brief says default no analytics. Confirm: no analytics for now, or Plausible?
- [ ] **Email on `/about`.** Do you want a contact form, a plain `mailto:` link, or nothing (just social links)?
- [ ] **Old post slugs.** The current site has `/posts/CircuLaw`, `/posts/Sheffield_City_Goals`, `/posts/LifePact`, `/posts/Dm_site`, `/posts/LBS`, `/posts/Planetary_Civics`. Do all of these map to `/work/[slug]` in the new site? Are any being dropped?

---

## 6. Phase Plan

### Phase 1 — Scaffold & Design System (est. 2–3 days)
- Init Astro project, configure MDX, content collection schemas (projects, poems, art)
- Design tokens: CSS custom properties for color, type scale, spacing, motion
- Base layout component: skip link, semantic landmarks, focus styles
- Typography: self-host Cormorant Garamond + IBM Plex Mono, establish type scale
- Reduced-motion CSS layer (global `@media (prefers-reduced-motion)` rules)
- `/styleguide` page: all tokens, type scale, components visible in one place
- Lighthouse + axe baseline run — must pass before Phase 2

### Phase 2 — Core Pages, no Marginalia yet (est. 3–4 days)
- Home page: hero placeholder block (actual copy + Marginalia in Phase 3)
- `/story` — long-form narrative layout (requires story copy from you)
- `/work` — project index: list/table layout, filter by category
- `/work/[slug]` — project page template: hero media, summary, role, gallery, links
- `/about` — short bio + contact
- `/colophon` — stack, fonts, carbon, credits
- Wire up MDX content collections: add one real project as a smoke test
- Performance + accessibility check: Lighthouse ≥ 95, zero axe violations before Phase 3

### Phase 3 — The Marginalia (est. 2 days)
- Build the Marginalia hero component
- Implement annotation positioning, hover states, click navigation
- Mobile fallback: inline `<details>` pattern
- Reduced-motion: immediate display, no drift
- Toggle control with `localStorage` persistence
- Screen-reader and keyboard test
- Performance check: hero JS ≤ 5KB, no layout shift

### Phase 4 — Art, Music, Writing (est. 3–4 days)
- `/writing` — inverted color scheme, base poem template, per-poem custom layouts
- `/art` — sketch island pattern, lazy-load with `client:visible`, source links
- `/music` — embed pattern (Spotify/SoundCloud or custom player per content)
- Generative art: first sketch deployed as an island

### Phase 5 — Polish & Launch (est. 2–3 days)
- Real content swap across all sections
- Image optimization: AVIF/WebP via Astro's `<Image>` component, all dimensions set
- Lighthouse pass: all four categories ≥ 95 on mobile
- axe-core pass: zero violations
- Manual VoiceOver test (macOS Safari — noted as historically problematic on DML projects)
- Cross-browser: Safari/WebKit, Firefox, Chrome
- Old URL redirects: `/posts/*` → `/work/*` via Netlify `_redirects`
- RSS feed, sitemap, OG images (static, generated at build time), 404 page
- Website Carbon Calculator check: target A or A+
- DNS swap

---

## Appendix: Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Astro 4 | Islands architecture, MDX-native, static-first |
| Generative layer | Vanilla Canvas per-island | No global p5.js dependency; load per-piece |
| Type: display | Cormorant Garamond | Free, exceptional italic, archival feel |
| Type: metadata | IBM Plex Mono | Free, legible at small sizes, UI-appropriate |
| Color mode | Light primary, writing section dark | Work/credibility = sober light; writing = free |
| Signature element | The Marginalia | Original, earned, legal annotation reference |
| Analytics | None (default) | Brief specifies; add Plausible only if confirmed |
| Hosting | Netlify | Already in use, `netlify.toml` present |
