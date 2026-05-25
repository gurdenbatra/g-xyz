# Gurden's Garden — Phase 2: The Map

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current portfolio home page with an interactive CSS garden map; add a persistent MapToggle + MapOverlay navigation system; configure Astro 5 view transitions with a portal-shader skeleton.

**Architecture:** `index.astro` is completely replaced by a 6-zone CSS-grid garden map (no SVG complexity — organic feel comes from palette, animation, and typography). `MapToggle.astro` + `MapOverlay.astro` are added to `Garden.astro` so they persist across every route. Astro 5's `<ClientRouter />` enables the View Transitions API; `PortalShader.astro` installs CSS `::view-transition-*` keyframes for an organic radial-reveal wipe. The nav is stripped to logo-only; the map overlay is the navigation.

**Tech Stack:** Astro 5 (already installed), CSS Grid, CSS View Transitions API via `astro:transitions`, CSS custom-property animations, Playwright + axe-core for E2E/a11y.

---

## Background — what exists going in

- Branch: `main`, latest commit `7bc46e1`
- Phase 1 complete: `Garden.astro` layout, earth-rooted palette in `tokens.css`, `seasonal.css`, `CursorBee.astro`, `src/lib/bee.ts`, `src/lib/season.ts`
- `ogl` and `motion` installed but not yet used
- `pnpm test` → 30 Vitest unit tests (must stay green)
- `pnpm exec playwright test` → 74 E2E tests (must stay green)
- Path aliases: `@components/*` → `src/components/*`, `@layouts/*` → `src/layouts/*`
- Package manager: `pnpm`. Do not use `npm` or `yarn`.
- Cursor bee: `z-index: 50`, fixed, `pointer-events: none`
- Nav: `z-index: 10`, sticky top

## z-index budget

| Layer | z-index |
|---|---|
| page content | 0–1 |
| nav | 10 |
| cursor bee | 50 |
| map toggle button | 60 |
| map overlay | 70 |
| skip-link | 100 |

## File map

| Action | Path | Purpose |
|---|---|---|
| CREATE | `src/components/map/MapToggle.astro` | Fixed top-right button; opens/closes map overlay |
| CREATE | `src/components/map/MapOverlay.astro` | Full-screen zone-navigation dialog |
| CREATE | `src/components/transitions/PortalShader.astro` | Injects CSS `::view-transition-*` keyframes |
| CREATE | `e2e/map.spec.ts` | E2E tests for the new home map page |
| MODIFY | `src/layouts/Garden.astro` | Add ClientRouter, MapToggle, MapOverlay, PortalShader, interaction script |
| MODIFY | `src/pages/index.astro` | Complete replacement — CSS garden map |
| MODIFY | `src/components/Nav.astro` | Logo-only (remove zone links) |
| MODIFY | `e2e/accessibility.spec.ts` | Update nav tests + add portal/toggle/overlay tests |

---

### Task 1: Preflight + Astro View Transitions

**Goal:** Confirm the baseline is green, then enable Astro 5's `<ClientRouter />` so the View Transitions API is active across all page navigations.

**Files:**
- Modify: `src/layouts/Garden.astro`
- Modify: `e2e/accessibility.spec.ts`

- [ ] **Step 1: Verify baseline tests pass**

```bash
pnpm test
pnpm exec playwright test
```

Expected: 30 Vitest tests pass, 74 Playwright tests pass. Stop and fix if anything fails before proceeding.

- [ ] **Step 2: Write a navigation contract E2E test**

In `e2e/accessibility.spec.ts`, add this test inside the existing `'Garden layout accessibility'` describe block (after the last test):

```typescript
  test('navigation between pages completes without error', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/work"]');
    await expect(page).toHaveURL(/\/work/);
    await expect(page.locator('main#main-content')).toBeVisible();
  });
```

- [ ] **Step 3: Run that test — expect PASS (baseline contract)**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "navigation between pages"
```

Expected: PASS. This test locks in the contract we need to keep working after adding `ClientRouter`.

- [ ] **Step 4: Add ClientRouter to Garden.astro**

Read `src/layouts/Garden.astro` first. Add the import and the component:

In the frontmatter (top of the `---` block), add:
```typescript
import { ClientRouter } from 'astro:transitions';
```

In the `<head>` section, add `<ClientRouter />` after the `<title>` and font preload links:
```astro
    <ClientRouter />
