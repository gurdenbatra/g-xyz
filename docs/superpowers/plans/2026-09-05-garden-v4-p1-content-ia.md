# Garden v4 — Phase 1 (Content & IA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernise the site's content and information architecture — six new projects, a Skills section on Flora, the many-hats + refreshed content on the Hive, a generative-only /flora, the map removed, and the GitHub link corrected — leaving a working, testable site.

**Architecture:** Pure content/structure changes. No new client JS. The generative SlowPlot already renders one plant per project (auto-scales); its accessible equivalent (the project list) is kept but made visually hidden so the page shows only the plot while staying keyboard/screen-reader accessible. The map (an overlay + toggle) is deleted; the garden and the nav logo remain the navigation.

**Tech Stack:** Astro 5, TypeScript, Astro content collections, MDX, Zod, Playwright (chromium+webkit, baseURL `http://localhost:4321`), Vitest, Lighthouse CI, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-05-garden-v4-range-and-craft-design.md`

## Global Constraints

- SSG / full no-JS rendering preserved; all decoration `aria-hidden`; links keep accessible names.
- `prefers-reduced-motion` discipline unchanged; axe **zero violations in day AND night** on every page; Lighthouse budgets green; full unit + E2E suite green on **chromium AND webkit**.
- GitHub username is **`gurdenbatra`** (per CV) — every `github.com/gurden` → `github.com/gurdenbatra`.
- Stale dev-server hazard: a subagent's `pnpm dev &` left on :4321 gets reused by Playwright (`reuseExistingServer`). Always `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true` before an E2E run.
- Phases 2 (crisp-ASCII glyphs) and 3 (WebGL shader + bee↔title) are SEPARATE plans — do not start them here.

---

## Task 0: Preflight

**Files:** none.

- [ ] **Step 1:** `git status --short` → clean. If not, stop and ask.
- [ ] **Step 2:** `pnpm test` → all pass (150).
- [ ] **Step 3:** `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`, then `pnpm exec playwright test --project=chromium` → all pass. Note the count.
- [ ] **Step 4:** `pnpm exec astro check` → 0 errors / 0 warnings / 0 hints.

---

## Task 1: Remove the map feature

The map overlay was the interior-page cross-zone navigation; after removal, navigation is the homepage garden (reach it via the nav logo). The `map.spec.ts` file is the HOMEPAGE suite (misnamed) — do NOT touch it. Map assertions live in `accessibility.spec.ts`.

**Files:**
- Delete: `src/components/map/MapToggle.astro`, `src/components/map/MapOverlay.astro`
- Modify: `src/layouts/Garden.astro`, `e2e/accessibility.spec.ts`

- [ ] **Step 1: Delete the components**

```bash
git rm src/components/map/MapToggle.astro src/components/map/MapOverlay.astro
rmdir src/components/map 2>/dev/null || true
```

- [ ] **Step 2: Remove from the layout** — in `src/layouts/Garden.astro`: delete the two imports (`MapToggle`, `MapOverlay`), the `<MapOverlay />` and `<MapToggle />` lines, and the ENTIRE map `<script>` block (the `closeMap`/`initMap`/`openMap` functions, the Escape-key handler that looks up `#map-overlay`, and the `astro:page-load` → `initMap` listener). Leave the rest of the layout (skip link, Nav, main, Footer, DaytimeToggle, CursorBee) intact. Verify no `map` identifiers remain: `grep -n "[Mm]ap" src/layouts/Garden.astro` → no matches.

- [ ] **Step 3: Update `e2e/accessibility.spec.ts`** —
  - **Rewrite** the `navigation between pages completes without error` test to navigate via a homepage zone link instead of the map:

```ts
  test('navigation between pages completes without error', async ({ page }) => {
    await page.goto('/');
    await page.locator('#main-content a.zone-link[href="/flora"]').first().click();
    await expect(page).toHaveURL(/\/flora/);
    await expect(page.locator('main#main-content')).toBeVisible();
  });
```

  - **Replace** the `active zones are reachable via the map overlay` test with a homepage-reachability check:

```ts
  test('active zones are reachable from the homepage garden', async ({ page }) => {
    await page.goto('/');
    for (const href of ['/flora', '/hive', '/mulch', '/roots', '/castings']) {
      await expect(page.locator(`#main-content a.zone-link[href="${href}"]`)).toBeAttached();
    }
  });
```

  - **Delete** the entire `test.describe('MapToggle', …)` block and the entire `test.describe('MapOverlay', …)` block.
  - In the `nav does not contain old zone links …` test, update the parenthetical name/comment from "(navigation is via map overlay)" to "(navigation is via the homepage garden)". Keep the assertion (nav still has no zone links).
  - Sweep: `grep -n "map-toggle\|map-overlay\|MapToggle\|MapOverlay" e2e/accessibility.spec.ts` → no matches.

- [ ] **Step 4: Verify** — `pnpm exec astro check` → no new errors. `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/accessibility.spec.ts e2e/map.spec.ts --project=chromium` → all pass.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove the map overlay + toggle (garden is the navigation)"
```

---

## Task 2: Hive "Now" rework — drop Reading, refresh Now, fix GitHub

**Files:**
- Modify: `src/content/schemas.ts`, `src/content/schemas.test.ts`, `src/content/now/index.mdx`, `src/components/zones/Hive/LiveFlock.astro`, `src/components/zones/Castings/TendedBeds.astro`

- [ ] **Step 1: Update `schemas.test.ts` first (TDD)** — the `nowSchema` should accept an object WITHOUT `reading` and reject one WITHOUT `carrying`/`contact`. Find the nowSchema tests (`grep -n "nowSchema\|reading" src/content/schemas.test.ts`) and: remove any assertion that `reading` is required/parsed, and add:

```ts
  it('parses a now entry without a reading field', () => {
    const result = nowSchema.safeParse({
      carrying: [{ label: 'Civic Tech @ DML', detail: 'Systems change through civic technology' }],
      contact: [{ label: 'Email', url: 'mailto:gurden@darkmatterlabs.org', detail: 'gurden@darkmatterlabs.org' }],
    });
    expect(result.success).toBe(true);
  });
```

- [ ] **Step 2: Run → FAIL** — `pnpm test src/content/schemas.test.ts` → the new test fails (reading still required).

- [ ] **Step 3: Drop `reading` from `nowSchema`** — in `src/content/schemas.ts`, remove the `reading:` line so `nowSchema` is:

```ts
export const nowSchema = z.object({
  carrying: z.array(z.object({ label: z.string().min(1), detail: z.string().min(1) })).min(1),
  contact:  z.array(z.object({
    label:  z.string().min(1),
    url:    z.union([z.string().url(), z.string().startsWith('mailto:')]),
    detail: z.string().min(1).optional(),
  })).min(1),
});
```

- [ ] **Step 4: Rewrite `src/content/now/index.mdx`** — drop `reading`, refresh `carrying` to current work, fix the GitHub URL/detail:

```mdx
---
carrying:
  - label: "Civic Tech Lead @ DML"
    detail: "Leading technical strategy + delivery across Dark Matter Labs' climate-transition portfolio"
  - label: "Applied AI & LLM systems"
    detail: "Shipping agent-orchestrated tools like xCO into daily institutional use"
  - label: "Platform delivery, bids & partnerships"
    detail: "Taking civic platforms 0→1 and into production with public institutions"
contact:
  - label: "Email"
    url: "mailto:gurden@darkmatterlabs.org"
    detail: "gurden@darkmatterlabs.org"
  - label: "LinkedIn"
    url: "https://www.linkedin.com/in/gurdenbatra"
    detail: "LinkedIn ↗"
  - label: "GitHub"
    url: "https://github.com/gurdenbatra"
    detail: "github.com/gurdenbatra"
---

What I'm carrying right now, and how to reach me. Each entry becomes a flower in the Hive.
```

(The `carrying` copy is drafted from the CV — **owner should edit** to taste; it is intentionally current-work, not aspirational.)

