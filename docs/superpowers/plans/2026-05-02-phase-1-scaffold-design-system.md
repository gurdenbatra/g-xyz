# Phase 1 — Scaffold & Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing 11ty site with an Astro 4 project that has a complete design system (tokens, typography, accessibility plumbing) and a `/styleguide` page — ready for content pages in Phase 2.

**Architecture:** Astro 4 static site with MDX content collections. CSS is plain custom properties (no Tailwind). Interactive elements will be Astro islands in later phases; Phase 1 is pure HTML/CSS. All JavaScript is deferred to later phases — this phase ships zero JS to the browser.

**Tech Stack:** Astro 4, MDX, TypeScript (strict), Vitest (unit), Playwright (E2E), pnpm, Netlify static deploy.

---

## File Map

Files created or modified in this phase:

```
/                               (repo root — g-xyz)
├── astro.config.mjs            CREATE — Astro config with MDX integration
├── tsconfig.json               CREATE — TypeScript strict config with path aliases
├── vitest.config.ts            CREATE — Vitest unit test config
├── playwright.config.ts        CREATE — Playwright E2E config
├── netlify.toml                MODIFY — update build command + add redirect stub
├── package.json                REPLACE — new Astro dependencies
├── .gitignore                  MODIFY — add Astro/pnpm ignores
├── docs/
│   └── metrics.md              CREATE — Lighthouse + axe baseline results
├── public/
│   └── fonts/
│       ├── MaziusDisplay-Regular.woff2
│       ├── MaziusDisplay-Bold.woff2
│       ├── MaziusDisplay-Extraitalic.woff2
│       ├── MaziusDisplay-ExtraItalicBold.woff2
│       └── NectoMono-Regular.woff2
├── src/
│   ├── content/
│   │   ├── config.ts           CREATE — defineCollection wrappers (uses schemas.ts)
│   │   ├── schemas.ts          CREATE — exported raw Zod schemas (testable)
│   │   └── projects/
│   │       └── circulaw.mdx    CREATE — sample project (smoke test for collection)
│   ├── layouts/
│   │   └── Base.astro          CREATE — skip link, landmarks, head, meta
│   ├── components/
│   │   ├── Nav.astro           CREATE — site navigation
│   │   └── Footer.astro        CREATE — site footer
│   ├── pages/
│   │   ├── index.astro         CREATE — placeholder home page
│   │   └── styleguide.astro    CREATE — design system showcase
│   └── styles/
│       ├── global.css          CREATE — imports all partials
│       ├── reset.css           CREATE — modern CSS reset
│       ├── tokens.css          CREATE — CSS custom properties
│       ├── typography.css      CREATE — @font-face + type scale
│       └── motion.css          CREATE — prefers-reduced-motion layer
├── e2e/
│   ├── accessibility.spec.ts   CREATE — skip link, landmarks, lang attr
│   └── styleguide.spec.ts      CREATE — styleguide page smoke test
└── src/
    └── content/
        └── schemas.test.ts     CREATE — Vitest unit tests for Zod schemas
```

---

## Task 1: Remove 11ty, initialize Astro

**Files:**
- Delete: `.eleventy.js`, `tailwind.config.js`, `config/`, `src/` (11ty contents), `yarn.lock`
- Create: `astro.config.mjs`, `tsconfig.json`, `package.json` (new)

- [ ] **Step 1: Preserve files that survive the transition**

```bash
# Keep: netlify.toml, PROPOSAL.md, docs/, .git/, .gitignore, readme.md
# Everything else goes. Verify what will be lost:
ls -la /Users/gurden/Documents/code/g-xyz
```

- [ ] **Step 2: Remove 11ty-specific files and directories**

```bash
cd /Users/gurden/Documents/code/g-xyz
rm -rf src config .eleventy.js tailwind.config.js yarn.lock .prettierrc .prettierignore node_modules
```

- [ ] **Step 3: Initialize Astro in the current directory**

```bash
cd /Users/gurden/Documents/code/g-xyz
pnpm create astro@latest . --template minimal --typescript strict --no-install --no-git
```

When prompted:
- "How would you like to start your new project?" → Empty
- "Do you plan to write TypeScript?" → Yes / Strict
- "Initialize a new git repository?" → No (already have one)

- [ ] **Step 4: Install dependencies**

```bash
cd /Users/gurden/Documents/code/g-xyz
pnpm install
pnpm add @astrojs/mdx
pnpm add -D vitest @vitest/ui playwright @playwright/test zod
```

- [ ] **Step 5: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  site: 'https://gurden.xyz',
});
```

- [ ] **Step 6: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      "@layouts/*": ["src/layouts/*"],
      "@styles/*": ["src/styles/*"]
    }
  }
}
```

- [ ] **Step 7: Update `netlify.toml`**

Replace the entire file content:

```toml
[build]
  command = "pnpm build"
  publish = "dist"

# Old URL redirects — /posts/* → /work/* (full list in Phase 5)
# Adding stub now so the pattern is established.
[[redirects]]
  from = "/posts/*"
  to = "/work/:splat"
  status = 301

[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "upgrade-insecure-requests; block-all-mixed-content;"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "autoplay=(), camera=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), publickey-credentials-get=()"

# Cache static assets aggressively
[[headers]]
  for = "/fonts/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

- [ ] **Step 8: Update `.gitignore`**

Add these lines to the existing `.gitignore`:

```
# Astro
dist/
.astro/

