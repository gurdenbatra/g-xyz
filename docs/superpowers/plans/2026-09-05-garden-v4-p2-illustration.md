# Garden v4 — Phase 2 (Illustration Overhaul) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`. **This is a VISUAL craft phase — execute INLINE with live browser preview so each glyph is seen and tuned, not transcribed blind.**

**Goal:** Replace the five homepage zone glyphs' SVG-silhouette-plus-clipped-ASCII hybrid with sharp, crisp-geometric PURE ASCII (box-drawing + shade blocks), rendered in `<pre>`.

**Architecture:** `ZoneGlyph.astro` becomes pure static markup: one `<pre aria-hidden="true">` of hand-authored crisp ASCII per zone, palette-colored, `white-space: pre`. The `scale` prop (prime/secondary/base) now drives `font-size` instead of SVG width. Labels, hover nudge, and reduced-motion behavior are unchanged. No SVG, no clipPath, no `<text>`.

**Tech Stack:** Astro 5, monospace `<pre>` (NectoMono), scoped CSS, Playwright, Vitest, Lighthouse CI, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-05-garden-v4-range-and-craft-design.md`

## Global Constraints

- SSG / no-JS; glyphs are static markup, `aria-hidden="true"`; the always-visible `.zone-label` carries the accessible name — unchanged.
- `prefers-reduced-motion`: hover transform stays disabled (unchanged rule).
- **Character safety:** use ONLY box-drawing (U+2500–257F), block elements (U+2580–259F), and printable ASCII — these render in NectoMono. Any char that shows as a tofu box in preview must be swapped for a supported one. No emoji/dingbats.
- Keep axe zero-violations day + night; Lighthouse budgets green; full unit + E2E suite green (chromium + webkit).
- Before any playwright run: `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`.
- Phase 3 (WebGL shader + bee↔title) is a SEPARATE plan — not here.

---

## Task 0: Preflight

- [ ] `git status --short` → clean; `pnpm test` → 151 pass; `pnpm exec astro check` → 0/0/0.
- [ ] `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → pass (baseline: SVG glyph tests currently green).
- [ ] Start the preview (`preview_start` / `pnpm dev`); confirm `/` renders.

---

## Task 1: Rewrite ZoneGlyph.astro to five crisp-ASCII glyphs

**Files:** Modify (full rewrite): `src/components/home/ZoneGlyph.astro`.

- [ ] **Step 1: Replace the ENTIRE file** with the pure-ASCII version below. The five `<pre>` blocks are the STARTING art (crisp geometric, box-drawing + blocks); Step 2 tunes them against the live render. Each glyph is one dominant palette color for crispness.

```astro
---
import type { ZoneId } from '../../lib/zones';

interface Props {
  id: ZoneId;
  scale?: 'prime' | 'secondary' | 'base';
}

const { id, scale = 'base' } = Astro.props;

// Crisp-geometric ASCII glyphs — one per zone. Box-drawing + shade blocks only
// (NectoMono-safe). Purely decorative; the zone label carries the accessible name.
const GLYPHS: Record<ZoneId, string> = {
  flora: [
    '    ▟█▙   ◆   ',
    '   ▟███▙ ╱│╲  ',
    '  ▟█████▙ │   ',
    '     ┃┃   │   ',
    '  ═══┻┻═══┴═══',
  ].join('\n'),
  hive: [
    '   ▁▁▁▁▁▁▁   ',
    ' ╱█████████╲ ',
    '▕ ═══════○═ ▏',
    '▕ ═════════ ▏',
    ' ▔▔▔▔▔┻▔▔▔▔▔ ',
  ].join('\n'),
  mulch: [
    '   .  ╭─╮   . ',
    '  ╭─╮ │ │  .  ',
    '  │ │ │ │     ',
    ' ─┴─┴─┴─┴────',
    ' ░▒░.▒░▒.░▒░ ',
  ].join('\n'),
  roots: [
    '      ╷       ',
    ' ═════┻═════ ',
    '      │       ',
    '    ╱─┼─╲     ',
    '   ╱  │  ╲    ',
    ' ░▒░░▒│▒░░▒░ ',
  ].join('\n'),
  castings: [
    '   ▂▄▆█▆▄▂    ',
    '  ▟███████▙   ',
    ' ▐░▒░▒░▒░▒▌  ',
    '  ~~~~~~~~   ',
  ].join('\n'),
};
---

<span class="zone-glyph" data-scale={scale} aria-hidden="true"><pre class:list={['zone-ascii', `zone-ascii--${id}`]}>{GLYPHS[id]}</pre></span>

<style>
  .zone-glyph { display: block; }

  .zone-ascii {
    margin: 0;
    font-family: var(--font-mono);
    line-height: 1.02;
    white-space: pre;
    text-align: left;
    font-size: 9px;
  }
  .zone-glyph[data-scale='secondary'] .zone-ascii { font-size: 11px; }
  .zone-glyph[data-scale='prime']     .zone-ascii { font-size: 13px; }

  @media (min-width: 768px) {
    .zone-ascii { font-size: 12px; }
    .zone-glyph[data-scale='secondary'] .zone-ascii { font-size: 15px; }
    .zone-glyph[data-scale='prime']     .zone-ascii { font-size: 19px; }
  }

  /* One signature palette colour per zone — crisp, adapts to day/night. */
  .zone-ascii--flora    { color: var(--c-moss); }
  .zone-ascii--hive     { color: var(--c-ochre); }
  .zone-ascii--mulch    { color: var(--c-soil); }
  .zone-ascii--roots    { color: var(--c-soil); }
  .zone-ascii--castings { color: var(--c-soil); }
</style>
```

