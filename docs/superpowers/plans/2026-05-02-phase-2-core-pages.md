# Phase 2 — Core Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all core content pages — a complete home page with real copy, project pages wired to MDX collections, and supporting pages — ready for Phase 3's interactive and shader layer.

**Architecture:** Astro 4 static pages. `getCollection()` queries the MDX content collection for project data. No JavaScript shipped to the browser in this phase. Marginalia is a static two-column CSS grid layout; Phase 3 adds the hover-sync JS. All pages extend the Phase 1 Base layout.

**Tech Stack:** Astro 4, MDX content collections (`astro:content`), CSS custom properties (Phase 1 tokens), Playwright E2E, Vitest unit tests, pnpm.

---

## File Map

```
src/
├── pages/
│   ├── index.astro              MODIFY — real home: hero + Marginalia + projects + art portal
│   ├── story.astro              CREATE — long-form narrative layout (placeholder content)
│   ├── about.astro              CREATE — bio + contact links
│   ├── colophon.astro           CREATE — stack, typefaces, credits
│   └── work/
│       ├── index.astro          CREATE — all projects index
│       └── [slug].astro         CREATE — project detail page
├── components/
│   ├── Marginalia.astro         CREATE — static bio paragraph + annotation notes column
│   └── ProjectRow.astro         CREATE — reusable index row (home + work index)
└── content/
    └── projects/
        ├── treesai.mdx          CREATE — stub (featured: true)
        └── dm-site.mdx          CREATE — stub (featured: true)
e2e/
├── home.spec.ts                 CREATE — home page section tests
├── work.spec.ts                 CREATE — work index + project detail
├── pages.spec.ts                CREATE — story, about, colophon smoke tests
└── axe.spec.ts                  MODIFY — extend to cover all Phase 2 pages
docs/
└── metrics.md                   MODIFY — append Phase 2 axe results
```

---

## Task 1: Project content stubs (TreesAI + DM site)

The home page projects index needs 3 featured projects. CircuLaw already exists (`featured: true`). Add two stubs so `getCollection` returns 3 featured items.

**Files:**
- Create: `src/content/projects/treesai.mdx`
- Create: `src/content/projects/dm-site.mdx`

- [ ] **Step 1: Create `src/content/projects/treesai.mdx`**

```mdx
---
title: TreesAI
description: Urban forestry modelled as civic infrastructure — enabling cities to plan, value, and govern trees as part of their climate strategy.
role: Lead Developer & Design Technologist
year: 2022
tags: [civic-tech, climate, open-source]
featured: true
collaborators:
  - Anouk Meys
  - Nathalie Harari
  - Hannah Lewis
links:
  - label: App
    url: https://treesai.org/
---

TODO: Add full project case study content in Phase 2 content sprint.
```

- [ ] **Step 2: Create `src/content/projects/dm-site.mdx`**

```mdx
---
title: Dark Matter Labs Digital Identity
description: Visual identity, communications design, and digital systems for Dark Matter Labs — shaping how a transatlantic civic innovation lab presents itself to the world.
role: Designer & Communications Lead
year: 2020
tags: [design, identity, communications]
featured: true
links:
  - label: Site
    url: https://darkmatterlabs.org/
---

TODO: Add full project case study content in Phase 2 content sprint.
```

- [ ] **Step 3: Verify unit tests still pass**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test
```

Expected: 15 tests pass (schemas validate, no regressions).

- [ ] **Step 4: Commit**

```bash
git add src/content/projects/treesai.mdx src/content/projects/dm-site.mdx
git commit -m "feat: add TreesAI and DM site project stubs"
```

---

## Task 2: `ProjectRow` component

A reusable index row used on both the home page and `/work`. Format: `01 · CircuLaw · civic-tech · 2021`.

**Files:**
- Create: `src/components/ProjectRow.astro`
- Create: `e2e/home.spec.ts` (written now, tests pass after Task 4)

- [ ] **Step 1: Write the failing E2E tests for the home page**

Create `e2e/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('skills tagline is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Design.')).toBeVisible();
    await expect(page.getByText('Code.')).toBeVisible();
    await expect(page.getByText('Bring ideas to life.')).toBeVisible();
  });

  test('Marginalia bio paragraph is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Civic Tech Lead at Dark Matter Labs/)).toBeVisible();
  });

  test('Marginalia annotation notes are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Berlin — since 2020')).toBeVisible();
    await expect(page.getByText(/City of Amsterdam/)).toBeVisible();
  });

  test('projects section has all three featured projects', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /CircuLaw/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /TreesAI/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dark Matter Labs/i })).toBeVisible();
  });

  test('all projects link points to /work', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /all projects/i })).toHaveAttribute('href', '/work');
  });

  test('art portal has a link to /art', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Enter/i })).toHaveAttribute('href', '/art');
  });
});
```

- [ ] **Step 2: Run to verify they FAIL**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e --grep "Home page"
```