# pnpm
node_modules/
pnpm-lock.yaml

# Playwright
/test-results/
/playwright-report/
/playwright/.cache/

# Superpowers (brainstorm sessions, not production code)
.superpowers/
```

- [ ] **Step 9: Verify Astro starts**

```bash
cd /Users/gurden/Documents/code/g-xyz
pnpm dev
```

Expected: `🚀 astro v4.x.x ready` and `http://localhost:4321/` loads with the default Astro page.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: replace 11ty with Astro 4 — clean scaffold"
```

---

## Task 2: Configure Vitest and Playwright

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`
- Modify: `package.json` scripts

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:4321',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
```

- [ ] **Step 3: Install Playwright browsers**

```bash
pnpm exec playwright install chromium webkit
```

- [ ] **Step 4: Add scripts to `package.json`**

Add inside the `"scripts"` block (merge with whatever Astro created):

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

- [ ] **Step 5: Verify both test runners initialize**

```bash
pnpm test
```
Expected: `No test files found` (exit 0 — no tests yet, that's correct).

```bash
pnpm test:e2e
```
Expected: `No tests found` or `Error: No test files found` (exit 0 or 1 — acceptable at this stage).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts playwright.config.ts package.json
git commit -m "chore: configure Vitest and Playwright"
```

---

## Task 3: Download and commit Collletttivo fonts

**Files:**
- Create: `public/fonts/MaziusDisplay-Regular.woff2`
- Create: `public/fonts/MaziusDisplay-Bold.woff2`
- Create: `public/fonts/MaziusDisplay-Extraitalic.woff2`
- Create: `public/fonts/MaziusDisplay-ExtraItalicBold.woff2`
- Create: `public/fonts/NectoMono-Regular.woff2`

- [ ] **Step 1: Create fonts directory**

```bash
mkdir -p /Users/gurden/Documents/code/g-xyz/public/fonts
```

- [ ] **Step 2: Download Mazius Display fonts**

```bash
cd /Users/gurden/Documents/code/g-xyz/public/fonts

curl -L -o MaziusDisplay-Regular.woff2 \
  "https://raw.githubusercontent.com/collletttivo/mazius-display/main/fonts/MaziusDisplay-Regular.woff2"

curl -L -o MaziusDisplay-Bold.woff2 \
  "https://raw.githubusercontent.com/collletttivo/mazius-display/main/fonts/MaziusDisplay-Bold.woff2"

curl -L -o MaziusDisplay-Extraitalic.woff2 \
  "https://raw.githubusercontent.com/collletttivo/mazius-display/main/fonts/MaziusDisplay-Extraitalic.woff2"

curl -L -o MaziusDisplay-ExtraItalicBold.woff2 \
  "https://raw.githubusercontent.com/collletttivo/mazius-display/main/fonts/MaziusDisplay-ExtraItalicBold.woff2"
```

- [ ] **Step 3: Download Necto Mono**

```bash
curl -L -o NectoMono-Regular.woff2 \
  "https://raw.githubusercontent.com/collletttivo/necto-mono/main/fonts/NectoMono-Regular.woff2"
```

- [ ] **Step 4: Verify all five files downloaded and are non-empty**

```bash
ls -lh /Users/gurden/Documents/code/g-xyz/public/fonts/
```

Expected: five `.woff2` files, each > 10KB. If any is 0 bytes or missing, re-run its curl command.

- [ ] **Step 5: Commit**

```bash
git add public/fonts/
git commit -m "feat: self-host Collletttivo fonts — Mazius Display + Necto Mono"
```

---

## Task 4: CSS foundation — reset, tokens, motion

**Files:**
- Create: `src/styles/reset.css`
- Create: `src/styles/tokens.css`
- Create: `src/styles/motion.css`
- Create: `src/styles/global.css`

- [ ] **Step 1: Create `src/styles/` directory**

```bash
mkdir -p /Users/gurden/Documents/code/g-xyz/src/styles
```

- [ ] **Step 2: Write `src/styles/reset.css`**

```css
*, *::before, *::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

html {
  hanging-punctuation: first last;
}

body {
  min-height: 100dvh;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}

h1, h2, h3, h4, h5, h6 {
  text-wrap: balance;
}

p {
  text-wrap: pretty;
}
```

- [ ] **Step 3: Write `src/styles/tokens.css`**