- [ ] **Step 5: Stop consuming `reading` in `LiveFlock.astro`** — the frontmatter destructures `const { carrying, reading, contact } = nowEntry.data;` and builds a `reading` flower group + a "Reading" list group. Remove `reading` from the destructure, delete the `...reading.map(...)` block from `rawFlowers`, and delete the entire `<div class="hive-list-group">` for "Reading" (the `<h3>Reading</h3>` + its list). Keep "Now" (carrying) and "Reach me" (contact). Confirm: `grep -n "reading\|Reading" src/components/zones/Hive/LiveFlock.astro` → no matches.

- [ ] **Step 6: Fix the TendedBeds GitHub link** — in `src/components/zones/Castings/TendedBeds.astro`, change `github.com/gurden/gurden.xyz` → `github.com/gurdenbatra/gurden.xyz` in both the `detail` and `link` (lines ~67–68).

- [ ] **Step 7: Verify** — `pnpm test src/content/schemas.test.ts` → pass; `pnpm test` → all pass; `pnpm exec astro check` → clean; `pnpm build` → 19 pages (the `now` collection still validates). Sweep `grep -rn "github.com/gurden\b" src | grep -v gurdenbatra` → no matches.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: refresh Hive 'Now', drop Reading, correct GitHub handle"
```

---

## Task 3: Add the "Hats" section to the Hive

Surfaces the many roles Gurden holds at DML (the spec's "many hats"). Static content, added to the Hive page below the Live Swarm, above/around the Network.

**Files:**
- Create: `src/lib/hats.ts`
- Modify: `src/pages/hive/index.astro`, `e2e/hive.spec.ts`

- [ ] **Step 1: Create `src/lib/hats.ts`**

```ts
// The many roles Gurden holds at Dark Matter Labs — surfaced in the Hive so
// the site conveys range. Owner-editable.
export const hats: readonly string[] = [
  'Civic Tech Lead',
  'IT Lead',
  'Strategy',
  'Bid Writing',
  'Idea 0 → 1',
  'Partner Holding',
  'Web Development',
  'AI & Workflows',
  'Service Design',
];
```

- [ ] **Step 2: Render a Hats section on the Hive page** — in `src/pages/hive/index.astro`, import `hats` and add a section (immediately after the `flock-section`, before the `network-section`):

```astro
    <section class="hats-section" aria-labelledby="hats-heading">
      <h2 id="hats-heading" class="label section-heading">Hats I wear</h2>
      <p class="hats-intro">
        One role on paper, many in practice — the work at Dark Matter Labs spans
        strategy to shipping code.
      </p>
      <ul class="hats-list" role="list">
        {hats.map((hat) => <li class="hat label">{hat}</li>)}
      </ul>
    </section>
```

and add its styles to the page `<style>`:

```css
  .hats-section {
    margin-bottom: var(--space-20);
    padding-top: var(--space-12);
    border-top: 1px solid var(--ink-faint);
  }
  .hats-intro {
    font-size: var(--text-md);
    line-height: 1.65;
    max-width: 560px;
    margin-bottom: var(--space-8);
  }
  .hats-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  .hat {
    border: 1px solid var(--ink-muted);
    border-radius: 999px;
    padding: var(--space-1) var(--space-3);
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--text-xs);
  }
```

(Import line in frontmatter: `import { hats } from '../../lib/hats';`.)

- [ ] **Step 3: Add an E2E** — in `e2e/hive.spec.ts`, inside the network describe or a new one, add:

```ts
  test('hive shows the hats/roles section', async ({ page }) => {
    await page.goto('/hive');
    await expect(page.getByRole('heading', { name: /hats i wear/i })).toBeVisible();
    await expect(page.getByText('Civic Tech Lead')).toBeVisible();
    await expect(page.getByText('Bid Writing')).toBeVisible();
  });
```

- [ ] **Step 4: Verify** — `pnpm exec astro check` → clean; `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/hive.spec.ts --project=chromium` → pass (incl. night-axe if present — the pill border uses `--ink-muted`, ≥3:1).
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: surface the many hats Gurden wears on the Hive"
```