Expected: all 6 fail — home page is still the Phase 1 placeholder.

- [ ] **Step 3: Create `src/components/ProjectRow.astro`**

```astro
---
interface Props {
  index: number;
  title: string;
  tag: string;
  year: number;
  slug: string;
}

const { index, title, tag, year, slug } = Astro.props;
const num = String(index).padStart(2, '0');
---

<a href={`/work/${slug}`} class="project-row">
  <span class="project-num">{num}</span>
  <span class="project-name">{title}</span>
  <span class="project-tag">{tag}</span>
  <span class="project-year">{year}</span>
</a>

<style>
  .project-row {
    display: grid;
    grid-template-columns: 2.5rem 1fr auto auto;
    gap: var(--space-6);
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--ink-faint);
    text-decoration: none;
    color: inherit;
    align-items: baseline;
  }

  .project-row:hover .project-name {
    font-style: italic;
  }

  .project-num,
  .project-tag,
  .project-year {
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.06em;
    color: var(--ink-muted);
  }

  .project-name {
    font-family: 'MaziusDisplay', serif;
    font-size: var(--text-base);
    color: var(--ink);
    transition: font-style var(--duration-fast) var(--easing);
  }

  .project-tag {
    text-transform: uppercase;
  }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectRow.astro e2e/home.spec.ts
git commit -m "feat: ProjectRow component + home page E2E test file"
```

---

## Task 3: `Marginalia` component (static)

The confirmed hero paragraph with 5 annotated phrases. Two-column CSS grid: prose left, notes right. Notes are always visible in Phase 2. Phase 3 adds hover-sync JS using `data-note` / `data-ref` attributes.

**Files:**
- Create: `src/components/Marginalia.astro`

- [ ] **Step 1: Create `src/components/Marginalia.astro`**

Use the exact confirmed paragraph and annotation map from the design spec:

```astro
---
// No props — confirmed copy is fixed
---

<div class="marginalia-grid">

  <!-- Left: bio paragraph with annotated phrases -->
  <div class="marginalia-prose">
    <p class="hero-para">
      Gurden is the
      <span class="mark" data-note="role">Civic Tech Lead at Dark Matter Labs</span>.
      Over the past five years, he has led the development of civic tools including
      <span class="mark" data-note="circulaw">CircuLaw</span>,
      a legal registry for circular economy transitions with the City of Amsterdam and
      <span class="mark" data-note="treesai">TreesAI</span>,
      which models urban forestry as civic infrastructure for cities like Berlin, London, Glasgow,
      and Canadian municipalities. He has shaped Dark Matter Labs&apos; digital identity,
      communications, and internal tech and tools practice. With a background in
      <span class="mark" data-note="gt">Computer Science from Georgia Tech</span>
      and
      <span class="mark" data-note="aalto">New Media Design from Aalto University</span>,
      Gurden bridges governance innovation and implementation, turning systemic frameworks
      into things people can actually use.
    </p>
  </div>

  <!-- Right: annotation notes column -->
  <aside class="marginalia-notes" aria-label="Annotations">
    <div class="note" data-ref="role">
      <span class="note-label">Role</span>
      Berlin — since 2020
    </div>
    <div class="note" data-ref="circulaw">
      <span class="note-label">Project</span>
      Legal tooling for circular economy transitions — City of Amsterdam &amp; EU
    </div>
    <div class="note" data-ref="treesai">
      <span class="note-label">Project</span>
      Urban forest as civic infrastructure — Berlin · London · Glasgow
    </div>
    <div class="note" data-ref="gt">
      <span class="note-label">Education</span>
      Atlanta — 2009 to 2013
    </div>
    <div class="note" data-ref="aalto">
      <span class="note-label">Education</span>
      Helsinki — 2015 to 2017
    </div>
  </aside>

</div>

<style>
  .marginalia-grid {
    display: grid;
    grid-template-columns: 1fr 200px;
    gap: var(--space-12);
    align-items: start;
  }

  .hero-para {
    font-family: 'MaziusDisplay', serif;
    font-size: var(--text-md); /* 19px */
    line-height: 1.65;
    color: var(--ink);
  }

  /* Annotated phrase — hairline underline; data-note used by Phase 3 JS */
  .mark {
    border-bottom: 1px solid var(--ink-faint);
  }

  .marginalia-notes {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding-top: var(--space-1);
  }

  .note {
    padding-left: var(--space-4);
    border-left: 1px solid var(--ink-faint);
    font-family: 'NectoMono', monospace;
    font-size: 0.6875rem; /* 11px — spec: full-ink at 11px */
    line-height: 1.5;
    letter-spacing: 0.04em;
    color: var(--ink);
  }

  .note-label {
    display: block;
    font-size: var(--text-xs); /* 10px */
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: var(--space-1);
  }

  /* Mobile: single column, notes below prose */
  @media (max-width: 700px) {
    .marginalia-grid {
      grid-template-columns: 1fr;
    }

    .marginalia-notes {
      border-top: 1px solid var(--ink-faint);
      padding-top: var(--space-6);
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Marginalia.astro
git commit -m "feat: Marginalia component — static bio + annotation notes (Phase 3 adds hover sync)"
```

---

## Task 4: Home page — full assembly

Replace the Phase 1 placeholder `index.astro` with the real four-section home page.

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Overwrite `src/pages/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Base from '@layouts/Base.astro';
import Marginalia from '@components/Marginalia.astro';
import ProjectRow from '@components/ProjectRow.astro';

const allProjects = await getCollection('projects');
const featured = allProjects
  .filter(p => p.data.featured)
  .sort((a, b) => b.data.year - a.data.year);
---

<Base title="Home">

  <!-- ── 1. SKILLS HERO ── -->
  <section class="hero page-wrap">
    <h1 class="tagline" aria-label="Design. Code. Bring ideas to life.">
      <span class="tagline-italic" aria-hidden="true">Design.</span>
      <span class="tagline-italic" aria-hidden="true">Code.</span>
      <span class="tagline-regular" aria-hidden="true">Bring ideas to life.</span>
    </h1>
  </section>

  <!-- ── 2. MARGINALIA BIO ── -->
  <section class="bio-section page-wrap">
    <p class="label section-label">About</p>
    <Marginalia />
  </section>

  <!-- ── 3. PROJECTS INDEX ── -->
  <section class="projects-section page-wrap">
    <p class="label section-label">Selected Work</p>
    <ol class="projects-list" role="list">
      {featured.map((p, i) => (
        <li>
          <ProjectRow
            index={i + 1}
            title={p.data.title}
            tag={p.data.tags[0]}
            year={p.data.year}
            slug={p.slug}
          />
        </li>
      ))}
    </ol>
    <a href="/work" class="see-all label">All projects →</a>
  </section>

  <!-- ── 4. ART PORTAL ── -->
  <section class="art-portal" aria-label="Art and generative systems">
    <div class="art-portal-inner page-wrap">
      <p class="art-label label">Art &amp; Generative Systems</p>
      <h2 class="art-title">Experiments in<br /><em>code and form.</em></h2>
      <a href="/art" class="art-link label">Enter →</a>
    </div>
  </section>

</Base>

<style>
  /* ── HERO ── */
  .hero {
    padding-block: var(--space-20) var(--space-16);
  }

  .tagline {
    display: flex;
    flex-direction: column;
    gap: 0;
    line-height: 0.95;
  }

  .tagline-italic {
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: var(--text-4xl);
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .tagline-regular {
    font-family: 'MaziusDisplay', serif;
    font-style: normal;
    font-size: clamp(1.5rem, 3.5vw, 3rem);
    color: var(--ink-muted);
    margin-top: var(--space-4);
  }

  /* ── BIO ── */
  .bio-section {
    padding-block: var(--space-16);
    border-top: 1px solid var(--ink-faint);
  }

  .section-label {
    display: block;
    margin-bottom: var(--space-8);
  }

  /* ── PROJECTS ── */
  .projects-section {
    padding-block: var(--space-16);
    border-top: 1px solid var(--ink-faint);
  }

  .projects-list {
    list-style: none;
    padding: 0;
    margin: 0;
    border-top: 1px solid var(--ink);
    margin-bottom: var(--space-6);
  }

  .see-all {
    color: var(--ink);
    text-decoration: none;
    transition: color var(--duration-fast) var(--easing);
  }

  .see-all:hover {
    color: var(--ink-muted);
  }

  /* ── ART PORTAL ── */
  .art-portal {
    background: var(--art-ground);
    padding-block: var(--space-20);
    margin-top: var(--space-16);
  }

  .art-label {
    color: var(--ink-muted);
    display: block;
    margin-bottom: var(--space-8);
  }

  .art-title {
    font-family: 'MaziusDisplay', serif;
    font-size: var(--text-2xl);
    font-weight: 400;
    color: var(--art-ink);
    line-height: 1.1;
    margin-bottom: var(--space-8);
  }

  .art-title em {
    font-style: italic;
  }

  .art-link {
    color: var(--art-ink);
    text-decoration: none;
    opacity: 0.7;
    transition: opacity var(--duration-fast) var(--easing);
  }

  .art-link:hover {
    opacity: 1;
  }
</style>
```