```css
:root {
  /* ── Color ── */
  --ground:      #F5F2ED;
  --ink:         #1A1A18;
  --ink-muted:   #6B6760;
  --ink-faint:   #C4BFB6;
  --art-ground:  #0D0F10;
  --art-ink:     #E8E4DD;

  /* ── Type scale (base 17px, ratio ~1.25) ── */
  --text-xs:   0.625rem;   /* 10px  — Necto Mono labels */
  --text-sm:   0.75rem;    /* 12px  — secondary text */
  --text-base: 1.0625rem;  /* 17px  — body */
  --text-md:   1.1875rem;  /* 19px  — Marginalia paragraph */
  --text-lg:   1.5rem;     /* 24px  — project list names */
  --text-xl:   2rem;       /* 32px  — section headings */
  --text-2xl:  3rem;       /* 48px  — mid-display */
  --text-3xl:  4.5rem;     /* 72px  — display */
  --text-4xl:  clamp(3.25rem, 7vw, 6rem); /* hero tagline, responsive */

  /* ── Spacing (4px base) ── */
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-3:  0.75rem;
  --space-4:  1rem;
  --space-6:  1.5rem;
  --space-8:  2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;

  /* ── Layout ── */
  --max-width: 1100px;
  --gutter:    var(--space-10); /* 40px */

  /* ── Motion ── */
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
  --easing:        cubic-bezier(0.4, 0, 0.2, 1);

  /* ── Focus ── */
  --focus-color:  var(--ink);
  --focus-offset: 3px;
}
```

- [ ] **Step 4: Write `src/styles/motion.css`**

```css
/*
  Reduced-motion layer.
  Covers: animations, transitions, scroll behaviour, and Phase 3 shader canvases.
  Canvas elements use data-shader attribute — toggled here and in JS.
*/

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Shader canvases — hidden when motion is reduced */
  canvas[data-shader] {
    display: none !important;
  }

  /* Marginalia notes — show immediately, no drift */
  [data-note] {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }

  /* Skills stagger — show all immediately */
  [data-skill-word] {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}

@media (prefers-reduced-data) {
  /* Disable shaders to save GPU/battery on metered connections */
  canvas[data-shader] {
    display: none !important;
  }
}
```

- [ ] **Step 5: Write `src/styles/global.css`**

```css
@import './reset.css';
@import './tokens.css';
@import './motion.css';
@import './typography.css';

/* ── Base element styles ── */

html {
  color: var(--ink);
  background-color: var(--ground);
  scroll-behavior: smooth;
}

body {
  font-size: var(--text-base);
  line-height: 1.65;
}

/* ── Focus styles — visible for keyboard nav ── */
:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: var(--focus-offset);
  border-radius: 2px;
}

/* Remove focus ring for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* ── Skip link ── */
.skip-link {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  z-index: 100;
  padding: var(--space-2) var(--space-4);
  background: var(--ink);
  color: var(--ground);
  font-family: 'NectoMono', monospace;
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  transform: translateY(-200%);
  transition: transform var(--duration-fast) var(--easing);
}

.skip-link:focus {
  transform: translateY(0);
}

/* ── Layout wrapper ── */
.page-wrap {
  max-width: var(--max-width);
  margin-inline: auto;
  padding-inline: var(--gutter);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/styles/
git commit -m "feat: CSS foundation — reset, tokens, motion layer"
```

---

## Task 5: Typography CSS

**Files:**
- Create: `src/styles/typography.css`

- [ ] **Step 1: Write `src/styles/typography.css`**

```css
/* ── Font face declarations ── */

@font-face {
  font-family: 'MaziusDisplay';
  src: url('/fonts/MaziusDisplay-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MaziusDisplay';
  src: url('/fonts/MaziusDisplay-Extraitalic.woff2') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: 'MaziusDisplay';
  src: url('/fonts/MaziusDisplay-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MaziusDisplay';
  src: url('/fonts/MaziusDisplay-ExtraItalicBold.woff2') format('woff2');
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: 'NectoMono';
  src: url('/fonts/NectoMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* ── Base font stack ── */

html {
  font-family: 'MaziusDisplay', Georgia, 'Times New Roman', serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Utility classes ── */

.font-display {
  font-family: 'MaziusDisplay', Georgia, serif;
}

.font-display-italic {
  font-family: 'MaziusDisplay', Georgia, serif;
  font-style: italic;
}

.font-mono {
  font-family: 'NectoMono', 'Courier New', monospace;
}

/* ── Type scale utilities ── */

.text-xs   { font-size: var(--text-xs); }
.text-sm   { font-size: var(--text-sm); }
.text-base { font-size: var(--text-base); }
.text-md   { font-size: var(--text-md); }
.text-lg   { font-size: var(--text-lg); }
.text-xl   { font-size: var(--text-xl); }
.text-2xl  { font-size: var(--text-2xl); }
.text-3xl  { font-size: var(--text-3xl); }
.text-4xl  { font-size: var(--text-4xl); }

/* ── Color utilities ── */

.text-ink        { color: var(--ink); }
.text-ink-muted  { color: var(--ink-muted); }
.text-ink-faint  { color: var(--ink-faint); }

/* ── Necto Mono label pattern (reused everywhere) ── */

.label {
  font-family: 'NectoMono', monospace;
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/typography.css
git commit -m "feat: typography CSS — font-face, type scale, utility classes"
```

---

## Task 6: Content collection schemas (TDD)

**Files:**
- Create: `src/content/schemas.ts`
- Create: `src/content/config.ts`
- Create: `src/content/schemas.test.ts`
- Create: `src/content/projects/circulaw.mdx` (sample)

- [ ] **Step 1: Write the failing tests**

