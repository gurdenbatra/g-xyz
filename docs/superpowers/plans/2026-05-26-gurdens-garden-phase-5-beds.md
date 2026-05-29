# Gurden's Garden — Phase 5: Beds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/beds` with the Tended Beds hero piece — a grid of raised beds showing the site's stack, accessibility commitments, performance budgets, source, and sustainability — and migrate the existing `/colophon` content into it.

**Architecture:** `TendedBeds.astro` is a self-contained component: five bed `<article>` elements in a CSS grid, a floating watering-can SVG, and a small vanilla-JS script (~40 lines) that auto-cycles the can through beds and moves it on hover. No Canvas, no WebGL, no external animation library — the intentionally cheap zone. The `/beds/index.astro` page wraps it. The old `colophon.astro` is deleted and an Astro redirect preserves the URL.

**Tech Stack:** Astro 5 (static), vanilla JS (setInterval + getBoundingClientRect), inline SVG, CSS transitions, Playwright E2E. No unit tests needed (no pure functions to test).

---

## File Structure

**New:**
- `src/components/zones/Beds/TendedBeds.astro` — Tended Beds hero piece
- `src/pages/beds/index.astro` — `/beds` route
- `e2e/beds.spec.ts` — Playwright E2E + axe

**Modified:**
- `astro.config.mjs` — add `'/colophon': '/beds'` redirect
- `src/lib/zones.ts` — beds href: `'/colophon'` → `'/beds'`
- `lighthouserc.json` — `/colophon` → `/beds` in URL list
- `e2e/pages.spec.ts` — replace Colophon tests with redirect + Beds page tests
- `e2e/accessibility.spec.ts` — two `a[href="/colophon"]` → `a[href="/beds"]`
- `e2e/map.spec.ts` — `a[href="/colophon"]` → `a[href="/beds"]` for beds zone

**Deleted:**
- `src/pages/colophon.astro` — content migrated into Beds

---

### Task 1: TendedBeds.astro — complete hero piece

**Files:**
- Create: `src/components/zones/Beds/TendedBeds.astro`

Five beds in a CSS grid, a floating watering-can SVG, and a minimal JS script managing the auto-cycle and hover override. No Canvas. No external dependencies.

**Bed data** (hardcoded in frontmatter):

```typescript
interface BedItem { term: string; detail: string; link?: string; }
interface Bed { id: string; label: string; emoji: string; items: BedItem[]; }

const beds: Bed[] = [
  {
    id: 'stack',
    label: 'Stack',
    emoji: '⚙️',
    items: [
      { term: 'Framework', detail: 'Astro 5 — static, MDX, islands architecture' },
      { term: 'Typefaces', detail: 'Mazius Display + Necto Mono (Collletttivo, SIL OFL), self-hosted' },
      { term: 'Hosting', detail: 'Netlify — static CDN, continuous deployment from main' },
      { term: 'Analytics', detail: 'None.' },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    emoji: '♿',
    items: [
      { term: 'Standard', detail: 'WCAG 2.2 AA' },
      { term: 'Auditing', detail: 'axe-core in CI — zero violations required' },
      { term: 'Keyboard', detail: 'Full navigation, visible focus rings on all interactive elements' },
      { term: 'Motion', detail: 'prefers-reduced-motion respected on every generative piece' },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    emoji: '⚡',
    items: [
      { term: 'LCP', detail: '< 2.5s on mid-tier mobile (Moto G4, throttled)' },
      { term: 'TBT', detail: '< 200ms' },
      { term: 'JS per page', detail: '< 80kb gzipped (excl. lazy-loaded zone piece)' },
      { term: 'CSS total', detail: '< 30kb gzipped' },
    ],
  },
  {
    id: 'source',
    label: 'Source',
    emoji: '📖',
    items: [
      { term: 'Repository', detail: 'github.com/gurden/gurden.xyz', link: 'https://github.com/gurden/gurden.xyz' },
      { term: 'License', detail: 'Content © Gurden Batra. Code MIT.' },
    ],
  },
  {
    id: 'sustainability',
    label: 'Sustainability',
    emoji: '🌱',
    items: [
      { term: 'Architecture', detail: 'Static site — no server-side compute per request' },
      { term: 'Tracking', detail: 'None. No third-party scripts or beacons.' },
      { term: 'Fonts', detail: 'Self-hosted. No Google Fonts, no CDN font requests.' },
    ],
  },
];
```

