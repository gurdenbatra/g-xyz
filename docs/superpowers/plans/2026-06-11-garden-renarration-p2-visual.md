# Garden Re-narration — Phase 2 (Visual) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **This is a VISUAL phase — execute inline with live browser preview (the `preview_*` tools) so each glyph is seen and tuned, not transcribed blind.**

**Goal:** Redraw the five zone glyphs to match their new ecological metaphors and recompose the homepage so Flora reads as the prime focus and Mulch as secondary.

**Architecture:** Pure presentation. Each glyph stays in the established `ZoneGlyph.astro` language — a crisp SVG silhouette (48-unit viewBox, stroke classes) plus a `<clipPath>`-clipped monospace `<text>` ASCII-texture layer. The homepage scatter gets per-zone glyph sizing (Flora largest, Mulch second) and refined `zonePos` so the sky→surface→soil cross-section reads. No new dependencies, no new client JS. Invariants preserved: each glyph keeps ≥1 `<text>` (texture E2E), the `mulch` glyph keeps an `.f-moss` filled element (fill-regression E2E), SSG/no-JS/axe/Lighthouse untouched.

**Tech Stack:** Astro 5, inline SVG, scoped CSS, Playwright, Lighthouse CI, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-11-garden-renarration-and-ambient-ecology-design.md`
**Builds on:** Phase 1 (structure) — landed (`baa06f0`…`e876e54`).

---

## Reference — current state & invariants

- `ZoneGlyph.astro` renders one `<svg>` per `{id === '…' && (…)}` branch for ids `flora, hive, mulch, roots, castings`. After P1 each branch still holds its OLD drawing (e.g. `mulch` = old canopy tree, `castings` = old planter box, `roots` = old compost dome). This phase replaces the five drawing bodies.
- Stroke classes (already defined): `.s-moss` `.s-soil` `.s-ochre` `.s-chart`. Fill classes: `.f-moss` `.f-ochre`. Texture classes: `.t-moss` `.t-soil` `.t-ochre` `.t-chart` (monospace, `opacity:0.68`). Base rule strips `fill` from `path`/`circle` — any filled shape MUST use an `.f-*` class (this is why the regression test exists).
- **E2E guards that must stay green** (`e2e/map.spec.ts`): every zone has ≥1 `.zone-glyph text`; `[data-zone="mulch"] .zone-glyph .f-moss` computes a non-`none` fill. Keep a `.f-moss` element in the `mulch` glyph and `<text>` in all five.
- Homepage (`src/pages/index.astro`): `zonePos` (interim, set in P1) + uniform glyph size. This phase adds per-zone sizing and refines `zonePos`.
- `&` inside SVG `<text>` must be written `&amp;`.

## File Structure

**Modify:** `src/components/home/ZoneGlyph.astro` (CSS additions + 5 redrawn bodies), `src/pages/index.astro` (sizing + `zonePos`).
No test files change structurally (the existing texture + fill-regression tests are the contract); a small size-assertion test is added to `map.spec.ts` in the composition task.

---

## Task 0: Preflight

**Files:** none.

- [ ] **Step 1:** `git status --short` → clean. `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true` (kill any stale dev server — a reused stale server caused false E2E failures in P1).
- [ ] **Step 2:** `pnpm test` → 139 pass.
- [ ] **Step 3:** `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → all pass (texture + fill-regression green on the current placeholder glyphs).
- [ ] **Step 4:** Start the preview dev server for this phase: `preview_start` (or `pnpm dev`), confirm `/` loads at 1280×900.

---

## Task 1: Extend glyph CSS (fill class + prime/secondary size modifiers)

Adds the one missing fill color (`.f-soil`, used by castings) and the size system the composition task relies on. Sizing is driven by a `data-scale` attribute on the glyph so the homepage can mark Flora prime / Mulch secondary without per-id CSS sprawl.

**Files:** Modify `src/components/home/ZoneGlyph.astro` (frontmatter + `<style>`).

- [ ] **Step 1:** In the frontmatter, accept an optional `scale` prop and emit it as a data attribute. Replace the frontmatter with:

```astro
---
import type { ZoneId } from '../../lib/zones';

interface Props {
  id: ZoneId;
  scale?: 'prime' | 'secondary' | 'base';
}

const { id, scale = 'base' } = Astro.props;
---
```

- [ ] **Step 2:** Add `data-scale={scale}` to the wrapping span: change `<span class="zone-glyph" aria-hidden="true">` to `<span class="zone-glyph" data-scale={scale} aria-hidden="true">`.