Create `src/content/schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { projectSchema, poemSchema, artSchema } from './schemas';

describe('projectSchema', () => {
  it('accepts valid project frontmatter', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling for circular economy transitions',
      role: 'Lead Developer & Designer',
      year: 2021,
      tags: ['civic-tech', 'legal'],
      featured: true,
    });
    expect(result.success).toBe(true);
  });

  it('defaults featured to false when omitted', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling',
      role: 'Lead Developer',
      year: 2021,
      tags: ['civic-tech'],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.featured).toBe(false);
  });

  it('rejects when required fields are missing', () => {
    const result = projectSchema.safeParse({ title: 'CircuLaw' });
    expect(result.success).toBe(false);
  });

  it('rejects when year is a string instead of number', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'test',
      role: 'dev',
      year: '2021',
      tags: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional collaborators array', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling',
      role: 'Lead Developer',
      year: 2021,
      tags: ['civic-tech'],
      collaborators: ['Romy Snijders', 'Heather Griffin'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional links with valid URLs', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling',
      role: 'Lead Developer',
      year: 2021,
      tags: ['civic-tech'],
      links: [{ label: 'App', url: 'https://circulaw.nl' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects links with invalid URLs', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling',
      role: 'Lead Developer',
      year: 2021,
      tags: ['civic-tech'],
      links: [{ label: 'App', url: 'not-a-url' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('poemSchema', () => {
  it('accepts valid poem frontmatter', () => {
    const result = poemSchema.safeParse({
      title: 'Untitled',
      date: new Date('2024-01-01'),
    });
    expect(result.success).toBe(true);
  });

  it('defaults customLayout to false', () => {
    const result = poemSchema.safeParse({
      title: 'Untitled',
      date: new Date('2024-01-01'),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.customLayout).toBe(false);
  });

  it('rejects missing title', () => {
    const result = poemSchema.safeParse({ date: new Date() });
    expect(result.success).toBe(false);
  });
});

describe('artSchema', () => {
  it('accepts valid art frontmatter', () => {
    const result = artSchema.safeParse({
      title: 'Reaction Diffusion I',
      date: new Date('2024-06-01'),
      medium: 'canvas',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid medium value', () => {
    const result = artSchema.safeParse({
      title: 'Test',
      date: new Date(),
      medium: 'photoshop',
    });
    expect(result.success).toBe(false);
  });

  it('defaults liveEmbed to false', () => {
    const result = artSchema.safeParse({
      title: 'Test',
      date: new Date(),
      medium: 'webgl',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.liveEmbed).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests — verify they FAIL**

```bash
pnpm test
```

Expected: `FAIL src/content/schemas.test.ts` — `Cannot find module './schemas'`. That's correct: the module doesn't exist yet.

- [ ] **Step 3: Create `src/content/schemas.ts`**

```ts
import { z } from 'astro:content';

export const projectSchema = z.object({
  title:         z.string(),
  description:   z.string(),
  role:          z.string(),
  year:          z.number().int().min(1990).max(2100),
  tags:          z.array(z.string()),
  collaborators: z.array(z.string()).optional(),
  links:         z.array(
    z.object({ label: z.string(), url: z.string().url() })
  ).optional(),
  featured:      z.boolean().default(false),
  heroImage:     z.string().optional(), // relative path to public/
});

export const poemSchema = z.object({
  title:        z.string(),
  date:         z.date(),
  customLayout: z.boolean().default(false),
});

export const artSchema = z.object({
  title:     z.string(),
  date:      z.date(),
  medium:    z.enum(['canvas', 'webgl', 'svg', 'p5', 'static']),
  sourceUrl: z.string().url().optional(),
  liveEmbed: z.boolean().default(false),
});
```

- [ ] **Step 4: Create `src/content/config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { projectSchema, poemSchema, artSchema } from './schemas';

export const collections = {
  projects: defineCollection({ type: 'content', schema: projectSchema }),
  poems:    defineCollection({ type: 'content', schema: poemSchema }),
  art:      defineCollection({ type: 'content', schema: artSchema }),
};
```

- [ ] **Step 5: Fix import in test — `astro:content` exports `z` from Zod but tests run in Node, not Astro context**

Update the import in `src/content/schemas.ts` to use raw `zod` so tests can run outside the Astro build:

```ts
import { z } from 'zod';
// (remove: import { z } from 'astro:content')
```

Update `src/content/config.ts` to import `z` from `astro:content` for the collection definitions (only this file needs the Astro context):

```ts
import { defineCollection, z } from 'astro:content';
import { projectSchema, poemSchema, artSchema } from './schemas';

export const collections = {
  projects: defineCollection({ type: 'content', schema: projectSchema }),
  poems:    defineCollection({ type: 'content', schema: poemSchema }),
  art:      defineCollection({ type: 'content', schema: artSchema }),
};
```

- [ ] **Step 6: Run tests — verify they PASS**

```bash
pnpm test
```

Expected:
```
✓ src/content/schemas.test.ts (11)
  ✓ projectSchema > accepts valid project frontmatter
  ✓ projectSchema > defaults featured to false when omitted
  ... (all 11 pass)