- [ ] **Step 1: Create `src/components/zones/Beds/TendedBeds.astro`**

```astro
---
// src/components/zones/Beds/TendedBeds.astro

interface BedItem {
  term: string;
  detail: string;
  link?: string;
}

interface Bed {
  id: string;
  label: string;
  emoji: string;
  items: BedItem[];
}

const beds: Bed[] = [
  {
    id: 'stack',
    label: 'Stack',
    emoji: '⚙️',
    items: [
      { term: 'Framework', detail: 'Astro 5 — static, MDX, islands architecture' },
      {
        term: 'Typefaces',
        detail: 'Mazius Display + Necto Mono (Collletttivo, SIL OFL), self-hosted',
      },
      { term: 'Hosting', detail: 'Netlify — static CDN, continuous deployment from main' },
      { term: 'Analytics', detail: 'None.' },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    emoji: '♿',
    items: [
      { term: 'Standard', detail: 'WCAG 2.2 AA' },
      { term: 'Auditing', detail: 'axe-core in CI — zero violations required' },
      {
        term: 'Keyboard',
        detail: 'Full navigation, visible focus rings on all interactive elements',
      },
      {
        term: 'Motion',
        detail: 'prefers-reduced-motion respected on every generative piece',
      },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    emoji: '⚡',
    items: [
      { term: 'LCP', detail: '< 2.5s on mid-tier mobile (Moto G4, throttled)' },
      { term: 'TBT', detail: '< 200ms' },
      { term: 'JS per page', detail: '< 80kb gzipped (excl. lazy-loaded zone piece)' },
      { term: 'CSS total', detail: '< 30kb gzipped' },
    ],
  },
  {
    id: 'source',
    label: 'Source',
    emoji: '📖',
    items: [
      {
        term: 'Repository',
        detail: 'github.com/gurden/gurden.xyz',
        link: 'https://github.com/gurden/gurden.xyz',
      },
      { term: 'License', detail: 'Content © Gurden Batra. Code MIT.' },
    ],
  },
  {
    id: 'sustainability',
    label: 'Sustainability',
    emoji: '🌱',
    items: [
      { term: 'Architecture', detail: 'Static site — no server-side compute per request' },
      { term: 'Tracking', detail: 'None. No third-party scripts or beacons.' },
      { term: 'Fonts', detail: 'Self-hosted. No Google Fonts, no CDN font requests.' },
    ],
  },
];
---

<div class="beds-container" data-beds>
  <!-- Floating watering can — JS positions it over the active bed -->
  <div class="beds-can" data-beds-can aria-hidden="true">
    <svg
      viewBox="0 0 44 38"
      width="44"
      height="38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Body -->
      <rect x="4" y="14" width="24" height="18" rx="3" fill="currentColor" />
      <!-- Neck -->
      <rect x="10" y="8" width="10" height="8" rx="1" fill="currentColor" />
      <!-- Spout -->
      <path
        d="M28 22 L40 16"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
      <!-- Nozzle -->
      <circle cx="40" cy="16" r="2" fill="currentColor" />
      <!-- Drops (decorative, hidden until tended state) -->
      <circle class="drop" cx="41" cy="21" r="1.5" fill="currentColor" opacity="0" />
      <circle class="drop" cx="38" cy="23" r="1.5" fill="currentColor" opacity="0" />
      <circle class="drop" cx="43" cy="24" r="1.5" fill="currentColor" opacity="0" />
      <!-- Handle -->
      <path
        d="M4 17 Q0 17 0 21 Q0 25 4 25"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        fill="none"
      />
    </svg>
  </div>

  <!-- Beds grid -->
  <div class="beds-grid" role="list">
    {
      beds.map((bed) => (
        <article class="bed" data-bed={bed.id} role="listitem">
          <h2 class="bed-label">
            <span aria-hidden="true" class="bed-emoji">{bed.emoji}</span>
            {bed.label}
          </h2>
          <dl class="bed-items">
            {bed.items.map((item) => (
              <>
                <dt class="bed-term label">{item.term}</dt>
                <dd class="bed-detail">
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      {item.detail}
                    </a>
                  ) : (
                    item.detail
                  )}
                </dd>
              </>
            ))}
          </dl>
        </article>
      ))
    }
  </div>
</div>

<script>
  type Cleanup = () => void;

  function mountBeds(): Cleanup {
    const container = document.querySelector<HTMLElement>('[data-beds]');
    if (!container) return () => {};

    const can = container.querySelector<HTMLElement>('[data-beds-can]');
    const bedEls = [...container.querySelectorAll<HTMLElement>('[data-bed]')];
    if (!can || bedEls.length === 0) return () => {};

    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let currentIndex = 0;
    let interval = 0;
    let isHovered = false;

    function moveTo(el: HTMLElement): void {
      const cRect = container.getBoundingClientRect();
      const bRect = el.getBoundingClientRect();
      const x = bRect.left - cRect.left + bRect.width / 2 - can.offsetWidth / 2;
      const y = bRect.top - cRect.top - can.offsetHeight - 6;
      can.style.transform = `translate(${x}px, ${y}px)`;
      bedEls.forEach((b) => b.removeAttribute('data-tended'));
      el.setAttribute('data-tended', '');
    }

    function startCycle(): void {
      if (rm || isHovered) return;
      clearInterval(interval);
      moveTo(bedEls[currentIndex]);
      interval = window.setInterval(() => {
        if (isHovered) return;
        currentIndex = (currentIndex + 1) % bedEls.length;
        moveTo(bedEls[currentIndex]);
      }, 2500);
    }

    // Hover: pause auto-cycle, move can to hovered bed
    const enterHandlers: Cleanup[] = bedEls.map((bed) => {
      const h = (): void => {
        isHovered = true;
        clearInterval(interval);
        moveTo(bed);
      };
      bed.addEventListener('mouseenter', h);
      return () => bed.removeEventListener('mouseenter', h);
    });

    const leaveHandler = (): void => {
      isHovered = false;
      startCycle();
    };
    container.addEventListener('mouseleave', leaveHandler);

    // Touch: tap to tend (mobile)
    const touchHandlers: Cleanup[] = bedEls.map((bed) => {
      const h = (): void => moveTo(bed);
      bed.addEventListener('touchstart', h, { passive: true });
      return () => bed.removeEventListener('touchstart', h);
    });

    // Show can, start cycle
    can.style.opacity = '1';
    if (!rm) startCycle();

    return () => {
      clearInterval(interval);
      enterHandlers.forEach((fn) => fn());
      touchHandlers.forEach((fn) => fn());
      container.removeEventListener('mouseleave', leaveHandler);
    };
  }

  let cleanup: Cleanup = () => {};

  document.addEventListener('astro:page-load', () => {
    cleanup = mountBeds();
  });

  document.addEventListener('astro:before-swap', () => {
    cleanup();
    cleanup = () => {};
  });
</script>

<style>
  /* ── Container ── */
  .beds-container {
    position: relative;
    /* top padding to give the can room above the first row */
    padding-top: var(--space-16);
  }

  /* ── Watering can ── */
  .beds-can {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    color: var(--c-moss);
    pointer-events: none;
    opacity: 0; /* shown by JS after mount */
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
    will-change: transform;
  }

  /* Show water drops when any bed is tended */
  .bed[data-tended] ~ .beds-can .drop,
  [data-beds]:has([data-tended]) .drop {
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  /* ── Grid ── */
  .beds-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--space-6);
  }

  /* ── Individual bed ── */
  .bed {
    border: 1px solid var(--ink-faint);
    border-radius: 2px;
    padding: var(--space-6) var(--space-8);
    background: var(--ground);
    transition: border-color var(--duration-base) var(--easing),
      box-shadow var(--duration-base) var(--easing);
  }

  .bed[data-tended] {
    border-color: var(--c-moss);
    box-shadow: 0 0 0 1px var(--c-moss);
  }

  /* hover fallback (also works without JS) */
  .bed:hover {
    border-color: var(--c-moss);
  }

  .bed-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-base);
    font-style: italic;
    margin-bottom: var(--space-6);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--ink-faint);
  }

  .bed-emoji {
    font-style: normal;
  }

  /* ── Bed item list ── */
  .bed-items {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2) var(--space-4);
    align-items: baseline;
  }

  .bed-term {
    color: var(--ink-muted);
    white-space: nowrap;
  }

  .bed-detail {
    font-size: var(--text-sm);
    line-height: 1.6;
    color: var(--ink);
  }

  .bed-detail a {
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: var(--ink-faint);
    transition: text-decoration-color var(--duration-fast) var(--easing);
  }

  .bed-detail a:hover {
    text-decoration-color: var(--ink);
  }

  /* ── Reduced motion: disable auto-cycle visual treatment ── */
  @media (prefers-reduced-motion: reduce) {
    .beds-can {
      transition: none;
    }
    .bed {
      transition: none;
    }
  }
</style>
```