```

The final `<head>` block should look like:
```astro
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <meta name="generator" content={Astro.generator} />
    <title>{pageTitle}</title>
    <link rel="preload" href="/fonts/MaziusDisplay-Regular.woff2"     as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/MaziusDisplay-Extraitalic.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/NectoMono-Regular.woff2"         as="font" type="font/woff2" crossorigin />
    <ClientRouter />
  </head>
```

- [ ] **Step 5: Run full E2E suite — expect all pass**

```bash
pnpm exec playwright test
```

Expected: All 74 tests pass. `ClientRouter` should not break existing navigation.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Garden.astro e2e/accessibility.spec.ts
git commit -m "feat: add ClientRouter (view transitions) to Garden layout"
```

---

### Task 2: MapToggle component

**Goal:** A small fixed button in the top-right corner of the viewport that will open/close the map overlay. It persists on every route via `Garden.astro`. It does not do anything interactive yet (wired in Task 4).

**Files:**
- Create: `src/components/map/MapToggle.astro`
- Modify: `src/layouts/Garden.astro`
- Modify: `e2e/accessibility.spec.ts`

- [ ] **Step 1: Write failing E2E tests**

Add this describe block at the end of `e2e/accessibility.spec.ts`:

```typescript
test.describe('MapToggle', () => {
  test('map toggle button is present on every page', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#map-toggle');
    await expect(toggle).toBeAttached();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-controls', 'map-overlay');
  });

  test('map toggle has accessible label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#map-toggle')).toHaveAttribute('aria-label', 'Open garden map');
  });

  test('map toggle is present on non-home pages too', async ({ page }) => {
    await page.goto('/work');
    await expect(page.locator('#map-toggle')).toBeAttached();
  });
});
```

- [ ] **Step 2: Run new tests — expect FAIL**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "MapToggle"
```

Expected: FAIL — `#map-toggle` does not exist yet.

- [ ] **Step 3: Create `src/components/map/MapToggle.astro`**

```astro
---
---
<button
  id="map-toggle"
  class="map-toggle"
  type="button"
  aria-expanded="false"
  aria-controls="map-overlay"
  aria-label="Open garden map"
>
  <svg
    class="map-toggle-icon"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
    <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
    <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
    <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
  </svg>
  <span class="map-toggle-label">Map</span>
</button>

<style>
  .map-toggle {
    position: fixed;
    top: var(--space-4);
    right: var(--space-6);
    z-index: 60;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--ground);
    border: 1px solid var(--ink-faint);
    color: var(--ink-muted);
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      color var(--duration-fast) var(--easing),
      border-color var(--duration-fast) var(--easing),
      background var(--duration-fast) var(--easing);
  }

  .map-toggle:hover {
    color: var(--ink);
    border-color: var(--ink-muted);
  }

  .map-toggle[aria-expanded='true'] {
    background: var(--ink);
    color: var(--ground);
    border-color: var(--ink);
  }

  @media (max-width: 600px) {
    .map-toggle-label {
      display: none;
    }

    .map-toggle {
      padding: var(--space-2) var(--space-3);
    }
  }
</style>
```

- [ ] **Step 4: Add MapToggle to Garden.astro**

In the frontmatter imports, add:
```typescript
import MapToggle from '../components/map/MapToggle.astro';
```

In the `<body>`, add `<MapToggle />` just before `<CursorBee />`:
```astro
    <Footer />
    <MapToggle />
    <CursorBee />
  </body>
```

- [ ] **Step 5: Run MapToggle tests — expect PASS**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "MapToggle"
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Run full suite**

```bash
pnpm exec playwright test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/map/MapToggle.astro src/layouts/Garden.astro e2e/accessibility.spec.ts
git commit -m "feat: MapToggle — fixed map button present on every route"
```

---

### Task 3: MapOverlay component (static structure)

**Goal:** A full-screen dialog listing all 6 garden zones. Hidden by default (`aria-hidden="true"`). The JS wiring (open/close) is added in Task 4. Three zones have live routes (`/work`, `/about`, `/colophon`); three are "coming soon".

**Files:**
- Create: `src/components/map/MapOverlay.astro`
- Modify: `src/layouts/Garden.astro`
- Modify: `e2e/accessibility.spec.ts`

- [ ] **Step 1: Write failing E2E tests**

Add a new describe block at the end of `e2e/accessibility.spec.ts`:

```typescript
test.describe('MapOverlay', () => {
  test('overlay element is in the DOM with correct ARIA attributes', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#map-overlay');
    await expect(overlay).toBeAttached();
    await expect(overlay).toHaveAttribute('role', 'dialog');
    await expect(overlay).toHaveAttribute('aria-modal', 'true');
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  test('overlay contains links for the three active zones', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#map-overlay');
    await expect(overlay.locator('a[href="/work"]')).toBeAttached();
    await expect(overlay.locator('a[href="/about"]')).toBeAttached();
    await expect(overlay.locator('a[href="/colophon"]')).toBeAttached();
  });

  test('overlay contains entries for all 6 zones', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#map-overlay');
    await expect(overlay.locator('[data-zone="polyculture"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="canopy"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="hive"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="compost"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="mycelium"]')).toBeAttached();
    await expect(overlay.locator('[data-zone="beds"]')).toBeAttached();
  });
});
```

- [ ] **Step 2: Run new tests — expect FAIL**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "MapOverlay"
```

Expected: FAIL — `#map-overlay` does not exist yet.

- [ ] **Step 3: Create `src/components/map/MapOverlay.astro`**

```astro
---
const zones = [
  {
    id: 'polyculture',
    emoji: '🌿',
    name: 'The Polyculture',
    desc: 'Work & projects',
    href: '/work',
  },
  {
    id: 'canopy',
    emoji: '🌳',
    name: 'The Canopy',
    desc: 'Art, poetry & essays',
    href: null,
  },
  {
    id: 'hive',
    emoji: '🐝',
    name: 'The Hive',
    desc: 'Now & contact',
    href: null,
  },
  {
    id: 'compost',
    emoji: '🪱',
    name: 'The Compost',
    desc: 'Story & origins',
    href: '/about',
  },
  {
    id: 'mycelium',
    emoji: '🍄',
    name: 'The Mycelium',
    desc: 'Collaborators & network',
    href: null,
  },
  {
    id: 'beds',
    emoji: '🛠',
    name: 'The Beds',
    desc: 'Colophon & care',
    href: '/colophon',
  },
] as const;
---

<div
  id="map-overlay"
  class="map-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Garden map"
  aria-hidden="true"
>
  <!-- Backdrop: click closes the overlay (wired in Task 4) -->
  <button
    class="map-overlay-backdrop"
    aria-label="Close garden map"
    tabindex="-1"
    type="button"
  ></button>

  <div class="map-overlay-panel">
    <nav aria-label="Garden zones">
      <ul class="zone-list" role="list">
        {zones.map((zone) => (
          <li class="zone-item" data-zone={zone.id}>
            {zone.href ? (
              <a href={zone.href} class="zone-link">
                <span class="zone-emoji" aria-hidden="true">{zone.emoji}</span>
                <span class="zone-text">
                  <span class="zone-name">{zone.name}</span>
                  <span class="zone-desc">{zone.desc}</span>
                </span>
              </a>
            ) : (
              <span class="zone-link zone-link--soon">
                <span class="zone-emoji" aria-hidden="true">{zone.emoji}</span>
                <span class="zone-text">
                  <span class="zone-name">{zone.name}</span>
                  <span class="zone-desc">
                    {zone.desc}
                    <span class="zone-soon"> · soon</span>
                  </span>
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  </div>
</div>

<style>
  .map-overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    visibility: hidden;
    opacity: 0;
    /* Delay visibility so it vanishes after the opacity fade */
    transition:
      opacity var(--duration-base) var(--easing),
      visibility 0s linear var(--duration-base);
  }

  .map-overlay[aria-hidden='false'] {
    visibility: visible;
    opacity: 1;
    transition:
      opacity var(--duration-base) var(--easing),
      visibility 0s;
  }

  .map-overlay-backdrop {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--ink) 55%, transparent);
    border: none;
    cursor: pointer;
  }

  .map-overlay-panel {
    position: relative;
    z-index: 1;
    width: min(90vw, 560px);
    background: var(--ground);
    padding: var(--space-10) var(--space-10);
  }

  .zone-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .zone-link {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-4);
    border: 1px solid var(--ink-faint);
    color: var(--ink);
    text-decoration: none;
    transition:
      border-color var(--duration-fast) var(--easing),
      background var(--duration-fast) var(--easing);
    cursor: pointer;
  }

  .zone-link:not(.zone-link--soon):hover {
    border-color: var(--ink-muted);
    background: color-mix(in srgb, var(--ink) 4%, var(--ground));
  }

  .zone-link--soon {
    opacity: 0.4;
    cursor: default;
  }

  .zone-emoji {
    font-size: 1.5rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .zone-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .zone-name {
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: var(--text-base);
    line-height: 1.2;
  }

  .zone-desc {
    font-family: 'NectoMono', monospace;
    font-size: var(--text-xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  .zone-soon {
    color: var(--ink-faint);
  }

  @media (max-width: 500px) {
    .zone-list {
      grid-template-columns: 1fr;
    }

    .map-overlay-panel {
      padding: var(--space-8) var(--space-6);
    }
  }
</style>
```

