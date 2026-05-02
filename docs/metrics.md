# Performance & Accessibility Metrics

## Phase 1 Baseline — 2026-05-02

### Home page (`/`)

| Metric | Score | Target |
|--------|-------|--------|
| Performance | 57 | ≥ 95 |
| Accessibility | 100 | ≥ 95 |
| Best Practices | 96 | ≥ 95 |
| SEO | 90 | ≥ 95 |

### Styleguide page (`/styleguide`)

| Metric | Score | Target |
|--------|-------|--------|
| Performance | 56 | ≥ 95 |
| Accessibility | 100 | ≥ 95 |
| Best Practices | 100 | ≥ 95 |
| SEO | 90 | ≥ 95 |

### Axe violations

| Page | Violations | Status |
|------|-----------|--------|
| `/` | 0 | ✅ |
| `/styleguide` | 0 | ✅ |

### Notes

- Phase 1 ships zero JavaScript to the browser.
- Fonts use `font-display: swap` — no render-blocking.
- Two font cuts preloaded (Extra Italic + NectoMono Regular).
- **Performance scores (57/56) are dev-server artefacts.** The Astro dev server runs with no caching, no asset optimisation, and middleware overhead. Production build scores (via `astro build && astro preview`) will be substantially higher. FCP and LCP are slow because the local dev server is unoptimised (7–12 s on localhost).
- **SEO scores (90) are also expected to improve.** The single deduction is a non-descriptive link text audit — one navigation link lacks explicit descriptive text in the current Phase 1 markup. Will be resolved in Phase 2.
- These baseline numbers were captured against `http://localhost:4321` running `astro dev`. Re-run against `astro preview` for production-representative scores.

---

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

---

_Update this file after each phase._