- [ ] **Step 2: Run `pnpm astro check`**

```bash
pnpm astro check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/zones/Beds/TendedBeds.astro
git commit -m "feat: TendedBeds hero piece — watering can auto-cycle and hover tending"
```

---

### Task 2: `/beds/index.astro` page

**Files:**
- Create: `src/pages/beds/index.astro`

- [ ] **Step 1: Create `src/pages/beds/index.astro`**

```astro
---
import Garden from '@layouts/Garden.astro';
import TendedBeds from '../../components/zones/Beds/TendedBeds.astro';
---

<Garden
  title="The Beds — Gurden's Garden"
  description="Colophon, care protocols, and the commitments behind gurden.xyz."
>
  <div class="beds-wrap page-wrap">

    <header class="beds-header">
      <p class="label zone-emoji" aria-hidden="true">🛠</p>
      <h1>The Beds</h1>
      <p class="beds-intro">
        What this site is built with, how it's cared for, and the commitments
        that hold it to account.
      </p>
    </header>

    <section class="tended-section" aria-labelledby="tended-heading">
      <h2 id="tended-heading" class="label section-heading">Tended Beds</h2>
      <TendedBeds />
    </section>

  </div>
</Garden>

<style>
  .beds-wrap {
    padding-block: var(--space-16);
  }

  .beds-header {
    margin-bottom: var(--space-16);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .zone-emoji {
    font-size: var(--text-xl);
    margin-bottom: var(--space-3);
    display: block;
  }

  .beds-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .beds-intro {
    font-size: var(--text-md);
    line-height: 1.65;
    max-width: 560px;
  }

  .section-heading {
    display: block;
    margin-bottom: var(--space-8);
  }

  .tended-section {
    margin-bottom: var(--space-20);
  }
</style>
```