- [ ] **Step 4: Add MapOverlay to Garden.astro**

In the frontmatter, add:
```typescript
import MapOverlay from '../components/map/MapOverlay.astro';
```

In the `<body>`, add `<MapOverlay />` just before `<MapToggle />`:
```astro
    <Footer />
    <MapOverlay />
    <MapToggle />
    <CursorBee />
  </body>
```

- [ ] **Step 5: Run MapOverlay tests — expect PASS**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "MapOverlay"
```

Expected: All 3 structural tests PASS.

- [ ] **Step 6: Run full suite**

```bash
pnpm exec playwright test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/map/MapOverlay.astro src/layouts/Garden.astro e2e/accessibility.spec.ts
git commit -m "feat: MapOverlay — full-screen zone navigation dialog (static)"
```

---

### Task 4: MapToggle ↔ MapOverlay interaction

**Goal:** Wire the toggle button to open/close the overlay. Handle Esc key. Manage focus (move into overlay on open; return to toggle on close). Update `aria-label` dynamically. Re-initialise after Astro view transitions swap the DOM.

**Files:**
- Modify: `src/layouts/Garden.astro`
- Modify: `e2e/accessibility.spec.ts`

- [ ] **Step 1: Write failing interaction E2E tests**

Add these tests inside the existing `'MapOverlay'` describe block in `e2e/accessibility.spec.ts` (after the three structural tests from Task 3):

```typescript
  test('clicking map toggle opens the overlay', async ({ page }) => {
    await page.goto('/');
    await page.locator('#map-toggle').click();
    await expect(page.locator('#map-overlay')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#map-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  test('toggle aria-label changes to "Close" when overlay is open', async ({ page }) => {
    await page.goto('/');
    await page.locator('#map-toggle').click();
    await expect(page.locator('#map-toggle')).toHaveAttribute('aria-label', 'Close garden map');
  });

  test('pressing Escape closes the overlay', async ({ page }) => {
    await page.goto('/');
    await page.locator('#map-toggle').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#map-overlay')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#map-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  test('clicking the backdrop closes the overlay', async ({ page }) => {
    await page.goto('/');
    await page.locator('#map-toggle').click();
    await page.locator('.map-overlay-backdrop').click();
    await expect(page.locator('#map-overlay')).toHaveAttribute('aria-hidden', 'true');
  });

  test('map toggle stays functional after view-transition navigation', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/work"]');
    await expect(page).toHaveURL(/\/work/);
    await page.locator('#map-toggle').click();
    await expect(page.locator('#map-overlay')).toHaveAttribute('aria-hidden', 'false');
  });
```

- [ ] **Step 2: Run new tests — expect FAIL**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "MapOverlay"
```

Expected: The 5 new interaction tests FAIL (no JS wires the toggle yet). The 3 structural tests from Task 3 still pass.

- [ ] **Step 3: Add interaction script to Garden.astro**

Add a `<script>` block just before the closing `</body>` tag in `Garden.astro`:

```astro
<script>
  function initMap() {
    const toggle = document.getElementById('map-toggle') as HTMLButtonElement | null;
    const overlay = document.getElementById('map-overlay') as HTMLElement | null;
    const backdrop = overlay?.querySelector<HTMLButtonElement>('.map-overlay-backdrop');
    if (!toggle || !overlay) return;

    function openMap() {
      overlay!.setAttribute('aria-hidden', 'false');
      toggle!.setAttribute('aria-expanded', 'true');
      toggle!.setAttribute('aria-label', 'Close garden map');
      const firstFocusable = overlay!.querySelector<HTMLElement>(
        'a[href], button:not(.map-overlay-backdrop)',
      );
      firstFocusable?.focus();
    }

    function closeMap() {
      overlay!.setAttribute('aria-hidden', 'true');
      toggle!.setAttribute('aria-expanded', 'false');
      toggle!.setAttribute('aria-label', 'Open garden map');
      toggle!.focus();
    }

    toggle.addEventListener('click', () => {
      toggle.getAttribute('aria-expanded') === 'true' ? closeMap() : openMap();
    });

    backdrop?.addEventListener('click', closeMap);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay!.getAttribute('aria-hidden') === 'false') {
        closeMap();
      }
    });
  }

  // Run on first load AND after every Astro view-transition (DOM swap)
  document.addEventListener('astro:page-load', initMap);
</script>
```

