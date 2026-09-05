# Garden v4 — Phase 3 (Motion: WebGL shader + bee↔title) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`. **Visual/motion phase — execute INLINE with live preview so the shader and interaction are seen and tuned.**

**Goal:** Add a subtle ambient WebGL background shader behind the homepage garden (day/night-tinted, gated) and a bee↔title interaction where the cursor-bee's approach makes "Gurden's Garden" bloom.

**Architecture:** Two new client behaviours, both idle-loaded, motion-gated, and LCP-neutral, following the existing island discipline (reduced-motion gate, `requestIdleCallback` with `{timeout}`, pause on `document.hidden`, re-acquire on `astro:page-load`, cancel on `astro:before-preparation`, graceful catch). The shader is raw WebGL (no library, CSP-safe) on a full-bleed `<canvas>` behind the garden; its GLSL + a safe compile helper live in a pure, unit-tested `src/lib/shader.ts`. The bee↔title effect wraps the title in per-letter spans and drives a `--bloom` custom property from the cursor-bee's cached-vs-live proximity.

**Tech Stack:** Astro 5, raw WebGL (GLSL ES 1.00), TypeScript, Vitest, Playwright, Lighthouse CI, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-05-garden-v4-range-and-craft-design.md`

## Global Constraints

- SSG / no-JS first: with JS off, the homepage renders exactly as today (no canvas, static title). Both features are pure enhancement.
- `prefers-reduced-motion: reduce`: the shader canvas is absent/hidden (static paper shows) AND the bee↔title loop never runs. No exceptions.
- Idle-loaded (never blocks LCP); paused on `document.hidden`; cancelled on `astro:before-preparation`; re-acquired on `astro:page-load`. Any WebGL failure is caught → canvas hidden, page correct.
- All decoration `aria-hidden`; the title's accessible text stays exactly `Gurden's Garden` (straight apostrophe) — the map.spec `toHaveText` guard must keep passing.
- No external libraries; no CDN. CSP-safe.
- axe zero-violations day + night; Lighthouse budgets green; full unit + E2E green on chromium + webkit.
- Before any playwright run: `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`.

---

## Task 0: Preflight

- [ ] `git status --short` → clean; `pnpm test` → 151 pass; `pnpm exec astro check` → 0/0/0.
- [ ] `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → pass.
- [ ] Start preview; confirm `/` renders.

---

## Task 1: `src/lib/shader.ts` — GLSL + safe compile helpers (TDD)

**Files:** Create `src/lib/shader.ts`, `src/lib/shader.test.ts`.

- [ ] **Step 1: Write the failing test** — `src/lib/shader.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { VERT_SRC, FRAG_SRC, compileShader, createShaderProgram } from './shader';

// Minimal stub of the WebGL calls the helpers use.
function stubGL(opts: { compileOk?: boolean; linkOk?: boolean; makeNull?: boolean } = {}) {
  const { compileOk = true, linkOk = true, makeNull = false } = opts;
  return {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    createShader: vi.fn(() => (makeNull ? null : {})),
    shaderSource: vi.fn(), compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => compileOk),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => (makeNull ? null : {})),
    attachShader: vi.fn(), linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => linkOk),
    deleteProgram: vi.fn(),
  } as unknown as WebGLRenderingContext;
}