---

## Task 4: Refresh the collaborator network

The current `collaborators.ts` is stale. Rebuild it from the real co-inceptors named across the project frontmatter (people), the partner institutions (orgs), and the through-lines (ideas). **This is drafted from public project data and MUST be flagged for owner review before it's treated as final** — names/roles are best-effort.

**Files:**
- Modify (full rewrite of the data array): `src/lib/collaborators.ts`

- [ ] **Step 1: Rewrite the `collaborators` array** keeping the existing `CollaboratorNode`/`NodeKind` types and the bidirectional-connections rule. Draft it from project frontmatter co-inceptors and partners:

```ts
export const collaborators: readonly CollaboratorNode[] = [
  // ── People (co-inceptors named across projects — owner: verify/prune) ──
  { id: 'gurden', label: 'Gurden', kind: 'person', role: 'Design technologist', url: 'https://gurden.xyz',
    connections: ['dml', 'circulaw', 'treesai', 'life-pact', 'sheffield', 'planetary-civics'] },
  { id: 'romy', label: 'Romy Snijders', kind: 'person', role: 'CircuLaw', connections: ['circulaw'] },
  { id: 'sofia', label: 'Sofia Valentini', kind: 'person', role: 'TreesAI', connections: ['treesai'] },
  { id: 'arianna', label: 'Arianna Smaron', kind: 'person', role: 'CircuLaw · TreesAI · Sheffield', connections: ['circulaw', 'treesai', 'sheffield'] },
  { id: 'alessandra', label: 'Alessandra Puricelli', kind: 'person', role: 'Life Pact · TreesAI', connections: ['life-pact', 'treesai'] },
  { id: 'martin', label: 'Martin Lorenz', kind: 'person', role: 'Planetary Civics', connections: ['planetary-civics'] },
  { id: 'prateek', label: 'Prateek Shankar', kind: 'person', role: 'Planetary Civics', connections: ['planetary-civics'] },
  { id: 'tom', label: 'Tom Beresford', kind: 'person', role: 'Sheffield City Goals', connections: ['sheffield'] },

  // ── Organisations / partners ──
  { id: 'dml', label: 'Dark Matter Labs', kind: 'org', role: 'Civic innovation lab', url: 'https://darkmatterlabs.org',
    connections: ['gurden', 'circulaw', 'treesai', 'life-pact', 'sheffield', 'planetary-civics', 'civic-tech', 'ai-llm'] },
  { id: 'circulaw', label: 'CircuLaw', kind: 'org', role: 'Circular-economy law', url: 'https://www.circulaw.nl',
    connections: ['gurden', 'romy', 'arianna', 'dml', 'civic-tech'] },
  { id: 'treesai', label: 'TreesAI', kind: 'org', role: 'Urban forest as infrastructure', url: 'https://treesai.org',
    connections: ['gurden', 'sofia', 'arianna', 'alessandra', 'dml', 'civic-tech'] },
  { id: 'life-pact', label: 'Life Pact', kind: 'org', role: 'Replication toolkit', url: 'https://www.lifepactreplication.org',
    connections: ['gurden', 'alessandra', 'dml', 'civic-tech'] },
  { id: 'sheffield', label: 'Sheffield City Goals', kind: 'org', role: 'City participation', url: 'https://sheffieldcitygoals.uk',
    connections: ['gurden', 'arianna', 'tom', 'dml', 'civic-tech'] },

  // ── Ideas / through-lines ──
  { id: 'civic-tech', label: 'Civic Technology', kind: 'idea',
    connections: ['dml', 'circulaw', 'treesai', 'life-pact', 'sheffield', 'planetary-civics'] },
  { id: 'ai-llm', label: 'Applied AI & LLMs', kind: 'idea', connections: ['dml', 'planetary-civics'] },
  { id: 'planetary-civics', label: 'Planetary Civics', kind: 'idea',
    connections: ['gurden', 'martin', 'prateek', 'dml', 'civic-tech', 'ai-llm'] },
];
```