- [ ] **Step 2: Run home page E2E tests — verify they PASS**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e --grep "Home page"
```

Expected: all 6 home page tests pass.

- [ ] **Step 3: Run full E2E suite — no regressions**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: home page — skills hero, Marginalia bio, projects index, art portal"
```

---

## Task 5: `/work` index page

**Files:**
- Create: `src/pages/work/index.astro`
- Create: `e2e/work.spec.ts`

- [ ] **Step 1: Write failing E2E tests**

Create `e2e/work.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Work index', () => {
  test('page loads with 200', async ({ page }) => {
    const r = await page.goto('/work');
    expect(r?.status()).toBe(200);
  });

  test('lists all three projects', async ({ page }) => {
    await page.goto('/work');
    await expect(page.getByRole('link', { name: /CircuLaw/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /TreesAI/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dark Matter Labs/i })).toBeVisible();
  });

  test('CircuLaw row links to /work/circulaw', async ({ page }) => {
    await page.goto('/work');
    await expect(page.getByRole('link', { name: /CircuLaw/i })).toHaveAttribute('href', '/work/circulaw');
  });
});

test.describe('Project detail', () => {
  test('CircuLaw page loads with 200', async ({ page }) => {
    const r = await page.goto('/work/circulaw');
    expect(r?.status()).toBe(200);
  });

  test('CircuLaw page shows title and description', async ({ page }) => {
    await page.goto('/work/circulaw');
    await expect(page.getByRole('heading', { name: 'CircuLaw' })).toBeVisible();
    await expect(page.getByText(/Legal tooling/i)).toBeVisible();
  });

  test('CircuLaw page shows role and year', async ({ page }) => {
    await page.goto('/work/circulaw');
    await expect(page.getByText(/Lead Developer/i)).toBeVisible();
    await expect(page.getByText('2021')).toBeVisible();
  });

  test('CircuLaw page has back link to /work', async ({ page }) => {
    await page.goto('/work/circulaw');
    await expect(page.getByRole('link', { name: /All projects/i })).toHaveAttribute('href', '/work');
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e --grep "Work index"
```

Expected: FAIL — `/work` returns 404.