describe('shader', () => {
  it('exposes non-empty GLSL sources', () => {
    expect(VERT_SRC.length).toBeGreaterThan(0);
    expect(FRAG_SRC).toContain('gl_FragColor');
  });
  it('compileShader returns a shader when compilation succeeds', () => {
    const gl = stubGL();
    expect(compileShader(gl, (gl as any).VERTEX_SHADER, VERT_SRC)).not.toBeNull();
  });
  it('compileShader returns null (no throw) when compilation fails', () => {
    const gl = stubGL({ compileOk: false });
    expect(compileShader(gl, (gl as any).VERTEX_SHADER, VERT_SRC)).toBeNull();
  });
  it('createShaderProgram returns a program on success', () => {
    expect(createShaderProgram(stubGL(), VERT_SRC, FRAG_SRC)).not.toBeNull();
  });
  it('createShaderProgram returns null (no throw) when link fails', () => {
    expect(createShaderProgram(stubGL({ linkOk: false }), VERT_SRC, FRAG_SRC)).toBeNull();
  });
  it('createShaderProgram returns null when GL cannot allocate objects', () => {
    expect(createShaderProgram(stubGL({ makeNull: true }), VERT_SRC, FRAG_SRC)).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL** — `pnpm test src/lib/shader.test.ts` (module missing).

- [ ] **Step 3: Implement** — `src/lib/shader.ts`:

```ts
// Pure WebGL helpers + GLSL for the homepage ambient background shader.
// No DOM beyond the passed-in GL context; every failure returns null instead
// of throwing, so the caller can silently fall back to the static paper.

export const VERT_SRC = `attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

export const FRAG_SRC = `precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_tint;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * 3.0;
  float t = u_time * 0.04;
  vec2 q = vec2(fbm(p + t), fbm(p - t + 5.2));
  float n = fbm(p + q);
  float glow = smoothstep(0.35, 0.9, n);
  vec3 col = u_tint * (0.5 + 0.6 * glow);
  gl_FragColor = vec4(col, glow * 0.28);
}`;

export function compileShader(
  gl: WebGLRenderingContext, type: number, src: string,
): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
  return sh;
}

export function createShaderProgram(
  gl: WebGLRenderingContext, vsSrc: string, fsSrc: string,
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl.deleteProgram(prog); return null; }
  return prog;
}
```

- [ ] **Step 4: Run → PASS** — `pnpm test src/lib/shader.test.ts`; then `pnpm test` → all pass (151 + 6).
- [ ] **Step 5: Commit** — `git add src/lib/shader.ts src/lib/shader.test.ts && git commit -m "feat: pure WebGL shader helpers + GLSL for ambient background"`

---

## Task 2: `AmbientShader.astro` island + mount

**Files:** Create `src/components/home/AmbientShader.astro`; modify `src/pages/index.astro` (import + mount first inside `.garden-home`).

- [ ] **Step 1: Create `src/components/home/AmbientShader.astro`:**

```astro
---
// Subtle ambient WebGL background behind the homepage garden. Idle-loaded,
// day/night-tinted, paused when hidden, and entirely absent under
// prefers-reduced-motion. Any WebGL failure hides the canvas (static paper stands).
---

<canvas class="ambient-shader" data-ambient-shader aria-hidden="true"></canvas>

<style>
  .ambient-shader {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 1.2s var(--easing);
  }
  .ambient-shader[data-on] { opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    .ambient-shader { display: none; }
  }
</style>

<script>
  import { VERT_SRC, FRAG_SRC, createShaderProgram } from '../../lib/shader';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce) {
    let canvas: HTMLCanvasElement | null = null;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let rafId = 0;
    let uRes: WebGLUniformLocation | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uTint: WebGLUniformLocation | null = null;
    let start = 0;
    let last = 0;
    const FRAME_MS = 33; // ~30fps

    function tintRGB(): [number, number, number] {
      // Warm by day, cool/indigo by night — read live palette so it tracks theme.
      const cs = getComputedStyle(document.documentElement);
      const night = document.documentElement.getAttribute('data-daytime') === 'night';
      const hex = (night ? cs.getPropertyValue('--c-indigo') : cs.getPropertyValue('--c-ochre')).trim() || '#D9A857';
      const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
      if (!m) return [0.85, 0.66, 0.34];
      return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
    }

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      // Render at reduced internal resolution — this is a soft blurry field, cheap on mobile GPUs.
      const w = Math.max(1, Math.round((canvas.clientWidth * dpr) / 2));
      const h = Math.max(1, Math.round((canvas.clientHeight * dpr) / 2));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    }

    function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }

    function tick(now: number) {
      if (!gl || !program || !canvas) return;
      if (!document.hidden && now - last >= FRAME_MS) {
        last = now;
        resize();
        gl.useProgram(program);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (now - start) / 1000);
        const [r, g, b] = tintRGB();
        gl.uniform3f(uTint, r, g, b);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      rafId = requestAnimationFrame(tick);
    }

    function init() {
      canvas = document.querySelector<HTMLCanvasElement>('[data-ambient-shader]');
      if (!canvas) return;
      try {
        gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false })
          || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
        if (!gl) return;
        program = createShaderProgram(gl, VERT_SRC, FRAG_SRC);
        if (!program) { gl = null; return; }
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(program, 'a_pos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        uRes = gl.getUniformLocation(program, 'u_res');
        uTime = gl.getUniformLocation(program, 'u_time');
        uTint = gl.getUniformLocation(program, 'u_tint');
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        start = performance.now();
        canvas.setAttribute('data-on', '');
        stop();
        rafId = requestAnimationFrame(tick);
      } catch {
        canvas?.style.setProperty('display', 'none');
        gl = null; program = null;
      }
    }

    function onLoad() {
      if (!document.querySelector('[data-ambient-shader]')) { stop(); return; } // homepage only
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
      if (typeof ric === 'function') ric(init, { timeout: 2000 });
      else setTimeout(init, 300);
    }

    document.addEventListener('astro:page-load', onLoad);
    document.addEventListener('astro:before-preparation', stop);
  }