- [ ] **Step 2: Build check**

```bash
pnpm astro check
```

Expected: 0 errors.

- [ ] **Step 3: Start dev server and verify**

```bash
pnpm dev
```

Visit `http://localhost:4321/beds`. Expected:
- Page loads (200)
- "The Beds" h1 visible
- Watering can appears and starts cycling after 300ms
- Hovering a bed moves the can to it
- No JS errors in console

Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/pages/beds/index.astro
git commit -m "feat: /beds route with Tended Beds hero piece"
```

---

### Task 3: Route migration — `/colophon` → `/beds`

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/lib/zones.ts`
- Delete: `src/pages/colophon.astro`
- Modify: `lighthouserc.json`
- Modify: `e2e/pages.spec.ts`
- Modify: `e2e/accessibility.spec.ts`
- Modify: `e2e/map.spec.ts`

- [ ] **Step 1: Add `/colophon` redirect in `astro.config.mjs`**

```diff
  redirects: {
    '/work': '/polyculture',
    '/work/[slug]': '/polyculture/[slug]',
    '/about': '/compost',
+   '/colophon': '/beds',
  },
```

Full file after edit:
```javascript
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  site: 'https://gurden.xyz',
  redirects: {
    '/work': '/polyculture',
    '/work/[slug]': '/polyculture/[slug]',
    '/about': '/compost',
    '/colophon': '/beds',
  },
});
```

- [ ] **Step 2: Update beds href in `src/lib/zones.ts`**

```diff
-    href: '/colophon',
+    href: '/beds',
```

The full beds zone entry after the edit:
```typescript
{
  id: 'beds',
  emoji: '🛠',
  name: 'The Beds',
  shortDesc: 'Care',
  longDesc: 'Colophon & care',
  href: '/beds',
},
```

- [ ] **Step 3: Delete `src/pages/colophon.astro`**

```bash
rm src/pages/colophon.astro
```

- [ ] **Step 4: Update `lighthouserc.json`**

Replace `"http://localhost:4321/colophon"` with `"http://localhost:4321/beds"`:

```json
"url": [
  "http://localhost:4321/",
  "http://localhost:4321/polyculture",
  "http://localhost:4321/compost",
  "http://localhost:4321/beds"
]
```

- [ ] **Step 5: Update `e2e/pages.spec.ts`**

Replace the entire `Colophon page` describe block with:

```typescript
test.describe('Colophon → Beds redirect', () => {
  test('/colophon redirects to /beds', async ({ page }) => {
    await page.goto('/colophon');
    expect(page.url()).toContain('/beds');
  });
});

test.describe('Beds page', () => {
  test('loads with 200', async ({ page }) => {
    const r = await page.goto('/beds');
    expect(r?.status()).toBe(200);
  });

  test('shows stack bed content', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.getByText(/Astro/i).first()).toBeVisible();
    await expect(page.getByText(/Netlify/i).first()).toBeVisible();
  });

  test('shows Mazius typeface credit', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.getByText(/Mazius/i).first()).toBeVisible();
  });
});
```

- [ ] **Step 6: Update `e2e/accessibility.spec.ts`**

Two occurrences of `a[href="/colophon"]` (lines ~85 and ~124). Replace both with `a[href="/beds"]`.

Line ~85:
```diff
-    await expect(overlay.locator('a[href="/colophon"]')).toBeAttached();
+    await expect(overlay.locator('a[href="/beds"]')).toBeAttached();
```

Line ~124:
```diff
-    await expect(overlay.locator('a[href="/colophon"]')).toBeAttached();
+    await expect(overlay.locator('a[href="/beds"]')).toBeAttached();
```

- [ ] **Step 7: Update `e2e/map.spec.ts`**

One occurrence of `a[href="/colophon"]` for the beds zone:
```diff
-    await expect(map.locator('[data-zone="beds"] a[href="/colophon"]')).toBeAttached();
+    await expect(map.locator('[data-zone="beds"] a[href="/beds"]')).toBeAttached();
```

- [ ] **Step 8: Build and run E2E smoke tests**

```bash
pnpm build
pnpm playwright test e2e/pages.spec.ts e2e/accessibility.spec.ts e2e/map.spec.ts --reporter=line
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add astro.config.mjs src/lib/zones.ts lighthouserc.json e2e/pages.spec.ts e2e/accessibility.spec.ts e2e/map.spec.ts
git rm src/pages/colophon.astro
git commit -m "feat: redirect /colophon → /beds; retire colophon.astro; update zone link + tests"
```

---

### Task 4: E2E tests — Beds zone

**Files:**
- Create: `e2e/beds.spec.ts`