- [ ] **Step 3: Create `src/pages/work/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Base from '@layouts/Base.astro';
import ProjectRow from '@components/ProjectRow.astro';

const projects = await getCollection('projects');
const sorted = projects.sort((a, b) => b.data.year - a.data.year);
---

<Base
  title="Work"
  description="Projects and work by Gurden Batra — civic tech, design, and development."
>
  <div class="work-wrap page-wrap">

    <header class="work-header">
      <p class="label">All Work</p>
      <h1>Projects</h1>
    </header>

    <ol class="projects-list" role="list">
      {sorted.map((p, i) => (
        <li>
          <ProjectRow
            index={i + 1}
            title={p.data.title}
            tag={p.data.tags[0]}
            year={p.data.year}
            slug={p.slug}
          />
        </li>
      ))}
    </ol>

  </div>
</Base>

<style>
  .work-wrap {
    padding-block: var(--space-16);
  }

  .work-header {
    margin-bottom: var(--space-12);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .work-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
  }

  .projects-list {
    list-style: none;
    padding: 0;
    margin: 0;
    border-top: 1px solid var(--ink);
  }
</style>
```

- [ ] **Step 4: Run work index tests — verify they PASS**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e --grep "Work index"
```

Expected: all 3 work index tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/work/index.astro e2e/work.spec.ts
git commit -m "feat: /work project index page"
```

---

## Task 6: `/work/[slug]` project detail page

**Files:**
- Create: `src/pages/work/[slug].astro`

- [ ] **Step 1: Create `src/pages/work/[slug].astro`**

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import Base from '@layouts/Base.astro';

export async function getStaticPaths() {
  const projects = await getCollection('projects');
  return projects.map(p => ({
    params: { slug: p.slug },
    props: { project: p },
  }));
}

interface Props {
  project: CollectionEntry<'projects'>;
}

const { project } = Astro.props;
const { title, description, role, year, tags, collaborators, links } = project.data;
const { Content } = await project.render();
---

<Base title={title} description={description}>
  <article class="project-wrap page-wrap">

    <header class="project-header">
      <p class="label">{tags.join(' · ')}</p>
      <h1 class="project-title">{title}</h1>
      <p class="project-description">{description}</p>
    </header>

    <dl class="project-meta">
      <div class="meta-row">
        <dt class="label">Role</dt>
        <dd>{role}</dd>
      </div>
      <div class="meta-row">
        <dt class="label">Year</dt>
        <dd>{year}</dd>
      </div>
      {collaborators && collaborators.length > 0 && (
        <div class="meta-row">
          <dt class="label">With</dt>
          <dd>{collaborators.join(', ')}</dd>
        </div>
      )}
      {links && links.length > 0 && (
        <div class="meta-row">
          <dt class="label">Links</dt>
          <dd class="meta-links">
            {links.map(l => (
              <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>
            ))}
          </dd>
        </div>
      )}
    </dl>

    <div class="project-content">
      <Content />
    </div>

    <footer class="project-footer">
      <a href="/work" class="back-link label">← All projects</a>
    </footer>

  </article>
</Base>