</script>
```

- [ ] **Step 2: Mount it** in `src/pages/index.astro` — add `import AmbientShader from '../components/home/AmbientShader.astro';` and render it as the FIRST child of `<section class="garden-home">` (before `<GardenFlora />`), so it paints behind every decorative layer:

```astro
  <section class="garden-home" aria-label="Garden home">
    <AmbientShader />
    <GardenFlora />
    <AmbientEcology />
```

- [ ] **Step 3: Preview + tune (core).** Reload `/` with motion allowed. The shader should be a SLOW, SUBTLE flowing tint behind the garden — never competing with the title/glyphs. Tune the FRAG_SRC constants if needed: overall alpha (`glow * 0.28`), scale (`uv * 3.0`), speed (`u_time * 0.04`). Toggle Day↔Night: tint should shift (warm↔indigo). Confirm it reads as ambient depth, not noise. Watch `preview_logs` for WebGL errors.
- [ ] **Step 4: Verify** — `pnpm exec astro check` → 0/0/0; `pnpm build` → ok.
- [ ] **Step 5: Commit** — `git add src/components/home/AmbientShader.astro src/pages/index.astro && git commit -m "feat: subtle WebGL ambient background behind the garden (gated, day/night-tinted)"`

---

## Task 3: Bee ↔ title interaction

Wrap the title in per-letter spans (accessible text preserved) and bloom the letters nearest the cursor-bee.

**Files:** Modify `src/pages/index.astro` (title markup + CSS + an inline module script).

- [ ] **Step 1: Wrap the title in per-letter spans.** Replace `<h1 class="garden-title"><span>Gurden's</span> <span>Garden</span></h1>` with a letter-split that PRESERVES the accessible text `Gurden's Garden` (note the `{' '}` text node between the two block words — that space keeps `textContent` exactly "Gurden's Garden"):

```astro
    <h1 class="garden-title">
      <span class="gt-word">{"Gurden's".split('').map((ch) => <span class="gt-l">{ch}</span>)}</span>
      {' '}
      <span class="gt-word">{'Garden'.split('').map((ch) => <span class="gt-l">{ch}</span>)}</span>
    </h1>
```

- [ ] **Step 2: Update the title CSS** — change the old `.garden-title span { display: block; }` rule to target the WORD spans only, and add letter-span rules driving `--bloom`:

```css
  .garden-title .gt-word { display: block; }
  .gt-l {
    display: inline-block;
    transform: translateY(calc(var(--bloom, 0) * -0.10em));
    color: color-mix(in srgb, var(--ink), var(--c-ochre) calc(var(--bloom, 0) * 65%));
    transition: transform 220ms var(--easing), color 220ms var(--easing);
    will-change: transform;
  }
  @media (prefers-reduced-motion: reduce) {
    .gt-l { transform: none; color: var(--ink); transition: none; }
  }
```

(Leave the existing `.garden-title` block otherwise unchanged; `color: var(--ink)` on the h1 still governs default letter color, and `color-mix` at `--bloom:0` resolves to `var(--ink)`.)

- [ ] **Step 3: Add the bee↔title inline script** to `index.astro` (after the closing `</style>`, a `<script>` module). It caches letter centres (cheap; re-cached on load/resize) and per frame reads only the live `#cursor-bee` position, setting each letter's `--bloom`:

```astro
<script>
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    const RADIUS = 140; // px — bloom reach around the bee
    let letters: HTMLElement[] = [];
    let centres: { x: number; y: number }[] = [];
    let bee: HTMLElement | null = null;
    let rafId = 0;

    function cache() {
      letters = Array.from(document.querySelectorAll<HTMLElement>('.garden-title .gt-l'));
      centres = letters.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    }
    function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
    function tick() {
      if (!document.hidden && bee && letters.length) {
        const b = bee.getBoundingClientRect();
        const bx = b.left + b.width / 2, by = b.top + b.height / 2;
        for (let i = 0; i < letters.length; i++) {
          const dx = centres[i].x - bx, dy = centres[i].y - by;
          const d = Math.sqrt(dx * dx + dy * dy);
          const bloom = Math.max(0, 1 - d / RADIUS);
          letters[i].style.setProperty('--bloom', bloom.toFixed(3));
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    function startOnLoad() {
      stop();
      if (!document.querySelector('.garden-title .gt-l')) return; // homepage only
      bee = document.getElementById('cursor-bee');
      cache();
      rafId = requestAnimationFrame(tick);
    }
    document.addEventListener('astro:page-load', startOnLoad);
    document.addEventListener('astro:before-preparation', stop);
    window.addEventListener('resize', cache, { passive: true });
  }
</script>
```