- [ ] **Step 3:** In `<style>`, replace the `.zone-glyph svg` size rules (the base `72px` block and the `@media (min-width:768px) 96px` block) with a size system keyed off `data-scale`:

```css
  .zone-glyph svg {
    width: 64px;
    height: 64px;
    display: block;
  }
  .zone-glyph[data-scale='secondary'] svg { width: 78px; height: 78px; }
  .zone-glyph[data-scale='prime']     svg { width: 92px; height: 92px; }

  @media (min-width: 768px) {
    .zone-glyph svg { width: 92px; height: 92px; }
    .zone-glyph[data-scale='secondary'] svg { width: 116px; height: 116px; }
    .zone-glyph[data-scale='prime']     svg { width: 148px; height: 148px; }
  }
```

- [ ] **Step 4:** Add the `.f-soil` fill class next to the other `.f-*` rules:

```css
  .zone-glyph .f-soil  { fill: var(--c-soil);  stroke: none; }
```

- [ ] **Step 5:** Verify build + the glyphs still render (no visual change yet except base size 64→ scales). `pnpm exec astro check` → no NEW errors. `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → green.
- [ ] **Step 6:** Commit.

```bash
git add src/components/home/ZoneGlyph.astro
git commit -m "feat: glyph size scale prop (prime/secondary/base) + f-soil fill"
```

---

## Task 2: Redraw the Flora glyph (prime) — tree + flower + vegetable + critter

**Files:** Modify `src/components/home/ZoneGlyph.astro` (the `{id === 'flora' && (…)}` branch only).

- [ ] **Step 1:** Replace the entire `flora` branch body with:

```astro
  {id === 'flora' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <defs>
        <clipPath id="zg-flora-crown">
          <circle cx="21" cy="17" r="10" />
        </clipPath>
      </defs>
      <path class="s-soil" d="M5 43 H43" />
      <path class="s-soil" d="M21 43 V25" />
      <g clip-path="url(#zg-flora-crown)">
        <text class="t-chart" x="12" y="12" font-size="4.4">* ^ *</text>
        <text class="t-moss"  x="10" y="17" font-size="4.4">^ * ^ *</text>
        <text class="t-moss"  x="11" y="22" font-size="4.4">* ^ * ^</text>
      </g>
      <circle class="s-moss" cx="21" cy="17" r="10" />
      <path class="s-moss" d="M7 43 Q7 35 12 35 Q17 35 17 43" />
      <path class="s-moss" d="M12 43 V36 M9.5 41 Q9 38 11 36 M14.5 41 Q15 38 13 36" />
      <path class="s-moss" d="M36 43 V23" />
      <circle class="f-ochre" cx="36" cy="19" r="2.4" />
      <path class="s-chart" d="M36 15 V12 M36 23 V26 M32 19 H29 M40 19 H43 M33 16 L31 14 M39 16 L41 14 M33 22 L31 24 M39 22 L41 24" />
      <circle class="f-moss" cx="29" cy="10" r="1.3" />
      <text class="t-soil" x="24.5" y="11.5" font-size="3.4">~</text>
    </svg>
  )}
```

(Reads as: ground line; a textured tree crown on a trunk, central; a low leafy vegetable clump left; a flower with an ochre center and chartreuse petals right; a tiny moss critter dot with a `~` motion mark = the fauna.)

- [ ] **Step 2: Preview + tune.** Reload `/`; screenshot at 1280×900 (and inspect the Flora glyph). It must read instantly as "a little planting — tree + flower + plant + bug." If any element overlaps illegibly at the prime size, nudge coordinates by ≤2 viewBox units. Do not remove the `<text>` rows or the elements.
- [ ] **Step 3:** `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → green (flora still has `<text>`).
- [ ] **Step 4:** Commit.

```bash
git add src/components/home/ZoneGlyph.astro
git commit -m "feat: redraw flora glyph — tree, flower, vegetable, critter"
```

---

## Task 3: Redraw the Mulch glyph (secondary) — leaf-litter + fungal caps + microbes

Keeps an `.f-moss` element (the mushroom cap) so the fill-regression E2E stays green.

**Files:** Modify `src/components/home/ZoneGlyph.astro` (the `{id === 'mulch' && (…)}` branch only).

- [ ] **Step 1:** Replace the entire `mulch` branch body with:

```astro
  {id === 'mulch' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <defs>
        <clipPath id="zg-mulch-bed">
          <rect x="4" y="30" width="40" height="13" />
        </clipPath>
      </defs>
      <path class="s-soil" d="M5 39 Q12 37 19 39 Q26 41 33 39 Q40 37 43 39" />
      <g clip-path="url(#zg-mulch-bed)">
        <text class="t-soil"  x="5" y="35"   font-size="4">. ~ , : . ~ ,</text>
        <text class="t-chart" x="6" y="39.5" font-size="4">: . ~ , . : ~</text>
        <text class="t-soil"  x="5" y="44"   font-size="4">~ , . : ~ , .</text>
      </g>
      <path class="s-moss" d="M14 39 V33" />
      <path class="f-moss" d="M9 33 Q14 27 19 33 Z" />
      <path class="s-soil" d="M31 39 V35" />
      <path class="f-ochre" d="M27 35 Q31 30 35 35 Z" />
      <circle class="f-ochre" cx="24" cy="21" r="1" />
      <text class="t-moss" x="19" y="19" font-size="4">&#183; * &#183;</text>
    </svg>
  )}
```

(Reads as: an undulating litter surface filled with leaf/microbe ASCII; a moss-capped mushroom left and a smaller ochre-capped one right; a microbe dot + `· * ·` drifting above. `&#183;` is the middot.)

- [ ] **Step 2: Preview + tune** at secondary size. The two caps must sit on the litter line; texture must stay inside the bed clip. Nudge ≤2 units if needed.
- [ ] **Step 3:** `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → green (mulch `<text>` present AND `.f-moss` fill non-none — both assertions hit this glyph).
- [ ] **Step 4:** Commit.

```bash
git add src/components/home/ZoneGlyph.astro
git commit -m "feat: redraw mulch glyph — leaf-litter, fungal caps, microbes"
```

---

## Task 4: Redraw the Roots glyph — descending taproot + soil strata

**Files:** Modify `src/components/home/ZoneGlyph.astro` (the `{id === 'roots' && (…)}` branch only).

- [ ] **Step 1:** Replace the entire `roots` branch body with:

```astro
  {id === 'roots' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <defs>
        <clipPath id="zg-roots-soil">
          <rect x="4" y="17" width="40" height="27" />
        </clipPath>
      </defs>
      <path class="s-soil" d="M5 17 H43" />
      <path class="s-moss" d="M24 17 V11 M24 14 Q21 12 20 9 M24 13 Q27 11 28 8" />
      <g clip-path="url(#zg-roots-soil)">
        <text class="t-soil"  x="6" y="24"   font-size="3.6">. : . , : . , :</text>
        <text class="t-chart" x="6" y="32"   font-size="3.6">, . : , . : , .</text>
        <text class="t-soil"  x="6" y="40"   font-size="3.6">: . , : . , : .</text>
      </g>
      <path class="s-moss" d="M24 17 V41 M24 23 L17 29 M24 28 L31 34 M17 29 L13 37 M31 34 L34 42 M24 34 L20 41" />
    </svg>
  )}
```

(Reads as: a ground line with a small sprout above; below it a deep taproot with branching rootlets descending through soil-speck strata.)

- [ ] **Step 2: Preview + tune.** The taproot must dominate below the line; the sprout reads small above. Strokes shouldn't collide with the texture rows illegibly.
- [ ] **Step 3:** `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → green.
- [ ] **Step 4:** Commit.

```bash
git add src/components/home/ZoneGlyph.astro
git commit -m "feat: redraw roots glyph — taproot descending through soil strata"
```

---

## Task 5: Redraw the Hive glyph — skep + bee + comb-cell network web

Keeps the skep but signals the merged network with a small linked-node cluster (the comb cells double as nodes).

**Files:** Modify `src/components/home/ZoneGlyph.astro` (the `{id === 'hive' && (…)}` branch only).

- [ ] **Step 1:** Replace the entire `hive` branch body with:

```astro
  {id === 'hive' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <defs>
        <clipPath id="zg-hive-body">
          <path d="M8 38 Q8 10 23 10 Q38 10 38 38 Z" />
        </clipPath>
      </defs>
      <g clip-path="url(#zg-hive-body)">
        <text class="t-ochre" x="15" y="18" font-size="4.2">o = o</text>
        <text class="t-ochre" x="12" y="24" font-size="4.2">= o = o</text>
        <text class="t-soil"  x="13" y="30" font-size="4.2">o = o =</text>
        <text class="t-soil"  x="14" y="36" font-size="4.2">= o = o</text>
      </g>
      <path class="s-ochre" d="M8 38 Q8 10 23 10 Q38 10 38 38" />
      <path class="s-ochre" d="M7 38 H39" />
      <path class="s-ochre" d="M20 38 Q23 32 26 38" />
      <circle class="f-ochre" cx="34" cy="8" r="2.3" />
      <path class="s-ochre" d="M31 6 L34 8 M37 6 L34 8" />
      <circle class="f-moss" cx="42" cy="28" r="1.4" />
      <circle class="f-moss" cx="45" cy="36" r="1.4" />
      <circle class="f-moss" cx="39" cy="40" r="1.4" />
      <path class="s-moss" d="M42 28 L45 36 M45 36 L39 40 M39 40 L42 28" />
    </svg>
  )}
```