Update the file header comment to note it is owner-reviewed seed data.

- [ ] **Step 2: Verify graph integrity** — `NodesGraph`/`graph.ts` builds edges from `connections`; every id referenced in a `connections` array must exist as a node id. Check by eye against the list above (all referenced ids — gurden, dml, circulaw, treesai, life-pact, sheffield, planetary-civics, civic-tech, ai-llm, romy, sofia, arianna, alessandra, martin, prateek, tom — are defined). If `graph.test.ts` asserts a specific node count, update it to the new count (16).
- [ ] **Step 3: Verify** — `pnpm test` → pass (update `graph.test.ts` count if needed); `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/hive.spec.ts --project=chromium` → pass (the network canvas + keyboard lists still render; axe green).
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: refresh Hive collaborator network from current project partners"
```

---

## Task 5: /flora — generative-only + Skills section

Remove the VISIBLE project list; keep an accessible (visually-hidden) list so SlowPlot stays keyboard/screen-reader navigable (its aria-label points to it). Add a visible Skills section. `ProjectRow.astro` becomes unused → delete it.

**Files:**
- Modify: `src/pages/flora/index.astro`, `src/styles/global.css`, `src/components/zones/Flora/SlowPlot.astro`, `e2e/flora.spec.ts`
- Create: `src/lib/skills.ts`
- Delete: `src/components/ProjectRow.astro`

- [ ] **Step 1: Add an `.sr-only` utility** — in `src/styles/global.css`, add:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 2: Create `src/lib/skills.ts`**

```ts
// Gurden's core skills (from the CV) — surfaced on the Flora page so the site
// conveys range. Owner-editable.
export const skills: readonly string[] = [
  'Full-Stack Development',
  'AI & LLM Systems',
  'Prompt Engineering',
  'Product Management',
  'Service & Interaction Design',
  'Rapid Prototyping',
];
```

- [ ] **Step 3: Rewrite `src/pages/flora/index.astro`** — keep the header + SlowPlot; replace the visible `<ol>` of `ProjectRow` with a visually-hidden accessible link list; add a visible Skills section:

```astro
---
import { getCollection } from 'astro:content';
import Garden from '@layouts/Garden.astro';
import SlowPlot from '@components/zones/Flora/SlowPlot.astro';
import { skills } from '../../lib/skills';

const projects = await getCollection('projects');
const sorted = [...projects].sort((a, b) => b.data.year - a.data.year);
---

<Garden
  title="The Flora & Fauna"
  description="Work and projects by Gurden Batra — civic tech, design, and development — rendered as a wild plot."
>
  <section class="poly-wrap page-wrap">
    <header class="poly-header">
      <p class="label">The Flora &amp; Fauna</p>
      <h1 class="poly-title">A wild plot of work.</h1>
      <p class="poly-subtitle">
        Each plant is a project. Hover to see its name; click to walk into it.
      </p>
    </header>

    <SlowPlot />

    <!-- Visually hidden: the keyboard/screen-reader equivalent of the plot. -->
    <ol class="projects-list sr-only">
      {sorted.map((p) => (
        <li>
          <a href={`/flora/${p.id.replace(/\.[^.]+$/, '')}`}>
            {p.data.title} — {p.data.description}
          </a>
        </li>
      ))}
    </ol>

    <section class="skills-section" aria-labelledby="skills-heading">
      <h2 id="skills-heading" class="label section-heading">What I do</h2>
      <p class="skills-intro">
        A generalist's toolkit — I take civic ideas from zero to shipped, across:
      </p>
      <ul class="skills-list" role="list">
        {skills.map((skill) => <li class="skill label">{skill}</li>)}
      </ul>
    </section>
  </section>
</Garden>