- [ ] **Step 4: Run interaction tests — expect PASS**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "MapOverlay"
```

Expected: All 8 MapOverlay tests pass (3 structural + 5 interaction).

- [ ] **Step 5: Run full suite**

```bash
pnpm exec playwright test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Garden.astro e2e/accessibility.spec.ts
git commit -m "feat: wire MapToggle ↔ MapOverlay — open/close, Esc, focus management"
```

---

### Task 5: PortalShader skeleton

**Goal:** Inject CSS `::view-transition-*` keyframes that produce an organic radial-reveal ("portal") wipe when navigating between routes. Falls back to a plain crossfade when `prefers-reduced-motion: reduce` is active.

**Files:**
- Create: `src/components/transitions/PortalShader.astro`
- Modify: `src/layouts/Garden.astro`
- Modify: `e2e/accessibility.spec.ts`

- [ ] **Step 1: Write failing E2E test**

Add this test inside the `'Garden layout accessibility'` describe block in `e2e/accessibility.spec.ts`:

```typescript
  test('navigation still completes after PortalShader is added', async ({ page }) => {
    await page.goto('/work');
    await page.goto('/');
    await expect(page.locator('main#main-content')).toBeVisible();
  });
```

This is a regression guard: if PortalShader breaks navigation, this will fail.

- [ ] **Step 2: Run test — expect PASS (establishes baseline)**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "after PortalShader"
```

Expected: PASS (navigation works before PortalShader exists; we lock this in now).

- [ ] **Step 3: Create `src/components/transitions/PortalShader.astro`**

This component renders no visible markup — it only injects global CSS keyframes via `<style is:global>`.

```astro
---
---
<style is:global>
  /*
   * View-transition portal reveal: old page contracts to a point;
   * new page expands from the same point. Clip-path origin defaults
   * to centre; future phases can set --vt-origin-x/y from click coords.
   */
  @keyframes portal-contract {
    to {
      clip-path: circle(0% at var(--vt-origin-x, 50%) var(--vt-origin-y, 50%));
      opacity: 0;
    }
  }

  @keyframes portal-reveal {
    from {
      clip-path: circle(0% at var(--vt-origin-x, 50%) var(--vt-origin-y, 50%));
      opacity: 0;
    }
    to {
      clip-path: circle(150% at var(--vt-origin-x, 50%) var(--vt-origin-y, 50%));
      opacity: 1;
    }
  }

  @keyframes portal-fade-out {
    to { opacity: 0; }
  }

  @keyframes portal-fade-in {
    from { opacity: 0; }
  }

  ::view-transition-old(root) {
    animation: 260ms ease-in portal-contract;
  }

  ::view-transition-new(root) {
    animation: 320ms ease-out portal-reveal;
  }

  @media (prefers-reduced-motion: reduce) {
    ::view-transition-old(root) {
      animation: 120ms ease portal-fade-out;
    }

    ::view-transition-new(root) {
      animation: 120ms ease portal-fade-in;
    }
  }
</style>
```

- [ ] **Step 4: Add PortalShader to Garden.astro head**

In the frontmatter, add:
```typescript
import PortalShader from '../components/transitions/PortalShader.astro';
```

In the `<head>` block, add `<PortalShader />` immediately after `<ClientRouter />`:
```astro
    <ClientRouter />
    <PortalShader />
```