(Reads as: the skep with comb-cell texture and a bee on top; a small triangle of linked moss nodes at the lower-right = the collaborator network that now lives here.)

- [ ] **Step 2: Preview + tune.** The node triad must read as "a little network" beside the skep without crowding the silhouette; if it clips the viewBox edge, pull the nodes inward ≤2 units.
- [ ] **Step 3:** `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → green.
- [ ] **Step 4:** Commit.

```bash
git add src/components/home/ZoneGlyph.astro
git commit -m "feat: redraw hive glyph — skep, bee, comb-cell network nodes"
```

---

## Task 6: Redraw the Castings glyph — aged heap + worm + castings

**Files:** Modify `src/components/home/ZoneGlyph.astro` (the `{id === 'castings' && (…)}` branch only).

- [ ] **Step 1:** Replace the entire `castings` branch body with:

```astro
  {id === 'castings' && (
    <svg viewBox="0 0 48 48" role="presentation">
      <defs>
        <clipPath id="zg-castings-heap">
          <path d="M5 42 Q8 24 24 22 Q40 24 43 42 Z" />
        </clipPath>
      </defs>
      <g clip-path="url(#zg-castings-heap)">
        <text class="t-chart" x="18" y="30" font-size="4">. : .</text>
        <text class="t-soil"  x="12" y="35" font-size="4">: * ; : *</text>
        <text class="t-soil"  x="8"  y="40" font-size="4">* ; : * ; : *</text>
      </g>
      <path class="s-soil" d="M5 42 Q8 24 24 22 Q40 24 43 42 Z" />
      <path class="s-soil" d="M9 34 Q24 31 39 34" />
      <path class="s-ochre" d="M26 42 q3 -4 6 -1 q3 3 6 -1" />
      <circle class="f-soil" cx="14" cy="40.5" r="0.9" />
      <circle class="f-soil" cx="19" cy="41.5" r="0.9" />
    </svg>
  )}
```

(Reads as: a rounded compost heap with an aged-layer divider and dense castings ASCII; an ochre worm surfacing at the base; two soil castings pellets.)

- [ ] **Step 2: Preview + tune.** The worm must read as a worm (a low sine wiggle at the base), the heap as aged/layered. Adjust the worm path control points ≤2 units if it looks like a scribble.
- [ ] **Step 3:** `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → green.
- [ ] **Step 4:** Commit.

```bash
git add src/components/home/ZoneGlyph.astro
git commit -m "feat: redraw castings glyph — aged heap, worm, castings"
```

---

## Task 7: Homepage composition — prime/secondary sizing + refined cross-section

Marks Flora prime and Mulch secondary (the others base) and refines `zonePos` so the sky→surface→soil reading is clear and nothing collides with the giant centered title. Adds one E2E asserting Flora's glyph renders larger than a base zone's.

**Files:** Modify `src/pages/index.astro`, `e2e/map.spec.ts`.

- [ ] **Step 1:** In `src/pages/index.astro`, give each zone a scale. Add a scale map in the frontmatter (after `zonePos`):

```ts
const zoneScale: Record<ZoneId, 'prime' | 'secondary' | 'base'> = {
  flora: 'prime',
  mulch: 'secondary',
  hive: 'base',
  roots: 'base',
  castings: 'base',
};
```

- [ ] **Step 2:** Pass it to the glyph — change `<ZoneGlyph id={zone.id} />` to `<ZoneGlyph id={zone.id} scale={zoneScale[zone.id]} />`.

- [ ] **Step 3:** Refine `zonePos` so the prime Flora sits high-left-of-centre (clear of the centered title), Hive upper-right, Mulch on the surface band left, Roots/Castings in the soil. Replace `zonePos` with:

```ts
const zonePos: Record<ZoneId, { x: string; y: string }> = {
  flora: { x: '27%', y: '23%' },
  hive: { x: '76%', y: '20%' },
  mulch: { x: '24%', y: '60%' },
  roots: { x: '70%', y: '62%' },
  castings: { x: '50%', y: '85%' },
};
```