<style>
  .project-wrap {
    padding-block: var(--space-16);
  }

  .project-header {
    margin-bottom: var(--space-12);
    max-width: 720px;
  }

  .project-header .label {
    margin-bottom: var(--space-4);
    display: block;
  }

  .project-title {
    font-size: var(--text-3xl);
    font-style: italic;
    line-height: 1.05;
    margin-bottom: var(--space-6);
  }

  .project-description {
    font-size: var(--text-md);
    color: var(--ink-muted);
    line-height: 1.6;
  }

  .project-meta {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-6);
    border-top: 1px solid var(--ink-faint);
    border-bottom: 1px solid var(--ink-faint);
    padding-block: var(--space-8);
    margin-bottom: var(--space-12);
  }

  .meta-row dt {
    margin-bottom: var(--space-1);
  }

  .meta-row dd {
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .meta-links {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .meta-links a {
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px solid var(--ink-faint);
    transition: border-color var(--duration-fast) var(--easing);
  }

  .meta-links a:hover {
    border-color: var(--ink);
  }

  .project-content {
    max-width: 640px;
    font-size: var(--text-base);
    line-height: 1.75;
  }

  .project-content :global(h2) {
    font-size: var(--text-xl);
    font-style: italic;
    margin-block: var(--space-10) var(--space-4);
  }

  .project-content :global(h3) {
    font-size: var(--text-lg);
    font-style: italic;
    margin-block: var(--space-8) var(--space-3);
  }

  .project-content :global(p) {
    margin-bottom: var(--space-6);
  }

  .project-content :global(a) {
    color: var(--ink);
    border-bottom: 1px solid var(--ink-faint);
    text-decoration: none;
    transition: border-color var(--duration-fast) var(--easing);
  }

  .project-content :global(a:hover) {
    border-color: var(--ink);
  }

  .project-footer {
    margin-top: var(--space-20);
    padding-top: var(--space-8);
    border-top: 1px solid var(--ink-faint);
  }

  .back-link {
    color: var(--ink-muted);
    text-decoration: none;
    transition: color var(--duration-fast) var(--easing);
  }

  .back-link:hover {
    color: var(--ink);
  }
</style>
```

- [ ] **Step 2: Run project detail tests — verify they PASS**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e --grep "Project detail"
```

Expected: all 4 project detail tests pass.

- [ ] **Step 3: Run full E2E suite**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/work/[slug].astro
git commit -m "feat: /work/[slug] project detail page — CircuLaw smoke test passes"
```

---

## Task 7: `/story`, `/about`, `/colophon` pages

**Files:**
- Create: `src/pages/story.astro`
- Create: `src/pages/about.astro`
- Create: `src/pages/colophon.astro`
- Create: `e2e/pages.spec.ts`

- [ ] **Step 1: Write failing E2E tests**

Create `e2e/pages.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Story page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/story');
    expect(r?.status()).toBe(200);
  });

  test('has h1 heading', async ({ page }) => {
    await page.goto('/story');
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('About page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/about');
    expect(r?.status()).toBe(200);
  });

  test('shows name and contact', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText(/Gurden/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /gurden@darkmatterlabs/i })).toBeVisible();
  });
});