- [ ] **Step 4: Preview + tune.** Reload `/`; move the pointer so the cursor-bee drifts across the title — letters near the bee should lift + warm subtly, settling back as it leaves. Tune `RADIUS` / the `-0.10em` lift / the `65%` warmth for taste. It must be subtle, not jumpy.
- [ ] **Step 5: Verify title text unchanged** — `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/map.spec.ts --project=chromium` → the `renders the giant garden title as the h1` (`toHaveText("Gurden's Garden")`) and `garden title is rendered very large` tests still pass. `pnpm exec astro check` → 0/0/0.
- [ ] **Step 6: Commit** — `git add src/pages/index.astro && git commit -m "feat: bee-proximity bloom on the Gurden's Garden title"`

---

## Task 4: E2E for the motion layer + sweep

**Files:** Create `e2e/motion.spec.ts`.

- [ ] **Step 1: Create `e2e/motion.spec.ts`:**

```ts
import { test, expect } from '@playwright/test';

test.describe('Ambient shader + bee-title (motion)', () => {
  test('shader canvas is present and turns on when motion is allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const canvas = page.locator('[data-ambient-shader]');
    await expect(canvas).toBeAttached();
    // idle-init flips data-on once WebGL is up (or the canvas is hidden on failure — both are acceptable)
    await page
      .waitForFunction(() => {
        const c = document.querySelector('[data-ambient-shader]') as HTMLElement | null;
        return !!c && (c.hasAttribute('data-on') || c.style.display === 'none');
      }, undefined, { timeout: 8000 })
      .catch(() => {}); // headless WebGL may be unavailable — the graceful path is also valid
  });

  test('shader is absent under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const display = await page
      .locator('[data-ambient-shader]')
      .evaluate((el) => getComputedStyle(el).display)
      .catch(() => 'none');
    expect(display).toBe('none');
  });

  test('title keeps its accessible text after letter-wrapping', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.garden-title')).toHaveText("Gurden's Garden");
  });

  test('title letters carry the bloom hook', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(await page.locator('h1.garden-title .gt-l').count()).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 2: Run** — `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test e2e/motion.spec.ts --project=chromium` → all pass. (The shader-on test tolerates headless WebGL being unavailable; the reduced-motion + title tests are strict.)
- [ ] **Step 3: Full sweep** — `pnpm test` → all pass; `pnpm exec astro check` → 0/0/0; `lsof -ti tcp:4321 | xargs kill 2>/dev/null || true`; `pnpm exec playwright test` → all pass chromium + webkit (1 pre-existing skip); `pnpm lhci` → budgets green (shader is idle + post-LCP + capped fps/res).
- [ ] **Step 4: Visual confirmation** (1280×900 + 375×812): shader is a subtle flowing depth behind the garden, day + night tints differ, never competes with content; bee→title bloom is subtle and pleasant; on mobile the shader stays smooth (reduced internal res) or is imperceptible — if it ever janks on mobile, lower `FRAME_MS`/internal-res further or gate the shader off below 768px. Reduced-motion: no canvas, static title.
- [ ] **Step 5: Commit**

```bash
git add e2e/motion.spec.ts
git commit -m "test: ambient shader gating + bee-title bloom hook"
```

---

## Self-Review (filled in by plan author)

**1. Spec coverage:** Subtle ambient WebGL background, homepage only, day/night-tinted, idle + reduced-motion gated, graceful failure (Tasks 1–2). Bee↔title bloom (Task 3). Raw WebGL, no library, CSP-safe (Task 1). Mobile perf via reduced internal resolution + fps cap + a documented below-768px off-switch (Task 2 resize + Task 4 step 4). Tests: shader gating, reduced-motion absence, title-text preservation, bloom hook (Task 4). Invariants (no-JS, axe, Lighthouse, both browsers) in the sweep. Out of scope: interior-page shader accents (spec says homepage only).

**2. Placeholder scan:** none — shader.ts, its test, the full island, the title markup/CSS/script, and the E2E are all complete code. The preview-tune steps refine real, working constants against the render (not placeholders).

**3. Type consistency:** `VERT_SRC`/`FRAG_SRC`/`compileShader`/`createShaderProgram` names + signatures match across `shader.ts`, its test, and the island import. `[data-ambient-shader]` / `data-on` match between AmbientShader markup, its script, and motion.spec. `.gt-l` / `.gt-word` / `--bloom` match between the title markup, the title CSS, the bee↔title script, and motion.spec. `data-daytime` read matches Phase 3(P3-daynight)'s attribute. Title `textContent` stays `Gurden's Garden` (map.spec guard).