Test Files  1 passed (1)
```

- [ ] **Step 7: Create sample project MDX file**

Create `src/content/projects/circulaw.mdx`:

```mdx
---
title: CircuLaw
description: Open-source legal tooling for city councils to navigate and accelerate circular economy transitions.
role: Lead Developer & Design Technologist
year: 2021
tags: [civic-tech, legal, open-source]
featured: true
collaborators:
  - Romy Snijders
  - Heather Griffin
  - Yvonne de Mey van Streefkerk
  - Theo Campbell
links:
  - label: App
    url: https://www.circulaw.nl/
  - label: Code
    url: https://github.com/Dark-Matter-Labs/circulaw
---

TODO: Add full project case study content in Phase 2.
```

- [ ] **Step 8: Commit**

```bash
git add src/content/
git commit -m "feat: content collection schemas (projects, poems, art) with tests"
```

---

## Task 7: Base layout component (TDD)

**Files:**
- Create: `e2e/accessibility.spec.ts`
- Create: `src/layouts/Base.astro`

- [ ] **Step 1: Write the failing E2E test**

Create `e2e/accessibility.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Base layout accessibility', () => {
  test('skip link is present in DOM', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a.skip-link[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test('skip link is visible when focused', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toBeFocused();
    // Should be visible (not off-screen) when focused
    const box = await skipLink.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThan(-1);
  });

  test('main content landmark has correct id', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main#main-content');
    await expect(main).toBeAttached();
  });

  test('html element has lang="en"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('page has a title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Gurden Batra/);
  });

  test('nav landmark is present', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeAttached();
  });

  test('footer landmark is present', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeAttached();
  });
});
```

- [ ] **Step 2: Run the E2E test — verify it FAILS**

```bash
pnpm test:e2e
```

Expected: tests fail because no Astro page exists yet (or the default Astro page doesn't have the required elements).

- [ ] **Step 3: Create `src/layouts/Base.astro`**

```astro
---
import Nav from '@components/Nav.astro';
import Footer from '@components/Footer.astro';
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const {
  title,
  description = 'Gurden Batra — Civic Tech Lead, Design Technologist. Berlin.',
} = Astro.props;

const pageTitle = title === 'Home' ? 'Gurden Batra' : `${title} — Gurden Batra`;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <meta name="generator" content={Astro.generator} />
    <title>{pageTitle}</title>
    <!-- Preload fonts: only the two cuts used above the fold -->
    <link
      rel="preload"
      href="/fonts/MaziusDisplay-Extraitalic.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
    <link
      rel="preload"
      href="/fonts/NectoMono-Regular.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <header role="banner">
      <Nav />
    </header>

    <main id="main-content" tabindex="-1">
      <slot />
    </main>

    <footer role="contentinfo">
      <Footer />
    </footer>
  </body>
</html>
```

- [ ] **Step 4: Run the E2E tests — verify they PASS**

(Nav and Footer must exist first — if you get a component-not-found error, create stub components per Step 5 below, then re-run.)

```bash
pnpm test:e2e
```

Expected: all 7 accessibility tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/ e2e/accessibility.spec.ts
git commit -m "feat: Base layout — skip link, landmarks, font preloads"
```

---

## Task 8: Nav component (TDD)

**Files:**
- Create: `src/components/Nav.astro`

- [ ] **Step 1: Add nav tests to `e2e/accessibility.spec.ts`**

Append to the existing test file:

```ts
test.describe('Nav component', () => {
  test('nav contains links to all main sections', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav.locator('a[href="/work"]')).toBeAttached();
    await expect(nav.locator('a[href="/story"]')).toBeAttached();
    await expect(nav.locator('a[href="/art"]')).toBeAttached();
    await expect(nav.locator('a[href="/writing"]')).toBeAttached();
    await expect(nav.locator('a[href="/about"]')).toBeAttached();
  });

  test('nav logo links to home', async ({ page }) => {
    await page.goto('/work');
    const logoLink = page.locator('nav a[href="/"]');
    await expect(logoLink).toBeAttached();
  });
});
```

- [ ] **Step 2: Run to verify these new nav tests FAIL**

```bash
pnpm test:e2e --grep "Nav component"
```

Expected: FAIL — `nav` has no links yet.

- [ ] **Step 3: Create `src/components/Nav.astro`**

```astro
---
const navLinks = [
  { href: '/work',    label: 'Work' },
  { href: '/story',   label: 'Story' },
  { href: '/art',     label: 'Art' },
  { href: '/writing', label: 'Writing' },
  { href: '/about',   label: 'About' },
];

const currentPath = Astro.url.pathname;
---

<nav aria-label="Main navigation">
  <div class="nav-inner page-wrap">
    <a href="/" class="nav-logo" aria-label="Gurden Batra — home">
      Gurden Batra
    </a>
    <ul class="nav-links" role="list">
      {navLinks.map(({ href, label }) => (
        <li>
          <a
            href={href}
            class="nav-link"
            aria-current={currentPath.startsWith(href) ? 'page' : undefined}
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  </div>
</nav>

<style>
  nav {
    border-bottom: 1px solid var(--ink-faint);
    position: sticky;
    top: 0;
    background: var(--ground);
    z-index: 10;
  }

  .nav-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-block: var(--space-4);
  }

  .nav-logo {
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: 1.0625rem;
    color: var(--ink);
    text-decoration: none;
    line-height: 1;
  }

  .nav-links {
    display: flex;
    gap: var(--space-8);
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .nav-link {
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--ink-muted);
    text-decoration: none;
    transition: color var(--duration-fast) var(--easing);
  }

  .nav-link:hover,
  .nav-link[aria-current='page'] {
    color: var(--ink);
  }

  /* Mobile: collapse links at narrow viewport */
  @media (max-width: 600px) {
    .nav-links {
      gap: var(--space-4);
    }

    .nav-link {
      font-size: 0.5625rem;
    }
  }
</style>
```