- [ ] **Step 1: Create `e2e/beds.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Beds page — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.getByRole('heading', { name: /The Beds/i, level: 1 })).toBeVisible();
  });

  test('shows intro text', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.getByText(/care protocols/i).first()).toBeVisible();
  });

  test('renders 5 bed articles', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.locator('[data-bed]')).toHaveCount(5);
  });

  test('shows stack bed with Astro and Netlify', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.getByText(/Astro/i).first()).toBeVisible();
    await expect(page.getByText(/Netlify/i).first()).toBeVisible();
  });

  test('shows typeface credit (Mazius)', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.getByText(/Mazius/i).first()).toBeVisible();
  });

  test('shows source repository link', async ({ page }) => {
    await page.goto('/beds');
    const repoLink = page.getByRole('link', { name: /gurden\/gurden\.xyz/i });
    await expect(repoLink).toBeVisible();
    await expect(repoLink).toHaveAttribute('href', 'https://github.com/gurden/gurden.xyz');
  });
});

test.describe('Beds page — watering can', () => {
  test('watering can element is in DOM', async ({ page }) => {
    await page.goto('/beds');
    await expect(page.locator('[data-beds-can]')).toBeAttached();
  });

  test('watering can becomes visible after mount', async ({ page }) => {
    await page.goto('/beds');
    await page.waitForTimeout(400);
    const opacity = await page.locator('[data-beds-can]').evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0);
  });

  test('hovering a bed sets data-tended attribute', async ({ page }) => {
    await page.goto('/beds');
    await page.waitForTimeout(300);
    const accessibilityBed = page.locator('[data-bed="accessibility"]');
    await accessibilityBed.hover();
    await page.waitForTimeout(100);
    await expect(accessibilityBed).toHaveAttribute('data-tended', '');
  });

  test('hovering a different bed clears previous data-tended', async ({ page }) => {
    await page.goto('/beds');
    await page.waitForTimeout(300);
    await page.locator('[data-bed="stack"]').hover();
    await page.waitForTimeout(100);
    await page.locator('[data-bed="performance"]').hover();
    await page.waitForTimeout(100);
    await expect(page.locator('[data-bed="stack"]')).not.toHaveAttribute('data-tended', '');
    await expect(page.locator('[data-bed="performance"]')).toHaveAttribute('data-tended', '');
  });
});

test.describe('Beds page — reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('all 5 beds visible with reduced motion', async ({ page }) => {
    await page.goto('/beds');
    for (const id of ['stack', 'accessibility', 'performance', 'source', 'sustainability']) {
      await expect(page.locator(`[data-bed="${id}"]`)).toBeVisible();
    }
  });

  test('watering can does not auto-cycle in reduced motion (opacity stable)', async ({ page }) => {
    await page.goto('/beds');
    await page.waitForTimeout(200);
    // With reduced motion, can remains at opacity 0 (no auto-cycle reveals it)
    // OR it's opacity 1 but transform doesn't change — either is acceptable.
    // Test that no data-tended is set after 3 seconds (no auto-cycle fired)
    await page.waitForTimeout(3000);
    const tendedCount = await page.locator('[data-tended]').count();
    expect(tendedCount).toBe(0);
  });
});

test.describe('Beds page — keyboard navigation', () => {
  test('repository link is keyboard-reachable', async ({ page }) => {
    await page.goto('/beds');
    const link = page.getByRole('link', { name: /gurden\/gurden\.xyz/i });
    await link.focus();
    await expect(link).toBeFocused();
  });
});

test.describe('Beds page — accessibility', () => {
  test('zero axe violations', async ({ page }) => {
    await page.goto('/beds');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Build and run tests**

```bash
pnpm build
pnpm playwright test e2e/beds.spec.ts --reporter=line
```

Expected: all 14 tests PASS. Fix any failures before committing.

**Common issues to watch for:**

- **`data-tended` not set on hover**: If the `mouseenter` listener hasn't fired in CI timing, increase the `waitForTimeout(100)` to `waitForTimeout(300)`.
- **Reduced-motion `data-tended` test flaky**: The test waits 3 seconds then asserts no `data-tended`. If the auto-cycle runs even in reduced-motion (bug in the JS), investigate the `if (rm) return` guard in `startCycle()`.
- **Axe violation on `role="list"` + `role="listitem"`**: If axe complains about `role="list"` on a div containing `<article role="listitem">`, either remove the list roles entirely (the grid is visually a list but semantically a group of articles) or change `<div role="list">` to `<ul>` and `<article role="listitem">` to `<li>`. The latter is cleaner: `<ul class="beds-grid">` with `<li class="bed-wrapper"><article class="bed" ...>`.
- **Axe `definition-list` violation**: The `<dl>` / `<dt>` / `<dd>` inside each bed must have `<dt>` and `<dd>` as direct children of `<dl>`. If Astro's JSX transpilation wraps them in a fragment, axe may flag this. Fix by removing the `<>...</>` wrapper and just returning the dt/dd directly from the map, or use `Fragment`.

- [ ] **Step 3: Run full suite to check regressions**

```bash
pnpm playwright test --reporter=line
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/beds.spec.ts
git commit -m "test: E2E + axe coverage for /beds zone"
```

---

### Task 5: Final sweep — Lighthouse CI + full verification

- [ ] **Step 1: Kill stale servers**

```bash
lsof -ti :4321 | xargs kill -9 2>/dev/null || true
lsof -ti :4322 | xargs kill -9 2>/dev/null || true
```

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: 13+ pages built (includes `/beds` route + `/colophon` redirect HTML), no errors.

- [ ] **Step 3: Run Lighthouse CI**

```bash
pnpm lhci autorun
```

Audits 4 URLs: `/`, `/polyculture`, `/compost`, `/beds`.

Expected (all 4 must pass):
- Performance ≥ 0.9 / Accessibility = 1.0
- LCP < 2500ms / TBT < 200ms
- JS < 80kb / CSS < 30kb

`/beds` should be the **lightest page** — no Canvas, no Motion One. JS should be under 6kb. If it exceeds budget, audit with `du -sh dist/_astro/*.js | sort -h`.

- [ ] **Step 4: Full test suite**

```bash
pnpm vitest run && pnpm playwright test --reporter=line
```

Expected: 61 Vitest + all Playwright pass.

- [ ] **Step 5: Update design spec status**

In `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md`, change line 4:

```diff
-**Status:** Phase 4 (Compost) complete; Phase 5 (Beds) next
+**Status:** Phase 5 (Beds) complete; Phase 6 (Hive) next
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-05-25-gurdens-garden-design.md
git commit -m "docs: mark Phase 5 (Beds) complete with Lighthouse + axe coverage"
```