- [ ] **Step 5: Run regression test — expect PASS**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "after PortalShader"
```

Expected: PASS.

- [ ] **Step 6: Run full suite**

```bash
pnpm exec playwright test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/transitions/PortalShader.astro src/layouts/Garden.astro e2e/accessibility.spec.ts
git commit -m "feat: PortalShader skeleton — CSS view-transition portal-reveal keyframes"
```

---

### Task 6: New index.astro — CSS Garden Map

**Goal:** Replace the current home page (hero tagline cycler + projects list + WebGL portal) with a CSS-grid garden map showing all 6 zones. Three zones are clickable links; three are "coming soon" placeholders. Zones breathe with staggered CSS animations (disabled under `prefers-reduced-motion`).

**Files:**
- Modify: `src/pages/index.astro` (complete replacement)
- Create: `e2e/map.spec.ts`

- [ ] **Step 1: Write failing E2E tests**

Create `e2e/map.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Garden map — home page', () => {
  test('home page renders the garden map section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.garden-map')).toBeAttached();
  });

  test('all 6 zone patches are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-zone="polyculture"]')).toBeAttached();
    await expect(page.locator('[data-zone="canopy"]')).toBeAttached();
    await expect(page.locator('[data-zone="hive"]')).toBeAttached();
    await expect(page.locator('[data-zone="compost"]')).toBeAttached();
    await expect(page.locator('[data-zone="mycelium"]')).toBeAttached();
    await expect(page.locator('[data-zone="beds"]')).toBeAttached();
  });

  test('active zones are keyboard-navigable links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-zone="polyculture"] a[href="/work"]')).toBeAttached();
    await expect(page.locator('[data-zone="compost"] a[href="/about"]')).toBeAttached();
    await expect(page.locator('[data-zone="beds"] a[href="/colophon"]')).toBeAttached();
  });

  test('inactive zones have no interactive link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-zone="canopy"] a')).not.toBeAttached();
    await expect(page.locator('[data-zone="hive"] a')).not.toBeAttached();
    await expect(page.locator('[data-zone="mycelium"] a')).not.toBeAttached();
  });

  test('zone breathing animation is suppressed under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const animName = await page.evaluate(() => {
      const el = document.querySelector('.zone-patch') as HTMLElement | null;
      return el ? getComputedStyle(el).animationName : null;
    });
    expect(animName).toBe('none');
  });

  test('home page passes axe accessibility audit', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm exec playwright test e2e/map.spec.ts
```

Expected: All 6 tests FAIL (old home page has none of these elements).

- [ ] **Step 3: Replace `src/pages/index.astro` entirely**

The old file has the hero tagline cycler, Marginalia bio, ProjectRow list, and WebGL art portal. All of that is removed here. It will migrate to zone pages in later phases.

Write `src/pages/index.astro` with this exact content:

```astro
---
import Garden from '@layouts/Garden.astro';

const zones = [
  {
    id: 'polyculture',
    emoji: '🌿',
    name: 'The Polyculture',
    desc: 'Work',
    href: '/work',
    color: 'var(--c-moss)',
    textColor: 'var(--c-paper)',
    delay: '0s',
  },
  {
    id: 'canopy',
    emoji: '🌳',
    name: 'The Canopy',
    desc: 'Art',
    href: null,
    color: 'var(--c-chartreuse)',
    textColor: 'var(--c-ink)',
    delay: '0.3s',
  },
  {
    id: 'hive',
    emoji: '🐝',
    name: 'The Hive',
    desc: 'Now',
    href: null,
    color: 'var(--c-ochre)',
    textColor: 'var(--c-ink)',
    delay: '0.6s',
  },
  {
    id: 'compost',
    emoji: '🪱',
    name: 'The Compost',
    desc: 'Story',
    href: '/about',
    color: 'var(--c-soil)',
    textColor: 'var(--c-paper)',
    delay: '0.15s',
  },
  {
    id: 'mycelium',
    emoji: '🍄',
    name: 'The Mycelium',
    desc: 'Network',
    href: null,
    color: 'var(--c-indigo)',
    textColor: 'var(--c-paper)',
    delay: '0.45s',
  },
  {
    id: 'beds',
    emoji: '🛠',
    name: 'The Beds',
    desc: 'Care',
    href: '/colophon',
    color: 'var(--ink-faint)',
    textColor: 'var(--c-ink)',
    delay: '0.75s',
  },
] as const;
---

<Garden title="Home">
  <section class="map-section page-wrap" aria-label="Garden map">
    <h1 class="map-heading label">Gurden's Garden</h1>
    <p class="map-subtitle">
      A garden of work, art, and connections. Choose your zone.
    </p>

    <div class="garden-map" role="list" aria-label="Garden zones">
      {zones.map((zone) => (
        <div
          class="zone-patch"
          data-zone={zone.id}
          style={`--zone-color: ${zone.color}; --zone-text: ${zone.textColor}; --zone-delay: ${zone.delay};`}
          role="listitem"
        >
          {zone.href ? (
            <a
              href={zone.href}
              class="zone-inner zone-inner--link"
              aria-label={`${zone.name} — ${zone.desc}`}
            >
              <span class="zone-emoji" aria-hidden="true">{zone.emoji}</span>
              <span class="zone-name">{zone.name}</span>
              <span class="zone-desc label">{zone.desc}</span>
            </a>
          ) : (
            <div class="zone-inner zone-inner--soon" aria-label={`${zone.name} — coming soon`}>
              <span class="zone-emoji" aria-hidden="true">{zone.emoji}</span>
              <span class="zone-name">{zone.name}</span>
              <span class="zone-desc label">{zone.desc}</span>
              <span class="zone-badge label">Soon</span>
            </div>
          )}
        </div>
      ))}
    </div>
  </section>
</Garden>

<style>
  /* ── MAP SECTION ── */
  .map-section {
    padding-block: var(--space-12) var(--space-16);
    min-height: calc(100dvh - 4rem);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .map-heading {
    display: block;
    color: var(--ink-muted);
  }

  .map-subtitle {
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: var(--text-lg);
    color: var(--ink-muted);
    max-width: 42ch;
    margin: 0;
  }

  /* ── GARDEN MAP GRID ── */
  .garden-map {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
    flex: 1;
  }

  /* ── ZONE PATCH ── */
  @keyframes breathe {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.015); }
  }

  .zone-patch {
    background: var(--zone-color);
    border-radius: 2px;
    animation: breathe 4s ease-in-out var(--zone-delay, 0s) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .zone-patch {
      animation-name: none;
    }
  }

  /* ── ZONE INNER ── */
  .zone-inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-8) var(--space-6);
    min-height: 200px;
    height: 100%;
    box-sizing: border-box;
    color: var(--zone-text);
    text-decoration: none;
  }

  .zone-inner--link {
    transition: filter var(--duration-fast) var(--easing);
  }

  .zone-inner--link:hover {
    filter: brightness(1.1);
  }

  .zone-inner--soon {
    opacity: 0.55;
    cursor: default;
  }

  /* ── ZONE TEXT ── */
  .zone-emoji {
    font-size: 2rem;
    line-height: 1;
    display: block;
  }

  .zone-name {
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: var(--text-xl);
    line-height: 1.1;
    display: block;
    margin-top: auto;
  }

  .zone-desc {
    color: var(--zone-text);
    opacity: 0.7;
    display: block;
  }

  .zone-badge {
    display: inline-block;
    border: 1px solid currentColor;
    padding: 2px 6px;
    font-size: 0.55rem;
    letter-spacing: 0.14em;
    opacity: 0.55;
    align-self: flex-start;
    margin-top: var(--space-1);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .garden-map {
      grid-template-columns: repeat(2, 1fr);
    }

    .zone-inner {
      min-height: 160px;
      padding: var(--space-6) var(--space-5);
    }

    .zone-name {
      font-size: var(--text-lg);
    }
  }

  @media (max-width: 480px) {
    .garden-map {
      grid-template-columns: 1fr;
    }

    .zone-inner {
      min-height: 0;
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      padding: var(--space-5) var(--space-5);
      gap: var(--space-3);
    }

    .zone-emoji {
      font-size: 1.5rem;
    }

    .zone-name {
      font-size: var(--text-base);
      margin-top: 0;
    }
  }