<style>
  .poly-wrap {
    padding-block: var(--space-12) var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-10);
  }
  .poly-header { display: flex; flex-direction: column; gap: var(--space-3); }
  .poly-title {
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: var(--text-3xl);
    line-height: 1.05;
    margin: 0;
  }
  .poly-subtitle {
    font-size: var(--text-md);
    color: var(--ink-muted);
    max-width: 50ch;
    margin: 0;
  }
  .skills-section {
    padding-top: var(--space-12);
    border-top: 1px solid var(--ink-faint);
  }
  .section-heading { display: block; margin-bottom: var(--space-6); }
  .skills-intro {
    font-size: var(--text-md);
    line-height: 1.65;
    max-width: 560px;
    margin-bottom: var(--space-8);
  }
  .skills-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  .skill {
    border: 1px solid var(--ink-muted);
    border-radius: 999px;
    padding: var(--space-1) var(--space-3);
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--text-xs);
  }
</style>
```

- [ ] **Step 4: Keep SlowPlot's aria-label accurate** — it currently says "The list below is the keyboard-navigable equivalent." The list still exists (now `.sr-only`), so no change is needed; confirm the wording still reads true.

- [ ] **Step 5: Delete the now-unused `ProjectRow`**

```bash
git rm src/components/ProjectRow.astro
grep -rn "ProjectRow" src && echo "!! still referenced" || echo "clean"
```

- [ ] **Step 6: Update `e2e/flora.spec.ts`** —
  - The `shows an accessible project list below the canvas` test: the list is now `.sr-only` but still attached. Keep it asserting `ol.projects-list` is *attached* (not visible) and contains a link per project. If the test uses `toBeVisible()`, change to `toBeAttached()`. Add an assertion that the Skills section is visible:

```ts
  test('flora shows the skills section', async ({ page }) => {
    await page.goto('/flora');
    await expect(page.getByRole('heading', { name: /what i do/i })).toBeVisible();
    await expect(page.getByText('AI & LLM Systems')).toBeVisible();
  });
```

  - Confirm the SlowPlot canvas tests (hover/click) still pass — this task does not change SlowPlot or the header height meaningfully (the sr-only list adds no visible height; the skills section is BELOW the plot).

- [ ] **Step 7: Verify** — `pnpm exec astro check` → clean; `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/flora.spec.ts --project=chromium` → all pass (incl. the plot hover/click and the new skills test); axe green.
- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: flora shows only the generative plot + a skills section (list kept sr-only)"
```

---

## Task 6: Add the six new projects (research + draft)

Each new project becomes a plant automatically (SlowPlot maps the `projects` collection). Draft real bodies from public sources; **flag anything not verifiably public and keep its body minimal until the owner confirms.**

**Files:**
- Create: `src/content/projects/{xco,ino-learning-system,many-to-many,planetary-compendium,risksense,medulla}.mdx`

- [ ] **Step 1: Create xCO (CV-detailed)** — `src/content/projects/xco.mdx`:

```mdx
---
title: xCO Learning System
description: LLM-based organisational learning infrastructure with agent orchestration — a federated wiki with natural language as the interface for authoring and retrieval.
role: Lead Developer & Design Technologist
year: 2026
tags: [ai, llm, civic-tech, open-source]
featured: true
plantType: sunflower
links:
  - label: DML
    url: https://darkmatterlabs.org/
---

TODO: drafted during execution from the CV + public sources.
```

- [ ] **Step 2: Create the other five with best-effort frontmatter** — one file each. Use these ids/titles and a distinct `plantType` from `PLANT_TYPES` (`fern, sunflower, thistle, vine, grass, shrub`) so plants vary; leave `year`/`role`/`tags`/`links` for the research step to fill from sources (start each with the shape below and the research fills real values):

  - `ino-learning-system.mdx` → title "INO Learning System", plantType `fern`
  - `many-to-many.mdx` → title "Many-to-Many", plantType `vine`
  - `planetary-compendium.mdx` → title "Planetary Compendium", plantType `thistle`
  - `risksense.mdx` → title "RiskSense", plantType `grass`
  - `medulla.mdx` → title "Medulla", plantType `shrub`

  Each file's frontmatter must satisfy `projectSchema` (title, description, role, year 1990–2100, tags ≥1, optional links/plantType). Template:

```mdx
---
title: <Title>
description: <one-line, from a public source>
role: <Gurden's role, from CV/sources>
year: <year>
tags: [<at least one>]
plantType: <one of fern|sunflower|thistle|vine|grass|shrub>
---

<body>
```

- [ ] **Step 3: Research + draft (dispatch a research subagent during execution)** — for each of the six, WebFetch/WebSearch DM's public site + GitHub (`raw.githubusercontent.com/Dark-Matter-Labs/<repo>/main/README.md`) + the CV; fill the frontmatter with real `description`/`role`/`year`/`tags`/`links`; write a ~120–300-word body in the site's voice (plain Markdown only — no components/imports). **Guardrails:** ground every claim in a source; do not invent metrics/dates/quotes; if a project is not verifiably public, keep its body a short honest placeholder and note it in the report for owner review. (Same procedure that produced the existing seven case studies.)

- [ ] **Step 4: Verify** — `pnpm build 2>&1 | tail -3` → 19 → **25 pages** (6 new project routes × the `/flora/<slug>` + legacy `/polyculture/<slug>` mapping); MDX compiles. `pnpm exec astro check` → clean.
- [ ] **Step 5: Confirm they appear as plants** — `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/flora.spec.ts --project=chromium` → pass (the sr-only list now has 13 project links; SlowPlot renders 13 plants).
- [ ] **Step 6: Commit**

```bash
git add src/content/projects
git commit -m "content: add six new projects (xCO, INO, Many-to-Many, Planetary Compendium, RiskSense, Medulla)"
```

---

## Task 7: Final sweep — Phase 1

**Files:** none (verification; fixups if needed).

- [ ] **Step 1:** `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm test` → all pass.
- [ ] **Step 2:** `pnpm exec astro check` → 0 errors / 0 warnings / 0 hints.
- [ ] **Step 3:** `pnpm exec playwright test` → all pass on chromium AND webkit (the 1 pre-existing skip remains); no map/reading references remain (`grep -rn "MapToggle\|MapOverlay\|reading\|github.com/gurden\b" src | grep -v gurdenbatra` → only the intended `carrying`/content, nothing stale).
- [ ] **Step 4:** `pnpm lhci` → error-budgets green on `/` and all five zones.
- [ ] **Step 5: Manual confirmation** (`pnpm dev`, 1280×900 + 375×812): no map toggle anywhere; Hive shows Now (no Reading), Hats, refreshed Network; Flora shows the plot + Skills, no visible list; the six new plants are in the plot; GitHub links point to `gurdenbatra`; everything stacks cleanly on mobile.
- [ ] **Step 6 (only if fixups were made):**

```bash
git add -A
git commit -m "chore: phase 1 sweep — content & IA verified"
```

---

## Self-Review (filled in by plan author)

**1. Spec coverage (Phase 1 scope):** 6 new projects → Task 6. Generative-only /flora (list removed, a11y preserved) → Task 5. Skills on Flora → Task 5. Hats on Hive → Task 3. Hive Now rework (drop Reading, refresh) → Task 2. Network refresh → Task 4. Remove map → Task 1. GitHub fix → Task 2 (now + TendedBeds). Phases 2 (ASCII glyphs) & 3 (shader + bee) explicitly deferred. No gaps.

**2. Placeholder scan:** the only "TODO" bodies are the six new project files, which Task 3/Step 3 fills via the research procedure (a genuine research task with a concrete procedure + guardrails, not a hand-wave) — same pattern that produced the existing seven case studies. All other tasks ship complete code.

**3. Type consistency:** `nowSchema` (no `reading`) matches `now/index.mdx` and `LiveFlock.astro` consumers and `schemas.test.ts`. `CollaboratorNode` shape reused verbatim in Task 4; every `connections` id resolves to a defined node. `skills`/`hats` are `readonly string[]` consumed by `.map` in the pages. `projectSchema` fields match every new project's frontmatter. `.sr-only` defined (Task 5 Step 1) before use. `ProjectRow` deleted only after its sole consumer (flora list) stops using it.