- [ ] **Step 4: Preview + tune (the core visual step).** Reload `/` at 1280×900. Check: Flora clearly the largest and most prominent; Mulch second; the earth horizon (AsciiEarth at 62%) reads between the sky zones (flora/hive) and the soil zones (roots/castings) with Mulch at the surface; the giant "Gurden's Garden" title is not overlapped by any glyph. Nudge `zonePos` percentages (and only these) until the composition is balanced and collision-free. Then screenshot 375×812 and confirm the mobile single-column order (flora, hive, mulch, roots, castings) and that nothing overflows.
- [ ] **Step 5:** Add a size-hierarchy E2E. In `e2e/map.spec.ts`, after the texture test, add:

```ts
  test('flora glyph renders larger than a base-scale zone (prime focus)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const box = async (id: string) =>
      (await page
        .locator(`#main-content a.zone-link[data-zone="${id}"] .zone-glyph svg`)
        .first()
        .boundingBox())?.width ?? 0;
    const flora = await box('flora');
    const roots = await box('roots');
    expect(flora).toBeGreaterThan(roots);
  });
```

- [ ] **Step 6:** `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → all pass (incl. the new size test, ecological order unchanged, texture + fill-regression green).
- [ ] **Step 7:** `pnpm exec astro check` → no NEW errors.
- [ ] **Step 8:** Commit.

```bash
git add src/pages/index.astro e2e/map.spec.ts
git commit -m "feat: prime Flora / secondary Mulch composition + cross-section zonePos"
```

---

## Task 8: Final sweep — Phase 2

**Files:** none (verification; fixups if needed).

- [ ] **Step 1:** `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true` (avoid the stale-server trap), then `pnpm test` → 139 pass.
- [ ] **Step 2:** `pnpm exec astro check` → only the pre-existing `mulch/[slug].astro` `AstroComponentFactory` error.
- [ ] **Step 3:** `pnpm exec playwright test` → all pass on chromium AND webkit (1 pre-existing skip). If ascii-earth's animate test flakes, confirm no stale server is bound to 4321 and re-run.
- [ ] **Step 4:** `pnpm lhci` → error-budgets green on `/` and all five routes (accessibility 1.0, performance ≥0.9; the glyphs are inline SVG, no new resources).
- [ ] **Step 5: Visual confirmation** (`/` at 1280×900 + 375×812): all five glyphs read instantly as their metaphor (planting / litter+fungi / taproot / skep+network / heap+worm); Flora prime, Mulch secondary; cross-section legible; no title/glyph overlap; mobile column clean.
- [ ] **Step 6 (only if fixups were made):**

```bash
git add -A
git commit -m "chore: phase 2 visual sweep — glyphs + composition verified"
```

---

## Self-Review (filled in by plan author)

**1. Spec coverage:** Five glyphs redrawn to their spec metaphors — flora=tree+flower+vegetable+critter (Task 2), mulch=leaf-litter+fungal caps+microbes (Task 3), roots=taproot+soil strata (Task 4), hive=skep+bee+comb-cell network (Task 5), castings=aged heap+worm+castings (Task 6). Prime (Flora) / secondary (Mulch) hierarchy + cross-section placement (Task 7). Glyph language (silhouette + clipped ASCII texture) preserved throughout. Invariants (texture per glyph, mulch `.f-moss`, axe, Lighthouse, SSG/no-JS) verified in each task + Task 8. Day/night (P3) and ambient ecology (P4) are out of scope — their own plans.

**2. Placeholder scan:** none — every glyph task ships a complete SVG body; the size system and scale map are complete; the new E2E has full code. The "preview + tune" steps adjust coordinates within the provided drawings (not placeholders — the drawings are complete and render as-is; tuning only refines positioning against the live render).

**3. Type consistency:** `scale?: 'prime' | 'secondary' | 'base'` matches `data-scale` CSS selectors (Task 1) and `zoneScale` (Task 7). clipPath ids are unique and zone-prefixed: `zg-flora-crown`, `zg-mulch-bed`, `zg-roots-soil`, `zg-hive-body`, `zg-castings-heap` — each referenced by exactly one `url(#…)` in its branch. `.f-soil` is defined (Task 1) before castings uses it (Task 6). `mulch` retains a `.f-moss` element (Task 3) for the existing fill-regression test. `ZoneId` keys in `zoneScale` and `zonePos` are the five P1 ids.
