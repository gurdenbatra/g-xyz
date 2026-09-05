import { test, expect } from '@playwright/test';

// Computed WCAG contrast audit — every page × day + night.
//
// axe's color-contrast rule files most of this site as "incomplete" (it can't
// see through the noise/filter overlays and pseudo-elements), so it silently
// missed light-on-light text in night mode. This test computes contrast from
// the ACTUAL composited colours (color-mix + opacity resolved via canvas) and
// fails on anything under WCAG AA (4.5:1 normal text, 3:1 large text).

const PAGES = ['/', '/flora', '/hive', '/mulch', '/roots', '/castings', '/flora/circulaw'];
const MODES: ReadonlyArray<readonly [string, string]> = [
  ['day', 'light'],
  ['night', 'dark'],
];

interface Fail {
  sel: string;
  text: string;
  ratio: number;
  need: number;
  fg: number[];
  bg: number[];
}

// Runs in the page. Kept dependency-free so it serialises cleanly.
function scan(): Fail[] {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  const toRGBA = (css: string): number[] => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = css;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (top: number[], base: number[]): number[] => {
    const a = top[3];
    return [top[0] * a + base[0] * (1 - a), top[1] * a + base[1] * (1 - a), top[2] * a + base[2] * (1 - a), 1];
  };
  const lum = ([r, g, b]: number[]): number => {
    const f = (c: number) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a: number[], b: number[]) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const htmlBg = toRGBA(getComputedStyle(document.documentElement).backgroundColor);
  const bodyBg = toRGBA(getComputedStyle(document.body).backgroundColor);
  const white = [255, 255, 255, 1];
  const root = htmlBg[3] > 0 ? htmlBg : white;
  const base = bodyBg[3] > 0 ? over(bodyBg, root) : root;
  const sel = (el: Element): string => {
    const parts: string[] = [];
    let e: Element | null = el;
    while (e && e !== document.body && parts.length < 4) {
      let s = e.tagName.toLowerCase();
      const cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '';
      if (cls) s += '.' + cls;
      parts.unshift(s);
      e = e.parentElement;
    }
    return parts.join(' > ');
  };
  const out: Fail[] = [];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'CANVAS', 'PRE']);
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (SKIP.has(el.tagName)) continue;
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent ?? '')
      .join('')
      .trim();
    if (text.length < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const chain: Element[] = [];
    let e: Element | null = el;
    while (e && e !== document.documentElement) {
      chain.push(e);
      e = e.parentElement;
    }
    let opacity = 1;
    for (const a of chain) opacity *= parseFloat(getComputedStyle(a).opacity || '1');
    if (opacity < 0.05) continue; // not revealed / effectively invisible
    let eff = base;
    for (let i = chain.length - 1; i >= 0; i--) {
      const c = toRGBA(getComputedStyle(chain[i]).backgroundColor);
      if (c[3] > 0) eff = over(c, eff);
    }
    const fgRaw = toRGBA(cs.color);
    const fgEff = over([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacity], eff);
    const fs = parseFloat(cs.fontSize);
    const fw = parseInt(cs.fontWeight, 10) || 400;
    const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
    const need = large ? 3 : 4.5;
    const rt = ratio(fgEff, eff);
    if (rt < need) {
      out.push({ sel: sel(el), text: text.slice(0, 60), ratio: +rt.toFixed(2), need, fg: fgEff.slice(0, 3).map(Math.round), bg: eff.slice(0, 3).map(Math.round) });
    }
  }
  const seen = new Set<string>();
  return out.filter((o) => {
    const k = o.sel + '|' + o.ratio;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

for (const [mode, pref] of MODES) {
  test.describe(`Contrast — ${mode} mode`, () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    for (const path of PAGES) {
      test(`${path} has no WCAG AA contrast failures in ${mode} mode`, async ({ page }) => {
        // Force the mode through the site's own preference so it's independent
        // of the tester's clock and OS theme.
        await page.addInitScript((p) => {
          try {
            localStorage.setItem('gg-daytime', p);
          } catch {
            /* storage unavailable — page still renders */
          }
        }, pref);
        await page.goto(path);
        // Reveal scroll-gated content (e.g. the Roots strata) before scanning.
        await page.evaluate(async () => {
          for (let y = 0; y <= document.body.scrollHeight; y += 300) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 30));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => document.documentElement.getAttribute('data-daytime'))).toBe(mode);
        const fails = await page.evaluate(scan);
        expect(
          fails,
          fails.map((f) => `${f.ratio}:1 (need ${f.need}) ${f.sel} "${f.text}" fg=${f.fg} bg=${f.bg}`).join('\n'),
        ).toEqual([]);
      });
    }
  });
}