(Note: the `<span>` and `<pre>` open/close stay on one line so no stray leading newline enters the `<pre>`. `class:list` is Astro's array-class helper.)

- [ ] **Step 2: Preview + tune (the core craft step).** Reload `/` at 1280×900. For EACH glyph check: (a) no tofu boxes — if any char is a missing-glyph box, swap it for a supported box-drawing/block/ASCII char; (b) it reads as its metaphor (flora=tree+flower, hive=skep, mulch=fungi+litter, roots=taproot+strata, castings=heap+worm); (c) lines align (equal-width, centered look — pad lines with spaces if ragged); (d) it looks SHARP, not messy. Adjust the GLYPHS strings until each is clean. Also confirm prime (flora) reads largest, secondary (mulch) second.
- [ ] **Step 3: Verify** — `pnpm exec astro check` → 0/0/0 (the `Record<ZoneId, string>` is exhaustive, so a missing zone is a type error). `pnpm build` → succeeds.
- [ ] **Step 4: Commit** (after Task 2's test updates land, or commit component now and tests next — either order; the E2E covers both).

```bash
git add src/components/home/ZoneGlyph.astro
git commit -m "feat: redraw homepage glyphs as crisp pure-ASCII (drop SVG hybrid)"
```

---

## Task 2: Update the homepage glyph E2E (map.spec.ts)

The SVG-specific assertions no longer apply. `e2e/map.spec.ts` is the homepage suite.

**Files:** Modify `e2e/map.spec.ts`.

- [ ] **Step 1: Remove the SVG fill-regression test** — delete the entire test block `glyph filled shapes actually render (fill not stripped by base rule)` (it asserts `.zone-glyph .f-moss` computed fill — meaningless without SVG).

- [ ] **Step 2: Change the texture test to assert `<pre>` ASCII** — replace the `each glyph carries ASCII texture text` test with:

```ts
  test('each glyph renders non-empty crisp ASCII', async ({ page }) => {
    await page.goto('/');
    for (const id of ['flora', 'hive', 'mulch', 'roots', 'castings']) {
      const text = await page
        .locator(`#main-content a.zone-link[data-zone="${id}"] .zone-glyph pre.zone-ascii`)
        .first()
        .textContent();
      expect((text ?? '').trim().length, `zone ${id} should render ASCII`).toBeGreaterThan(0);
    }
  });
```

- [ ] **Step 3: Change the prime-size test to measure the `<pre>`** — the flora-is-larger test currently measures `.zone-glyph svg`. Replace that selector with `.zone-glyph pre.zone-ascii` and compare flora's bounding-box width to a base zone's (e.g. roots):

```ts
  test('flora glyph renders larger than a base-scale zone (prime focus)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const widthOf = async (id: string) =>
      (await page
        .locator(`#main-content a.zone-link[data-zone="${id}"] .zone-glyph pre.zone-ascii`)
        .first()
        .boundingBox())?.width ?? 0;
    expect(await widthOf('flora')).toBeGreaterThan(await widthOf('roots'));
  });
```

- [ ] **Step 4: Verify** — `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → all pass (ecological order, labels, no-emoji, axe, reduced-motion + the two rewritten glyph tests). Note: the existing "no emoji" test scans homepage text — ensure the ASCII glyphs use no emoji (box-drawing/blocks are not emoji, so this passes; confirm).
- [ ] **Step 5: Commit**

```bash
git add e2e/map.spec.ts
git commit -m "test: assert crisp-ASCII glyphs (drop SVG fill/text assertions)"
```

---

## Task 3: Sweep — Phase 2

- [ ] **Step 1:** `pnpm test` → 151 pass; `pnpm exec astro check` → 0/0/0; `pnpm build` → ok.
- [ ] **Step 2:** `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test` → all pass on chromium AND webkit (1 pre-existing skip). Watch the "no emoji" homepage test and the glyph tests specifically.
- [ ] **Step 3:** `pnpm lhci` → budgets green (pure `<pre>` is lighter than the SVGs).
- [ ] **Step 4: Visual confirmation** at 1280×900 AND 375×812: all five glyphs sharp + on-metaphor + no tofu; flora clearly prime, mulch secondary; day/night both legible (toggle it); mobile — glyphs scale down cleanly, the scatter still reads, no overflow.
- [ ] **Step 5 (if fixups made):**

```bash
git add -A
git commit -m "chore: phase 2 visual sweep — crisp ASCII glyphs verified"
```

---

## Self-Review (filled in by plan author)

**1. Spec coverage:** Pure crisp-geometric ASCII, SVG dropped (Task 1). Scale prop drives font-size, prime/secondary preserved (Task 1 CSS). Labels/hover/aria-hidden unchanged (only the glyph internals change; the wrapper `<span class="zone-glyph" data-scale aria-hidden>` and `index.astro`'s `.zone-label` + hover rules are untouched). Homepage glyph E2E migrated off SVG assertions (Task 2). Flora generative-only already shipped in Phase 1. Char-safety + tofu check (Global Constraints + Task 1 Step 2). Phase 3 out of scope.

**2. Placeholder scan:** none — the component is complete; the GLYPHS are concrete starting art with an explicit preview-tune step (tuning strings against the live render is refinement of real content, not a placeholder). E2E replacements are full code.

**3. Type consistency:** `GLYPHS: Record<ZoneId, string>` is exhaustive over the 5 `ZoneId`s (compile-checked). `scale` prop unchanged (`'prime'|'secondary'|'base'`), still driving `data-scale` selectors. Selectors in map.spec (`pre.zone-ascii`, `data-zone`) match the new markup. `.zone-ascii--<id>` classes match `class:list`.