</style>
```

- [ ] **Step 4: Run map tests — expect PASS**

```bash
pnpm exec playwright test e2e/map.spec.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Run full suite — expect all pass (pages.spec.ts only tests /about and /colophon so it is unaffected)**

```bash
pnpm exec playwright test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro e2e/map.spec.ts
git commit -m "feat: new index.astro — CSS garden map with 6 zone patches"
```

---

### Task 7: Nav strip-down + E2E test updates

**Goal:** Remove the four zone links from Nav (Work / Art / Writing / About) — the map overlay is now the navigation. Update the nav accessibility tests to match the new logo-only nav structure. The logo link and the `aria-label="Main navigation"` stay.

**Files:**
- Modify: `src/components/Nav.astro`
- Modify: `e2e/accessibility.spec.ts`

- [ ] **Step 1: Write updated nav E2E tests first**

In `e2e/accessibility.spec.ts`, replace the existing `'Nav component'` describe block:

Old block to remove:
```typescript
test.describe('Nav component', () => {
  test('nav contains links to all main sections', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('a[href="/work"]')).toBeAttached();
    await expect(nav.locator('a[href="/art"]')).toBeAttached();
    await expect(nav.locator('a[href="/writing"]')).toBeAttached();
    await expect(nav.locator('a[href="/about"]')).toBeAttached();
  });

  test('nav logo links to home', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    const logoLink = nav.locator('a[href="/"]');
    await expect(logoLink).toBeAttached();
  });
});
```