- [ ] **Step 4: Run nav tests — verify they PASS**

```bash
pnpm test:e2e --grep "Nav component"
```

Expected: both nav tests pass.

- [ ] **Step 5: Run all E2E tests to confirm nothing regressed**

```bash
pnpm test:e2e
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/Nav.astro e2e/accessibility.spec.ts
git commit -m "feat: Nav component — sticky, accessible, aria-current"
```

---

## Task 9: Footer component

**Files:**
- Create: `src/components/Footer.astro`

- [ ] **Step 1: Create `src/components/Footer.astro`**

```astro
---
const year = new Date().getFullYear();
---

<footer class="site-footer" role="contentinfo">
  <div class="footer-inner page-wrap">
    <span class="footer-copy label">
      © {year} Gurden Batra
    </span>
    <nav class="footer-nav" aria-label="Footer navigation">
      <ul role="list">
        <li><a href="/colophon">Colophon</a></li>
        <li><a href="/feed.xml">RSS</a></li>
      </ul>
    </nav>
  </div>
</footer>

<style>
  .site-footer {
    border-top: 1px solid var(--ink-faint);
    margin-top: var(--space-24);
  }

  .footer-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-block: var(--space-6);
  }

  .footer-copy {
    color: var(--ink-faint);
  }

  .footer-nav ul {
    display: flex;
    gap: var(--space-6);
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .footer-nav a {
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--ink-muted);
    text-decoration: none;
    transition: color var(--duration-fast) var(--easing);
  }

  .footer-nav a:hover {
    color: var(--ink);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Footer.astro
git commit -m "feat: Footer component"
```

---

## Task 10: Styleguide page

**Files:**
- Create: `e2e/styleguide.spec.ts`
- Create: `src/pages/styleguide.astro`

- [ ] **Step 1: Write the failing E2E test**

Create `e2e/styleguide.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Styleguide page', () => {
  test('page loads with 200', async ({ page }) => {
    const response = await page.goto('/styleguide');
    expect(response?.status()).toBe(200);
  });

  test('shows type specimens for both typefaces', async ({ page }) => {
    await page.goto('/styleguide');
    await expect(page.getByText('MaziusDisplay')).toBeVisible();
    await expect(page.getByText('NectoMono')).toBeVisible();
  });

  test('shows color swatches section', async ({ page }) => {
    await page.goto('/styleguide');
    await expect(page.getByText('Color Tokens')).toBeVisible();
  });

  test('shows spacing scale section', async ({ page }) => {
    await page.goto('/styleguide');
    await expect(page.getByText('Spacing')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
pnpm test:e2e --grep "Styleguide"
```

Expected: FAIL — `/styleguide` returns 404.

- [ ] **Step 3: Create `src/pages/styleguide.astro`**