test.describe('Colophon page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/colophon');
    expect(r?.status()).toBe(200);
  });

  test('mentions Astro and Mazius', async ({ page }) => {
    await page.goto('/colophon');
    await expect(page.getByText(/Astro/i)).toBeVisible();
    await expect(page.getByText(/Mazius/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e --grep "Story page|About page|Colophon page"
```

Expected: all 6 fail — pages don't exist.

- [ ] **Step 3: Create `src/pages/story.astro`**

```astro
---
import Base from '@layouts/Base.astro';
---

<Base
  title="Story"
  description="The life and work of Gurden Batra — from Delhi to Atlanta, Helsinki, and Berlin."
>
  <div class="story-wrap page-wrap">

    <header class="story-header">
      <p class="label">Life Narrative</p>
      <h1>Story</h1>
    </header>

    <div class="story-content">
      <p class="story-placeholder">
        Full narrative coming soon.
      </p>
    </div>

  </div>
</Base>

<style>
  .story-wrap {
    padding-block: var(--space-16);
  }

  .story-header {
    margin-bottom: var(--space-16);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .story-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
  }

  .story-content {
    max-width: 640px;
    font-size: var(--text-base);
    line-height: 1.75;
  }

  .story-placeholder {
    color: var(--ink-muted);
    font-style: italic;
  }
</style>
```

- [ ] **Step 4: Create `src/pages/about.astro`**

```astro
---
import Base from '@layouts/Base.astro';
---

<Base
  title="About"
  description="Gurden Batra — Civic Tech Lead and Design Technologist based in Berlin."
>
  <div class="about-wrap page-wrap">

    <header class="about-header">
      <p class="label">Gurden Batra</p>
      <h1>About</h1>
    </header>

    <div class="about-content">
      <p class="about-bio">
        Civic Tech Lead at Dark Matter Labs, Berlin. Building tools that help cities
        navigate the legal, ecological, and civic complexity of the 21st century.
        Background in Computer Science (Georgia Tech) and New Media Design (Aalto University).
      </p>

      <section class="contact-section">
        <h2 class="label contact-heading">Get in touch</h2>
        <ul class="contact-list" role="list">
          <li>
            <a href="mailto:gurden@darkmatterlabs.org" class="contact-link label">
              gurden@darkmatterlabs.org
            </a>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/gurdenbatra"
              target="_blank"
              rel="noopener noreferrer"
              class="contact-link label"
            >
              LinkedIn →
            </a>
          </li>
          <li>
            <a
              href="https://github.com/gurden"
              target="_blank"
              rel="noopener noreferrer"
              class="contact-link label"
            >
              GitHub →
            </a>
          </li>
          <li>
            <a
              href="https://www.instagram.com/darkmatter_labs/"
              target="_blank"
              rel="noopener noreferrer"
              class="contact-link label"
            >
              Instagram →
            </a>
          </li>
        </ul>
      </section>
    </div>

  </div>
</Base>

<style>
  .about-wrap {
    padding-block: var(--space-16);
  }

  .about-header {
    margin-bottom: var(--space-12);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .about-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
  }

  .about-content {
    max-width: 640px;
  }

  .about-bio {
    font-size: var(--text-md);
    line-height: 1.65;
    margin-bottom: var(--space-12);
  }

  .contact-heading {
    display: block;
    margin-bottom: var(--space-6);
  }

  .contact-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .contact-link {
    color: var(--ink);
    text-decoration: none;
    transition: color var(--duration-fast) var(--easing);
  }

  .contact-link:hover {
    color: var(--ink-muted);
  }
</style>
```

- [ ] **Step 5: Create `src/pages/colophon.astro`**

```astro
---
import Base from '@layouts/Base.astro';
---

<Base
  title="Colophon"
  description="How gurden.xyz is built — stack, typefaces, and credits."
>
  <div class="colophon-wrap page-wrap">

    <header class="colophon-header">
      <p class="label">Built With</p>
      <h1>Colophon</h1>
    </header>

    <dl class="colophon-list">

      <div class="colophon-row">
        <dt class="label">Framework</dt>
        <dd>
          <a href="https://astro.build" target="_blank" rel="noopener noreferrer">Astro 4</a>
          — static output, islands architecture, MDX content collections.
        </dd>
      </div>

      <div class="colophon-row">
        <dt class="label">Typefaces</dt>
        <dd>
          <a href="https://www.collletttivo.it/" target="_blank" rel="noopener noreferrer">Collletttivo</a>
          open-source fonts, SIL Open Font License.
          <em>Mazius Display</em> (display, body) and <em>Necto Mono</em> (metadata, labels),
          both self-hosted.
        </dd>
      </div>

      <div class="colophon-row">
        <dt class="label">Hosting</dt>
        <dd>
          <a href="https://netlify.com" target="_blank" rel="noopener noreferrer">Netlify</a>
          — static CDN, continuous deployment from main.
        </dd>
      </div>

      <div class="colophon-row">
        <dt class="label">Analytics</dt>
        <dd>None.</dd>
      </div>

      <div class="colophon-row">
        <dt class="label">Source</dt>
        <dd>
          <a
            href="https://github.com/gurden/gurden.xyz"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/gurden/gurden.xyz
          </a>
        </dd>
      </div>

    </dl>

  </div>
</Base>

<style>
  .colophon-wrap {
    padding-block: var(--space-16);
  }

  .colophon-header {
    margin-bottom: var(--space-12);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .colophon-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
  }

  .colophon-list {
    display: flex;
    flex-direction: column;
    max-width: 640px;
  }

  .colophon-row {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: var(--space-6);
    padding-block: var(--space-6);
    border-bottom: 1px solid var(--ink-faint);
    align-items: start;
  }

  .colophon-row dt {
    padding-top: 2px;
  }

  .colophon-row dd {
    font-size: var(--text-sm);
    line-height: 1.65;
    color: var(--ink);
  }

  .colophon-row dd a {
    color: var(--ink);
    border-bottom: 1px solid var(--ink-faint);
    text-decoration: none;
    transition: border-color var(--duration-fast) var(--easing);
  }

  .colophon-row dd a:hover {
    border-color: var(--ink);
  }

  .colophon-row dd em {
    font-style: italic;
  }
</style>
```

- [ ] **Step 6: Run pages tests — verify they PASS**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e --grep "Story page|About page|Colophon page"
```

Expected: all 6 tests pass.

- [ ] **Step 7: Run full E2E suite**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/story.astro src/pages/about.astro src/pages/colophon.astro e2e/pages.spec.ts
git commit -m "feat: story, about, and colophon pages"
```

---

## Task 8: Axe pass on all pages + update metrics

**Files:**
- Modify: `e2e/axe.spec.ts`
- Modify: `docs/metrics.md`

- [ ] **Step 1: Update `e2e/axe.spec.ts` to cover all Phase 2 pages**

Replace the entire file:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'home',           path: '/' },
  { name: 'work index',     path: '/work' },
  { name: 'work circulaw',  path: '/work/circulaw' },
  { name: 'story',          path: '/story' },
  { name: 'about',          path: '/about' },
  { name: 'colophon',       path: '/colophon' },
  { name: 'styleguide',     path: '/styleguide' },
];

for (const { name, path } of pages) {
  test(`${name} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
```

- [ ] **Step 2: Run axe tests — zero violations required before proceeding**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test:e2e --grep "accessibility violations"
```

Expected: all 7 pages report 0 violations. Do NOT proceed if any violations remain.

Common fixes:
- `<dl>` structure — `<dt>` and `<dd>` must be direct children of `<dl>`, not wrapped in `<div>` unless the div wraps the pair. The `colophon-row` divs wrap dt+dd pairs, which is valid HTML5.
- External links — must have `rel="noopener noreferrer"` (already in place)
- Contrast — all text uses Phase 1 tokens (already WCAG AA verified)
- Heading hierarchy — h1 → h2 order enforced by page structure

- [ ] **Step 3: Append Phase 2 results to `docs/metrics.md`**

Open `/Users/gurden/Documents/code/g-xyz/docs/metrics.md` and append:

```markdown

## Phase 2 Baseline — 2026-05-02

### Axe violations

| Page | Violations | Status |
|------|-----------|--------|
| `/` | 0 | ✅ |
| `/work` | 0 | ✅ |
| `/work/circulaw` | 0 | ✅ |
| `/story` | 0 | ✅ |
| `/about` | 0 | ✅ |
| `/colophon` | 0 | ✅ |
| `/styleguide` | 0 | ✅ |

### Notes

- Phase 2 ships zero JavaScript to the browser.
- Marginalia is a static CSS grid layout; hover sync and stagger added in Phase 3.
- Story page uses a layout placeholder — copy to be authored separately.
- Project content stubs (TreesAI, DM site) will be filled in during a content sprint.
```

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test && pnpm test:e2e
```

Expected: 15 unit tests pass, all E2E tests pass including all axe checks.

- [ ] **Step 5: Commit**

```bash
git add e2e/axe.spec.ts docs/metrics.md
git commit -m "chore: extend axe audit to all Phase 2 pages — zero violations"
```

---

## Self-Review

**Spec coverage check:**

| PROPOSAL.md Phase 2 requirement | Task |
|---------------------------------|------|
| Home page — skills hero | Task 4 |
| Home page — Marginalia with confirmed copy | Tasks 3, 4 |
| Home page — projects index (3 featured) | Tasks 1, 2, 4 |
| Home page — art portal card (no shader) | Task 4 |
| `/story` layout | Task 7 |
| `/work` project index | Task 5 |
| `/work/[slug]` project detail | Task 6 |
| `/about` | Task 7 |
| `/colophon` | Task 7 |
| One real project wired to MDX (CircuLaw) | Task 6 |
| Zero axe violations before Phase 3 | Task 8 |

All requirements covered. ✅

**Placeholder scan:** No TBD/TODO in code blocks. `story.astro` has "Full narrative coming soon" — intentional, content to be provided by user. Project MDX stubs have TODO in body — intentional, content sprint is separate work. ✅

**Type consistency:** `CollectionEntry<'projects'>` in `[slug].astro` matches what `getCollection('projects')` returns. `ProjectRow` props (index, title, tag, year, slug) match what `index.astro` and `work/index.astro` pass. `Marginalia.astro` takes no props — all content is hardcoded confirmed copy. ✅