New block to put in its place:
```typescript
test.describe('Nav component', () => {
  test('nav contains the logo link', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('a[href="/"]')).toBeAttached();
  });

  test('nav does not contain old zone links (navigation is via map overlay)', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('a[href="/work"]')).not.toBeAttached();
    await expect(nav.locator('a[href="/about"]')).not.toBeAttached();
  });

  test('active zones are reachable via the map overlay', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#map-overlay');
    await expect(overlay.locator('a[href="/work"]')).toBeAttached();
    await expect(overlay.locator('a[href="/about"]')).toBeAttached();
    await expect(overlay.locator('a[href="/colophon"]')).toBeAttached();
  });
});
```

- [ ] **Step 2: Run updated nav tests — expect FAIL (nav still has the old links)**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "Nav component"
```

Expected: The "does not contain old zone links" test FAILS because the nav still has them.

- [ ] **Step 3: Update Nav.astro — logo only**

Read `src/components/Nav.astro`. Replace the entire file with:

```astro
---
---

<nav aria-label="Main navigation">
  <div class="nav-inner page-wrap">
    <a href="/" class="nav-logo" aria-label="Gurden's Garden — home">
      gurden.xyz
    </a>
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
    align-items: center;
    padding-block: var(--space-4);
  }

  .nav-logo {
    font-family: 'MaziusDisplay', serif;
    font-style: italic;
    font-size: var(--text-base);
    color: var(--ink);
    text-decoration: none;
    line-height: 1;
    transition: color var(--duration-fast) var(--easing);
  }

  .nav-logo:hover {
    color: var(--ink-muted);
  }
</style>
```

- [ ] **Step 4: Run nav tests — expect PASS**

```bash
pnpm exec playwright test e2e/accessibility.spec.ts --grep "Nav component"
```

Expected: All 3 nav tests PASS.

- [ ] **Step 5: Run full suite**

```bash
pnpm exec playwright test
```

Expected: All tests pass.

- [ ] **Step 6: Run unit tests**

```bash
pnpm test
```

Expected: 30 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/Nav.astro e2e/accessibility.spec.ts
git commit -m "feat: nav strip-down — logo only, map overlay is the navigation"
```

---

### Task 8: Final sweep — Lighthouse + accessibility audit

**Goal:** Run the full quality suite. Fix any regressions. Verify Lighthouse performance budgets still pass on the new home page.

**Files:**
- Modify: any file that needs fixing based on audit results

- [ ] **Step 1: Run full E2E suite**

```bash
pnpm exec playwright test
```

Expected: All tests pass. If any fail, fix them before proceeding.

- [ ] **Step 2: Run unit tests**

```bash
pnpm test
```

Expected: 30 tests pass.

- [ ] **Step 3: Run Lighthouse CI**

```bash
pnpm lhci
```

This runs `pnpm build && lhci autorun` against the four URLs in `lighthouserc.json` (`/`, `/work`, `/about`, `/colophon`).

Expected: All performance budgets pass:
- LCP < 2.5s
- TBT < 200ms
- JS < 80kb
- CSS < 30kb
- Zero assertion failures

The new home page has no JavaScript (just CSS animations + the map interaction script in Garden.astro), so it should score very well.

If any budget fails: check which metric and which page. Common causes:
- JS budget exceeded: check if any large script was accidentally inlined
- CSS budget exceeded: check if the new component styles pushed total CSS over 30kb (unlikely — the new styles are small)

- [ ] **Step 4: Verify axe audit on the home page**

The `map.spec.ts` already runs axe. Confirm it passed:

```bash
pnpm exec playwright test e2e/map.spec.ts --grep "axe"
```

Expected: PASS, zero violations.

- [ ] **Step 5: Build and verify**

```bash
pnpm build
```

Expected: Build completes with no errors. Check that these files are in `dist/`:
- `dist/index.html` (new garden map)
- `dist/work/index.html` (unchanged)
- `dist/about/index.html` (unchanged)
- `dist/colophon/index.html` (unchanged)

- [ ] **Step 6: Commit if any fixes were needed**

If steps 1–5 required any file changes:

```bash
git add -p
git commit -m "fix: Phase 2 sweep — <describe what was fixed>"
```

If no changes were needed, skip this step.

- [ ] **Step 7: Mark Phase 2 complete in the design spec**

Read `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md`. Update the Status line at the top from:

```
**Status:** Phase 1 (Foundation) complete; Phase 2 (The Map) next
```

to:

```
**Status:** Phase 2 (The Map) complete; Phase 3 (Polyculture) next
```

```bash
git add docs/superpowers/specs/2026-05-25-gurdens-garden-design.md
git commit -m "docs: mark Phase 2 complete in design spec"
```