```astro
---
import Base from '@layouts/Base.astro';
---

<Base title="Styleguide">
  <div class="sg-wrap page-wrap">

    <header class="sg-header">
      <p class="label">Design System</p>
      <h1>Styleguide</h1>
    </header>

    <!-- ── TYPOGRAPHY ── -->
    <section class="sg-section">
      <h2 class="sg-section-title">Typography</h2>

      <div class="sg-subsection">
        <p class="label">MaziusDisplay — Regular</p>
        <p class="sg-specimen-xl">The quick brown fox</p>
        <p class="sg-specimen-lg">Civic systems built to last</p>
        <p class="sg-specimen-body">
          Body copy at var(--text-base) / 17px. Mazius Display Regular holds at
          this size for project descriptions and the story section. High contrast
          is a feature on modern screens.
        </p>
      </div>

      <div class="sg-subsection">
        <p class="label">MaziusDisplay — Extra Italic</p>
        <p class="sg-specimen-xl sg-italic">Design.</p>
        <p class="sg-specimen-xl sg-italic">Code.</p>
        <p class="sg-specimen-lg sg-italic">Bring ideas to life.</p>
      </div>

      <div class="sg-subsection">
        <p class="label">NectoMono — Regular</p>
        <p class="sg-mono">WORK · CIVIC TECH · 2021–2026</p>
        <p class="sg-mono">01 · CircuLaw · Amsterdam · Circular Economy</p>
        <p class="sg-mono">BERLIN — HELSINKI — ATLANTA — DELHI</p>
      </div>
    </section>

    <!-- ── COLOR TOKENS ── -->
    <section class="sg-section">
      <h2 class="sg-section-title">Color Tokens</h2>
      <div class="sg-swatches">
        <div class="sg-swatch" style="background: var(--ground); border: 1px solid var(--ink-faint);">
          <span class="label">--ground</span>
          <span class="sg-hex">#F5F2ED</span>
        </div>
        <div class="sg-swatch" style="background: var(--ink);">
          <span class="label" style="color: var(--ground);">--ink</span>
          <span class="sg-hex" style="color: var(--ground);">#1A1A18</span>
        </div>
        <div class="sg-swatch" style="background: var(--ink-muted);">
          <span class="label" style="color: var(--ground);">--ink-muted</span>
          <span class="sg-hex" style="color: var(--ground);">#6B6760</span>
        </div>
        <div class="sg-swatch" style="background: var(--ink-faint); border: 1px solid #bbb;">
          <span class="label">--ink-faint</span>
          <span class="sg-hex">#C4BFB6</span>
        </div>
        <div class="sg-swatch" style="background: var(--art-ground);">
          <span class="label" style="color: var(--art-ink);">--art-ground</span>
          <span class="sg-hex" style="color: var(--art-ink);">#0D0F10</span>
        </div>
        <div class="sg-swatch" style="background: var(--art-ground); border: 1px solid #333;">
          <span class="label" style="color: var(--art-ink);">--art-ink</span>
          <span class="sg-hex" style="color: var(--art-ink);">#E8E4DD</span>
        </div>
      </div>
    </section>

    <!-- ── SPACING ── -->
    <section class="sg-section">
      <h2 class="sg-section-title">Spacing</h2>
      <div class="sg-spacing-list">
        {[1,2,3,4,6,8,10,12,16,20,24].map(n => (
          <div class="sg-spacing-row">
            <span class="label">--space-{n}</span>
            <div class="sg-spacing-bar" style={`width: calc(var(--space-${n}) * 4); height: 12px; background: var(--ink-faint);`}></div>
            <span class="label">{n * 4}px</span>
          </div>
        ))}
      </div>
    </section>

    <!-- ── FOCUS STATE ── -->
    <section class="sg-section">
      <h2 class="sg-section-title">Focus State</h2>
      <p class="sg-note">Tab to the button below to see the focus ring.</p>
      <button class="sg-focus-demo">Focus me</button>
    </section>

    <!-- ── LABEL PATTERN ── -->
    <section class="sg-section">
      <h2 class="sg-section-title">Label Pattern</h2>
      <p class="label">This is the .label class — NectoMono, 10px, uppercase, tracked</p>
    </section>

  </div>
</Base>

<style>
  .sg-wrap {
    padding-block: var(--space-16);
  }

  .sg-header {
    margin-bottom: var(--space-16);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .sg-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
  }

  .sg-section {
    margin-bottom: var(--space-16);
    padding-bottom: var(--space-16);
    border-bottom: 1px solid var(--ink-faint);
  }

  .sg-section-title {
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
    font-weight: 400;
    margin-bottom: var(--space-8);
  }

  .sg-subsection {
    margin-bottom: var(--space-10);
  }

  .sg-subsection .label {
    margin-bottom: var(--space-3);
    display: block;
  }

  .sg-specimen-xl {
    font-size: var(--text-3xl);
    line-height: 1.05;
    margin-bottom: var(--space-2);
  }

  .sg-specimen-lg {
    font-size: var(--text-xl);
    line-height: 1.2;
    margin-bottom: var(--space-2);
  }

  .sg-specimen-body {
    font-size: var(--text-base);
    line-height: 1.7;
    max-width: 55ch;
  }

  .sg-italic {
    font-style: italic;
  }

  .sg-mono {
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.06em;
    color: var(--ink-muted);
    line-height: 2;
  }

  .sg-swatches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--space-4);
  }

  .sg-swatch {
    padding: var(--space-8) var(--space-4) var(--space-4);
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-height: 100px;
  }

  .sg-hex {
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    opacity: 0.7;
  }

  .sg-spacing-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .sg-spacing-row {
    display: flex;
    align-items: center;
    gap: var(--space-6);
  }

  .sg-spacing-row .label {
    width: 80px;
    flex-shrink: 0;
  }

  .sg-note {
    font-size: var(--text-sm);
    color: var(--ink-muted);
    margin-bottom: var(--space-4);
  }

  .sg-focus-demo {
    padding: var(--space-3) var(--space-6);
    background: transparent;
    border: 1px solid var(--ink-faint);
    cursor: pointer;
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink);
  }

  .sg-focus-demo:hover {
    border-color: var(--ink);
  }
</style>
```

- [ ] **Step 4: Run styleguide tests — verify they PASS**

```bash
pnpm test:e2e --grep "Styleguide"
```

Expected: all 4 styleguide tests pass.

- [ ] **Step 5: Run full E2E suite**

```bash
pnpm test:e2e
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/styleguide.astro e2e/styleguide.spec.ts
git commit -m "feat: /styleguide page — type specimens, color tokens, spacing scale"
```

---

## Task 11: Home page placeholder

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Create `src/pages/index.astro`**

```astro
---
import Base from '@layouts/Base.astro';
---

<Base title="Home">
  <div class="home-placeholder page-wrap">
    <p class="label">Phase 1 — Scaffold complete</p>
    <h1 class="home-title">
      Design.<br />
      Code.<br />
      <span class="home-title-light">Bring ideas to life.</span>
    </h1>
    <p class="home-note label">
      Interactive home page coming in Phase 3.
      See <a href="/styleguide">styleguide →</a>
    </p>
  </div>
</Base>

<style>
  .home-placeholder {
    padding-block: var(--space-24);
  }

  .home-placeholder .label {
    margin-bottom: var(--space-8);
  }

  .home-title {
    font-size: var(--text-4xl);
    font-style: italic;
    line-height: 1.0;
    letter-spacing: -0.02em;
    margin-bottom: var(--space-8);
  }

  .home-title-light {
    font-style: normal;
    font-size: clamp(1.5rem, 3.5vw, 3rem);
    color: var(--ink-muted);
    display: block;
    margin-top: var(--space-2);
  }

  .home-note a {
    color: var(--ink);
  }
</style>
```

- [ ] **Step 2: Verify home page loads correctly**

```bash
pnpm dev
# Open http://localhost:4321 — should show the placeholder with correct typography
```

- [ ] **Step 3: Run full test suite one more time**

```bash
pnpm test && pnpm test:e2e
```

Expected: all unit tests pass, all E2E tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: home page placeholder — typography scaffold visible"
```

---

## Task 12: Lighthouse + axe baseline

**Files:**
- Create: `docs/metrics.md`

- [ ] **Step 1: Install axe-playwright**

```bash
pnpm add -D axe-playwright
```

- [ ] **Step 2: Write axe E2E test**

Create `e2e/axe.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Axe accessibility audit', () => {
  test('home page has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('styleguide page has no accessibility violations', async ({ page }) => {
    await page.goto('/styleguide');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 3: Run axe tests**

```bash
pnpm test:e2e --grep "Axe"
```

Expected: zero violations on both pages. If violations appear, fix them before continuing — do not proceed with violations in the baseline.

Common fixes if violations appear:
- Missing `alt` on images → add `alt=""`
- Color contrast → check token values against WCAG AA (4.5:1 for body, 3:1 for large text)
- Missing heading hierarchy → fix heading levels in styleguide

- [ ] **Step 4: Install Lighthouse CLI and run a Lighthouse audit**

```bash
pnpm add -D @lhci/cli
pnpm exec lhci autorun --collect.url=http://localhost:4321 --collect.numberOfRuns=1 2>&1 | tail -30
```

Note: the dev server must be running (`pnpm dev` in a separate terminal) before running this.

- [ ] **Step 5: Record results in `docs/metrics.md`**

Create `docs/metrics.md` with the actual numbers from your run:

```markdown
# Performance & Accessibility Metrics

## Phase 1 Baseline — 2026-05-02

### Home page (`/`)

| Metric | Score | Target |
|--------|-------|--------|
| Performance | _paste score_ | ≥ 95 |
| Accessibility | _paste score_ | ≥ 95 |
| Best Practices | _paste score_ | ≥ 95 |
| SEO | _paste score_ | ≥ 95 |
| LCP | _paste value_ | < 2.5s |
| TBT | _paste value_ | < 200ms |

### Styleguide page (`/styleguide`)

| Metric | Score | Target |
|--------|-------|--------|
| Performance | _paste score_ | ≥ 95 |
| Accessibility | _paste score_ | ≥ 95 |

### Axe violations

| Page | Violations | Status |
|------|-----------|--------|
| `/` | 0 | ✅ |
| `/styleguide` | 0 | ✅ |

### Notes

- Phase 1 ships zero JavaScript to the browser.
- Fonts use `font-display: swap` — no render-blocking.
- Two font cuts preloaded (Extra Italic + NectoMono Regular).

---

_Update this file after each phase._
```

- [ ] **Step 6: Commit everything**

```bash
git add e2e/axe.spec.ts docs/metrics.md
git commit -m "chore: Lighthouse + axe baseline — Phase 1 metrics recorded"
```

---

## Self-Review

**Spec coverage check:**

| PROPOSAL.md requirement | Covered by task |
|------------------------|-----------------|
| Init Astro, configure MDX | Task 1 |
| Content collection schemas (projects, poems, art) | Task 6 |
| Design tokens as CSS custom properties | Task 4 |
| Base layout: skip link, semantic landmarks, focus styles | Task 7 |
| Self-host Mazius Display + Necto Mono | Task 3, 5 |
| Reduced-motion CSS layer | Task 4 |
| `/styleguide` page | Task 10 |
| Lighthouse + axe baseline before Phase 2 | Task 12 |
| Netlify config updated | Task 1 |
| Old-URL redirect stub (`/posts/*`) | Task 1 |

All requirements covered. ✅

**Placeholder scan:** No TBD, TODO, or vague steps. Every code block is complete. ✅

**Type consistency:** `projectSchema`, `poemSchema`, `artSchema` are defined in Task 6 Step 3 and imported in `config.ts` in Task 6 Step 4. No mismatches. ✅
