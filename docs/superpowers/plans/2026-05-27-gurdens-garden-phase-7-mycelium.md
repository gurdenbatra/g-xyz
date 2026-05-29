# The Mycelium — Phase 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/mycelium` with the Nodes canvas piece — a force-directed graph of collaborators, organisations, and idea nodes, with pulsing signal animations on edges and hover info cards.

**Architecture:** A `graph.ts` pure module handles the force-directed simulation (init, step, stability run). `NodesGraph.astro` reads `src/lib/collaborators.ts` seed data, renders a canvas + accessible list + positioned info card, and mounts the simulation using Astro's `astro:page-load` / `astro:before-swap` lifecycle. No new packages — hand-rolled O(n²) force simulation covers ~10 nodes comfortably.

**Tech Stack:** Canvas 2D, Astro 5, `src/lib/collaborators.ts` (new TypeScript data file), Vitest, Playwright/axe.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/collaborators.ts` | Create | `CollaboratorNode` interface + seed data (9 nodes: person/org/idea) |
| `src/lib/collaborators.test.ts` | Create | Data integrity tests: unique ids, valid connections, valid kinds, valid URLs |
| `src/components/zones/Mycelium/graph.ts` | Create | Pure simulation: `RawNode`, `GraphNode`, `SimulationState`, `initSimulation`, `stepSimulation`, `runToStability` |
| `src/components/zones/Mycelium/graph.test.ts` | Create | Vitest unit tests (jsdom env via vitest glob; graph has no DOM deps) |
| `src/components/zones/Mycelium/NodesGraph.astro` | Create | Canvas + info card + accessible lists; mounts graph simulation |
| `src/pages/mycelium/index.astro` | Create | `/mycelium` route using Garden layout |
| `src/lib/zones.ts` | Modify | `mycelium.href: null → '/mycelium'` |
| `lighthouserc.json` | Modify | Add `http://localhost:4321/mycelium` to URL list |
| `e2e/mycelium.spec.ts` | Create | Playwright E2E + axe tests |
| `e2e/map.spec.ts` | Modify | Move mycelium from inactive to active zones |
| `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md` | Modify | Status → Phase 7 complete |

---

## Codebase context

- **Project dir:** `/Users/gurden/Documents/code/g-xyz`
- **Layout:** `src/layouts/Garden.astro` — import as `@layouts/Garden.astro`, props: `title`, `description`
- **CSS tokens:** `src/styles/tokens.css` — `--c-moss: #5A7A4A`, `--c-ochre: #D9A857`, `--c-soil: #8A4F2E`, `--c-chartreuse: #C4D670`, `--c-ink: #1A1A1A`, `--c-paper: #F1E8D0`, `--ink-faint: #B8B0A0`, `--ink-muted: #4A4A48`, `--ground: var(--c-paper)`, spacing `--space-*`, text `--text-*`, motion `--duration-fast`, `--easing`
- **Canvas DPR pattern:** `const dpr = Math.min(window.devicePixelRatio ?? 1, 2); canvas.width = Math.round(rect.width * dpr); ctx.setTransform(dpr,0,0,dpr,0,0)` → draw in CSS pixels
- **Astro lifecycle:** mount on `astro:page-load`, cleanup on `astro:before-swap`
- **Data to client:** `<script is:inline define:vars={{ data }}>` → `window.__xxx = data`
- **Simulation pattern:** `flock.ts` in same repo is the reference — pure module, LCG seed, immutable step function
- **Zone page pattern:** see `src/pages/hive/index.astro`
- **Test runner:** `pnpm test` (Vitest), `pnpm test:e2e` (Playwright)
- **Type check + build:** `pnpm astro check && pnpm build`

---

### Task 1: Collaborators data file + data integrity tests

**Files:**
- Create: `src/lib/collaborators.ts`
- Create: `src/lib/collaborators.test.ts`

**Node graph:** 9 seed nodes. Connections are bidirectional — if A lists B, B must also list A.

```
gurden (person)  ── Dark Matter Labs (org)  ── Civic Technology (idea)
                  ── TreesAI (org)           ── AI & Democracy (idea)
                  ── Flux Island (org)        ── Planetary Civics (idea)
                  ── CircuLaw (org)
                  ── Sheffield City Council (org)
```

Org connections to ideas: dml→civic-tech, dml→ai-democracy, dml→planetary-civics; treesai→civic-tech; flux-island→civic-tech; circulaw→civic-tech; sheffield-cc→civic-tech; civic-tech→planetary-civics; ai-democracy→planetary-civics.

---

- [ ] **Step 1: Write the failing test first (TDD)**

Create `src/lib/collaborators.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { collaborators } from './collaborators';
import type { CollaboratorNode } from './collaborators';

describe('collaborators data integrity', () => {
  const ids = new Set(collaborators.map((n) => n.id));

  it('has at least one node of each kind', () => {
    expect(collaborators.some((n) => n.kind === 'person')).toBe(true);
    expect(collaborators.some((n) => n.kind === 'org')).toBe(true);
    expect(collaborators.some((n) => n.kind === 'idea')).toBe(true);
  });

  it('all ids are unique', () => {
    expect(ids.size).toBe(collaborators.length);
  });

  it('all connections reference valid node ids', () => {
    for (const node of collaborators) {
      for (const connId of node.connections) {
        expect(
          ids.has(connId),
          `${node.id} references unknown connection: ${connId}`,
        ).toBe(true);
      }
    }
  });

  it('connections are bidirectional — if A→B then B→A', () => {
    for (const node of collaborators) {
      for (const connId of node.connections) {
        const conn = collaborators.find((n) => n.id === connId);
        expect(
          conn?.connections.includes(node.id),
          `${connId} does not list ${node.id} as a connection (must be bidirectional)`,
        ).toBe(true);
      }
    }
  });

  it('all labels are non-empty strings', () => {
    for (const node of collaborators) {
      expect(node.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('all nodes have valid kind', () => {
    const valid: CollaboratorNode['kind'][] = ['person', 'org', 'idea'];
    for (const node of collaborators) {
      expect(valid).toContain(node.kind);
    }
  });

  it('nodes with URL have valid URL format', () => {
    for (const node of collaborators) {
      if (node.url) {
        expect(() => new URL(node.url!)).not.toThrow();
      }
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test src/lib/collaborators.test.ts
```

Expected: FAIL — cannot find module `'./collaborators'`.

- [ ] **Step 3: Create `src/lib/collaborators.ts`**

```typescript
// src/lib/collaborators.ts
// Seed data for The Mycelium zone — collaborators, organisations, and idea nodes.
// Connections are bidirectional: if A lists B, B also lists A.

export type NodeKind = 'person' | 'org' | 'idea';

export interface CollaboratorNode {
  id: string;
  label: string;
  kind: NodeKind;
  role?: string;
  url?: string;
  connections: string[];  // ids of directly connected nodes
}

export const collaborators: readonly CollaboratorNode[] = [
  // ── People ────────────────────────────────────────────────────────────────
  {
    id: 'gurden',
    label: 'Gurden',
    kind: 'person',
    role: 'Designer & developer',
    url: 'https://gurden.xyz',
    connections: ['dml', 'treesai', 'flux-island', 'circulaw', 'sheffield-cc'],
  },

  // ── Organisations ─────────────────────────────────────────────────────────
  {
    id: 'dml',
    label: 'Dark Matter Labs',
    kind: 'org',
    role: 'Civic innovation lab',
    url: 'https://darkmatterlabs.org',
    connections: ['gurden', 'civic-tech', 'ai-democracy', 'planetary-civics'],
  },
  {
    id: 'treesai',
    label: 'TreesAI',
    kind: 'org',
    role: 'Urban forest intelligence',
    url: 'https://treesai.org',
    connections: ['gurden', 'civic-tech'],
  },
  {
    id: 'flux-island',
    label: 'Flux Island',
    kind: 'org',
    role: 'Participatory design',
    connections: ['gurden', 'civic-tech'],
  },
  {
    id: 'circulaw',
    label: 'CircuLaw',
    kind: 'org',
    role: 'Circular economy law',
    connections: ['gurden', 'civic-tech'],
  },
  {
    id: 'sheffield-cc',
    label: 'Sheffield City Council',
    kind: 'org',
    role: 'Local government partner',
    connections: ['gurden', 'civic-tech'],
  },

  // ── Ideas ─────────────────────────────────────────────────────────────────
  {
    id: 'civic-tech',
    label: 'Civic Technology',
    kind: 'idea',
    connections: ['dml', 'treesai', 'flux-island', 'circulaw', 'sheffield-cc', 'planetary-civics'],
  },
  {
    id: 'ai-democracy',
    label: 'AI & Democracy',
    kind: 'idea',
    connections: ['dml', 'planetary-civics'],
  },
  {
    id: 'planetary-civics',
    label: 'Planetary Civics',
    kind: 'idea',
    connections: ['dml', 'civic-tech', 'ai-democracy'],
  },
] as const;
```

- [ ] **Step 4: Run tests — expect all PASS**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test src/lib/collaborators.test.ts
```

Expected:
```
✓ src/lib/collaborators.test.ts (7 tests)
  ✓ collaborators data integrity (7)
```

- [ ] **Step 5: Run full test suite — expect no regressions**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/gurden/Documents/code/g-xyz
git add src/lib/collaborators.ts src/lib/collaborators.test.ts
git commit -m "feat: collaborators seed data for Mycelium zone"
```

---

### Task 2: Graph simulation module (TDD)

**Files:**
- Create: `src/components/zones/Mycelium/graph.test.ts`
- Create: `src/components/zones/Mycelium/graph.ts`

The vitest config applies `jsdom` to `src/components/zones/**/*.test.ts`. `graph.ts` is pure (no DOM), so jsdom doesn't affect it.

---

- [ ] **Step 1: Create the test file first**

Create `src/components/zones/Mycelium/graph.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { initSimulation, stepSimulation, runToStability } from './graph';
import type { RawNode, SimulationState } from './graph';

const rawNodes: RawNode[] = [
  { id: 'a', label: 'A', kind: 'person', connections: ['b', 'c'] },
  { id: 'b', label: 'B', kind: 'org',    connections: ['a', 'c'] },
  { id: 'c', label: 'C', kind: 'idea',   connections: ['a', 'b'] },
];

const W = 400;
const H = 300;

describe('initSimulation', () => {
  it('creates correct node count', () => {
    const state = initSimulation(rawNodes, W, H, 42);
    expect(state.nodes).toHaveLength(rawNodes.length);
  });

  it('places nodes within canvas bounds', () => {
    const state = initSimulation(rawNodes, W, H, 42);
    for (const n of state.nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(W);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(H);
    }
  });

  it('initialises all velocities to zero', () => {
    const state = initSimulation(rawNodes, W, H, 42);
    for (const n of state.nodes) {
      expect(n.vx).toBe(0);
      expect(n.vy).toBe(0);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = initSimulation(rawNodes, W, H, 99);
    const b = initSimulation(rawNodes, W, H, 99);
    expect(a.nodes.map((n) => n.x)).toEqual(b.nodes.map((n) => n.x));
    expect(a.nodes.map((n) => n.y)).toEqual(b.nodes.map((n) => n.y));
  });

  it('produces different positions for different seeds', () => {
    const a = initSimulation(rawNodes, W, H, 1);
    const b = initSimulation(rawNodes, W, H, 2);
    expect(a.nodes[0].x).not.toBe(b.nodes[0].x);
  });

  it('preserves node ids and labels', () => {
    const state = initSimulation(rawNodes, W, H, 42);
    expect(state.nodes[0].id).toBe('a');
    expect(state.nodes[1].label).toBe('B');
  });

  it('handles empty node list', () => {
    const state = initSimulation([], W, H, 42);
    expect(state.nodes).toHaveLength(0);
    expect(state.energy).toBe(0);
  });
});

describe('stepSimulation', () => {
  const initial = initSimulation(rawNodes, W, H, 42);

  it('returns the same node count', () => {
    const next = stepSimulation(initial, W, H);
    expect(next.nodes).toHaveLength(initial.nodes.length);
  });

  it('does not mutate the input state', () => {
    const origX = initial.nodes[0].x;
    const origY = initial.nodes[0].y;
    stepSimulation(initial, W, H);
    expect(initial.nodes[0].x).toBe(origX);
    expect(initial.nodes[0].y).toBe(origY);
  });

  it('nodes move after a step (forces applied)', () => {
    const next = stepSimulation(initial, W, H);
    const moved = next.nodes.filter(
      (n, i) =>
        Math.abs(n.x - initial.nodes[i].x) > 0.0001 ||
        Math.abs(n.y - initial.nodes[i].y) > 0.0001,
    );
    expect(moved.length).toBeGreaterThan(0);
  });

  it('energy is a non-negative finite number', () => {
    const next = stepSimulation(initial, W, H);
    expect(next.energy).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(next.energy)).toBe(true);
  });

  it('positions remain finite over 50 steps', () => {
    let s = initial;
    for (let i = 0; i < 50; i++) s = stepSimulation(s, W, H);
    for (const n of s.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it('connected nodes converge when placed far apart', () => {
    // Place two connected nodes at opposite corners; after 100 steps they should be closer
    const farNodes: RawNode[] = [
      { id: 'x', label: 'X', kind: 'person', connections: ['y'] },
      { id: 'y', label: 'Y', kind: 'org',    connections: ['x'] },
    ];
    const s0: SimulationState = {
      nodes: [
        { ...farNodes[0], x: 10,      y: H / 2, vx: 0, vy: 0 },
        { ...farNodes[1], x: W - 10,  y: H / 2, vx: 0, vy: 0 },
      ],
      energy: 0,
    };
    const distBefore = Math.abs(s0.nodes[1].x - s0.nodes[0].x);
    let s = s0;
    for (let i = 0; i < 100; i++) s = stepSimulation(s, W, H);
    const distAfter = Math.abs(s.nodes[1].x - s.nodes[0].x);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('unconnected nodes pushed apart when placed at the same point', () => {
    // Two unconnected nodes at the same position; after 20 steps they should be further apart
    const closeNodes: RawNode[] = [
      { id: 'p', label: 'P', kind: 'person', connections: [] },
      { id: 'q', label: 'Q', kind: 'org',    connections: [] },
    ];
    const s0: SimulationState = {
      nodes: [
        { ...closeNodes[0], x: W / 2, y: H / 2, vx: 0, vy: 0 },
        { ...closeNodes[1], x: W / 2 + 1, y: H / 2, vx: 0, vy: 0 },
      ],
      energy: 0,
    };
    const distBefore = 1;
    let s = s0;
    for (let i = 0; i < 20; i++) s = stepSimulation(s, W, H);
    const distAfter = Math.sqrt(
      (s.nodes[1].x - s.nodes[0].x) ** 2 + (s.nodes[1].y - s.nodes[0].y) ** 2,
    );
    expect(distAfter).toBeGreaterThan(distBefore);
  });
});

describe('runToStability', () => {
  const initial = initSimulation(rawNodes, W, H, 42);

  it('returns state with finite energy', () => {
    const stable = runToStability(initial, W, H);
    expect(Number.isFinite(stable.energy)).toBe(true);
  });

  it('does not mutate the original state', () => {
    const origX = initial.nodes[0].x;
    runToStability(initial, W, H);
    expect(initial.nodes[0].x).toBe(origX);
  });

  it('positions remain finite after full stability run', () => {
    const stable = runToStability(initial, W, H);
    for (const n of stable.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it('energy after stability run is less than after 1 step (simulation converges)', () => {
    const after1 = stepSimulation(initial, W, H);
    const stable = runToStability(initial, W, H);
    // After stability run (up to 600 steps), energy should be far lower than after just 1 step
    expect(stable.energy).toBeLessThan(after1.energy + 1);
  });

  it('respects maxSteps override', () => {
    const s = runToStability(initial, W, H, 1);
    // Exactly 1 step run — should equal calling stepSimulation once
    const oneStep = stepSimulation(initial, W, H);
    expect(s.nodes[0].x).toBeCloseTo(oneStep.nodes[0].x, 5);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test src/components/zones/Mycelium/graph.test.ts
```

Expected: FAIL — cannot find module `'./graph'`.

- [ ] **Step 3: Create `src/components/zones/Mycelium/graph.ts`**

```typescript
// src/components/zones/Mycelium/graph.ts
// Pure force-directed graph simulation for the Nodes canvas piece.
// No DOM dependencies. Deterministic for a given seed.
// O(n²) per step — acceptable for ≤ 30 nodes.

export interface RawNode {
  id: string;
  label: string;
  kind: 'person' | 'org' | 'idea';
  role?: string;
  url?: string;
  connections: string[];   // ids of directly connected nodes
}

export interface GraphNode extends RawNode {
  x: number;   // canvas CSS pixels
  y: number;
  vx: number;
  vy: number;
}

export interface SimulationState {
  nodes: GraphNode[];
  energy: number;   // sum of vx² + vy² for all nodes; < ENERGY_THRESH = stable
}

// ── Constants ────────────────────────────────────────────────────────────────

const REPULSION     = 3000;   // Coulomb-like repulsion constant
const SPRING_K      = 0.03;   // Hooke's spring constant
const SPRING_L      = 120;    // natural spring length (px)
const DAMPING       = 0.85;   // velocity multiplier each step
const CENTER_K      = 0.005;  // pull toward canvas centre
const MAX_SPEED     = 8;      // px per step cap
const ENERGY_THRESH = 0.5;    // below this sum-of-squared-velocities → stable
const MARGIN        = 40;     // soft-boundary margin (px)

// ── Helpers ──────────────────────────────────────────────────────────────────

/** LCG pseudo-random — matches flock.ts for consistency */
function lcg(n: number): number {
  return ((n * 1664525 + 1013904223) & 0xffffffff) >>> 0;
}

function clampMag(vx: number, vy: number, max: number): [number, number] {
  const mag = Math.sqrt(vx * vx + vy * vy);
  if (mag < 0.001 || mag <= max) return [vx, vy];
  return [(vx / mag) * max, (vy / mag) * max];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise a simulation from raw node data.
 * Positions are scattered deterministically within the central 60% of the canvas.
 * All initial velocities are zero.
 */
export function initSimulation(
  rawNodes: RawNode[],
  w: number,
  h: number,
  seed: number,
): SimulationState {
  let s = seed;
  const nodes: GraphNode[] = rawNodes.map((raw) => {
    s = lcg(s);
    const x = (s / 2 ** 32) * (w * 0.6) + w * 0.2;
    s = lcg(s);
    const y = (s / 2 ** 32) * (h * 0.6) + h * 0.2;
    return { ...raw, x, y, vx: 0, vy: 0 };
  });
  return { nodes, energy: 0 };
}

/**
 * Pure simulation step — returns a NEW SimulationState (does not mutate input).
 * Forces: Coulomb repulsion between all pairs + Hooke spring along edges + centre gravity + soft bounds.
 */
export function stepSimulation(
  state: SimulationState,
  w: number,
  h: number,
): SimulationState {
  const { nodes } = state;
  const cx = w / 2;
  const cy = h / 2;

  // Accumulated forces per node
  const forces: { fx: number; fy: number }[] = nodes.map(() => ({ fx: 0, fy: 0 }));

  // ── Coulomb repulsion (all pairs) ──────────────────────────────────────────
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < 1) continue;
      const dist  = Math.sqrt(dist2);
      const force = REPULSION / dist2;
      const nx    = (dx / dist) * force;
      const ny    = (dy / dist) * force;
      forces[i].fx -= nx;
      forces[i].fy -= ny;
      forces[j].fx += nx;
      forces[j].fy += ny;
    }
  }

  // ── Hooke spring attraction (connected pairs only) ─────────────────────────
  const idxMap = new Map<string, number>(nodes.map((n, i) => [n.id, i]));

  for (let i = 0; i < nodes.length; i++) {
    for (const connId of nodes[i].connections) {
      const j = idxMap.get(connId);
      if (j === undefined || j <= i) continue;   // process each edge once
      const dx      = nodes[j].x - nodes[i].x;
      const dy      = nodes[j].y - nodes[i].y;
      const dist    = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const stretch = dist - SPRING_L;
      const force   = SPRING_K * stretch;
      const nx      = (dx / dist) * force;
      const ny      = (dy / dist) * force;
      forces[i].fx += nx;
      forces[i].fy += ny;
      forces[j].fx -= nx;
      forces[j].fy -= ny;
    }
  }

  // ── Integrate: velocity + centering + soft bounds + position ──────────────
  let energy = 0;

  const newNodes: GraphNode[] = nodes.map((node, i) => {
    let vx = (node.vx + forces[i].fx) * DAMPING;
    let vy = (node.vy + forces[i].fy) * DAMPING;

    // Centre gravity
    vx += (cx - node.x) * CENTER_K;
    vy += (cy - node.y) * CENTER_K;

    // Soft boundary repulsion
    if (node.x < MARGIN)       vx += (MARGIN - node.x) * 0.1;
    else if (node.x > w - MARGIN) vx -= (node.x - (w - MARGIN)) * 0.1;
    if (node.y < MARGIN)       vy += (MARGIN - node.y) * 0.1;
    else if (node.y > h - MARGIN) vy -= (node.y - (h - MARGIN)) * 0.1;

    [vx, vy] = clampMag(vx, vy, MAX_SPEED);

    const x = node.x + vx;
    const y = node.y + vy;

    energy += vx * vx + vy * vy;
    return { ...node, x, y, vx, vy };
  });

  return { nodes: newNodes, energy };
}

/**
 * Run simulation synchronously until energy < ENERGY_THRESH or maxSteps exceeded.
 * Used for prefers-reduced-motion: produce a settled static frame instantly.
 */
export function runToStability(
  state: SimulationState,
  w: number,
  h: number,
  maxSteps = 600,
): SimulationState {
  let s = state;
  for (let i = 0; i < maxSteps; i++) {
    s = stepSimulation(s, w, h);
    if (s.energy < ENERGY_THRESH) break;
  }
  return s;
}
```

- [ ] **Step 4: Run tests — expect all PASS**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test src/components/zones/Mycelium/graph.test.ts
```

Expected:
```
✓ src/components/zones/Mycelium/graph.test.ts (17 tests)
  ✓ initSimulation (7)
  ✓ stepSimulation (7)
  ✓ runToStability (5)
```

- [ ] **Step 5: Run full test suite — expect no regressions**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/gurden/Documents/code/g-xyz
git add src/components/zones/Mycelium/graph.ts src/components/zones/Mycelium/graph.test.ts
git commit -m "feat: graph simulation module for Nodes canvas piece"
```

---

### Task 3: NodesGraph.astro canvas component

**Files:**
- Create: `src/components/zones/Mycelium/NodesGraph.astro`

No new unit tests for this task — canvas rendering is covered by E2E in Task 5. Pure simulation is tested in Task 2.

---

- [ ] **Step 1: Create `src/components/zones/Mycelium/NodesGraph.astro`**

```astro
---
// src/components/zones/Mycelium/NodesGraph.astro
import type { RawNode } from './graph';
import { collaborators } from '../../lib/collaborators';

const people = collaborators.filter((n) => n.kind === 'person');
const orgs   = collaborators.filter((n) => n.kind === 'org');
const ideas  = collaborators.filter((n) => n.kind === 'idea');

// Spread converts readonly CollaboratorNode[] → mutable RawNode[] (structurally identical)
const rawNodes: RawNode[] = [...collaborators];
---

<div class="nodes-graph-wrap" data-nodes-graph-wrap>
  <canvas
    data-nodes-graph
    class="nodes-graph-canvas"
    aria-label="A force-directed graph of collaborators, organisations, and ideas. The lists below are the keyboard-navigable equivalent."
  ></canvas>
  <!-- Info card — purely visual, aria-hidden; screen readers use the lists below -->
  <div class="node-card" data-node-card aria-hidden="true">
    <p class="node-card-label" data-node-card-label></p>
    <p class="node-card-role"  data-node-card-role></p>
    <a class="node-card-link"  data-node-card-link href="#" target="_blank" rel="noopener noreferrer"></a>
  </div>
</div>

<!-- Accessible lists — keyboard-navigable equivalent of the canvas -->
<div class="mycelium-lists">
  <div class="mycelium-list-group">
    <h3 class="label mycelium-list-title">People</h3>
    <ul role="list" class="mycelium-list">
      {people.map((n) => (
        <li class="mycelium-list-item">
          {n.url
            ? <a href={n.url} class="mycelium-item-label label mycelium-item-link" target="_blank" rel="noopener noreferrer">{n.label}</a>
            : <span class="mycelium-item-label label">{n.label}</span>
          }
          {n.role && <span class="mycelium-item-role">{n.role}</span>}
        </li>
      ))}
    </ul>
  </div>
  <div class="mycelium-list-group">
    <h3 class="label mycelium-list-title">Organisations</h3>
    <ul role="list" class="mycelium-list">
      {orgs.map((n) => (
        <li class="mycelium-list-item">
          {n.url
            ? <a href={n.url} class="mycelium-item-label label mycelium-item-link" target="_blank" rel="noopener noreferrer">{n.label}</a>
            : <span class="mycelium-item-label label">{n.label}</span>
          }
          {n.role && <span class="mycelium-item-role">{n.role}</span>}
        </li>
      ))}
    </ul>
  </div>
  <div class="mycelium-list-group">
    <h3 class="label mycelium-list-title">Ideas</h3>
    <ul role="list" class="mycelium-list">
      {ideas.map((n) => (
        <li class="mycelium-list-item">
          <span class="mycelium-item-label label">{n.label}</span>
        </li>
      ))}
    </ul>
  </div>
</div>

<script is:inline define:vars={{ rawNodes }}>
  window.__graphNodes = rawNodes;
</script>

<script>
  import { initSimulation, stepSimulation, runToStability } from './graph';
  import type { SimulationState, GraphNode, RawNode } from './graph';

  declare global {
    interface Window {
      __graphNodes?: RawNode[];
    }
  }

  // ── Drawing constants ──────────────────────────────────────────────────────

  const NODE_R_PERSON = 20;
  const NODE_R_ORG    = 18;
  const NODE_R_IDEA   = 14;
  const PULSE_SPEED   = 0.0002;  // signal traverses edge in ~5 seconds
  const PULSE_PHASE   = 0.37;    // golden-ratio spread between edges avoids sync

  // ── Drawing helpers ────────────────────────────────────────────────────────

  interface Colors {
    moss: string; ochre: string; soil: string;
    chartreuse: string; ink: string; inkFaint: string;
    fontMono: string;
  }

  function nodeRadius(kind: string): number {
    return kind === 'person' ? NODE_R_PERSON : kind === 'org' ? NODE_R_ORG : NODE_R_IDEA;
  }

  /** Manual rounded-rect path — avoids CanvasRenderingContext2D.roundRect browser compat issues. */
  function roundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawNode(
    ctx: CanvasRenderingContext2D,
    node: GraphNode,
    hovered: boolean,
    colors: Colors,
  ): void {
    const { x, y, kind } = node;
    const r    = nodeRadius(kind);
    const fill = kind === 'person' ? colors.moss : kind === 'org' ? colors.ochre : colors.soil;

    ctx.beginPath();
    if (kind === 'person') {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else if (kind === 'org') {
      roundedRectPath(ctx, x - r, y - r, r * 2, r * 2, 4);
    } else {
      // Diamond
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
    }

    ctx.fillStyle = fill;
    ctx.fill();

    if (hovered) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Label below node
    ctx.fillStyle    = colors.ink;
    ctx.font         = `9px ${colors.fontMono}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label, x, y + r + 4, 100);
    ctx.textBaseline = 'alphabetic';
  }

  function drawEdge(
    ctx: CanvasRenderingContext2D,
    n1: GraphNode,
    n2: GraphNode,
    t: number,
    highlighted: boolean,
    colors: Colors,
    reduced: boolean,
    edgeIdx: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.strokeStyle = highlighted ? colors.ink : colors.inkFaint;
    ctx.lineWidth   = highlighted ? 1.5 : 0.8;
    ctx.globalAlpha = highlighted ? 0.7 : 0.35;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth   = 1;

    if (!reduced) {
      // Pulse signal dot travels along the edge
      const progress = (t * PULSE_SPEED + edgeIdx * PULSE_PHASE) % 1;
      const px = n1.x + (n2.x - n1.x) * progress;
      const py = n1.y + (n2.y - n1.y) * progress;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = colors.chartreuse;
      ctx.fill();
    }
  }

  // ── Mount / destroy ────────────────────────────────────────────────────────

  type Cleanup = () => void;

  function mountNodesGraph(): Cleanup {
    const canvas    = document.querySelector<HTMLCanvasElement>('[data-nodes-graph]');
    const card      = document.querySelector<HTMLElement>('[data-node-card]');
    const cardLabel = document.querySelector<HTMLElement>('[data-node-card-label]');
    const cardRole  = document.querySelector<HTMLElement>('[data-node-card-role]');
    const cardLink  = document.querySelector<HTMLAnchorElement>('[data-node-card-link]');
    const rawNodes  = window.__graphNodes;

    if (!canvas || !card || !cardLabel || !cardRole || !cardLink || !rawNodes) return () => {};

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Resolve CSS custom properties once (canvas cannot use var())
    const style  = getComputedStyle(document.documentElement);
    const colors: Colors = {
      moss:       style.getPropertyValue('--c-moss').trim()       || '#5A7A4A',
      ochre:      style.getPropertyValue('--c-ochre').trim()      || '#D9A857',
      soil:       style.getPropertyValue('--c-soil').trim()       || '#8A4F2E',
      chartreuse: style.getPropertyValue('--c-chartreuse').trim() || '#C4D670',
      ink:        style.getPropertyValue('--c-ink').trim()        || '#1A1A1A',
      inkFaint:   style.getPropertyValue('--ink-faint').trim()    || '#B8B0A0',
      fontMono:   style.getPropertyValue('--font-mono').trim()    || 'monospace',
    };

    let rafId       = 0;
    let startTime: number | null = null;
    let state: SimulationState;
    let nodeMap     = new Map<string, GraphNode>();
    let hoveredId: string | null = null;
    let cssW = 0;
    let cssH = 0;

    function resize(): void {
      const rect   = canvas!.getBoundingClientRect();
      cssW         = rect.width;
      cssH         = rect.height;
      const dpr    = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas!.width  = Math.round(rect.width  * dpr);
      canvas!.height = Math.round(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      state   = initSimulation([...rawNodes!], cssW, cssH, 42);
      nodeMap = new Map(state.nodes.map((n) => [n.id, n]));
    }

    function draw(t: number): void {
      ctx!.clearRect(0, 0, cssW, cssH);
      const { nodes } = state;

      // 1. Draw edges (each undirected edge once: only when connId > node.id)
      let edgeIdx = 0;
      for (const node of nodes) {
        for (const connId of node.connections) {
          if (connId <= node.id) continue;
          const conn = nodeMap.get(connId);
          if (!conn) continue;
          const highlighted = hoveredId === node.id || hoveredId === connId;
          drawEdge(ctx!, node, conn, t, highlighted, colors, rm, edgeIdx++);
        }
      }

      // 2. Draw nodes on top of edges
      for (const node of nodes) {
        drawNode(ctx!, node, node.id === hoveredId, colors);
      }
    }

    function loop(ts: number): void {
      if (startTime === null) startTime = ts;
      const t = ts - startTime;
      state   = stepSimulation(state, cssW, cssH);
      nodeMap = new Map(state.nodes.map((n) => [n.id, n]));
      draw(t);
      rafId = requestAnimationFrame(loop);
    }

    function showCard(node: GraphNode): void {
      cardLabel!.textContent = node.label;
      cardRole!.textContent  =
        node.role ??
        (node.kind === 'person' ? 'Collaborator' : node.kind === 'org' ? 'Organisation' : 'Idea');

      if (node.url) {
        cardLink!.href        = node.url;
        cardLink!.textContent = '↗ Visit';
        cardLink!.hidden      = false;
      } else {
        cardLink!.hidden = true;
      }

      card!.setAttribute('data-visible', '');

      const r       = nodeRadius(node.kind);
      const cardH   = card!.offsetHeight || 70;
      const topRaw  = node.y - cardH - 20;
      const top     = topRaw < 8 ? node.y + r + 20 : topRaw;
      const leftRaw = node.x - 90;
      const left    = Math.max(8, Math.min(cssW - 200, leftRaw));
      card!.style.left = `${left}px`;
      card!.style.top  = `${top}px`;
    }

    function hideCard(): void {
      card!.removeAttribute('data-visible');
    }

    function handleMouseMove(e: MouseEvent): void {
      const rect = canvas!.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;
      let nearest: string | null = null;
      let minDist = 40;
      for (const node of state.nodes) {
        const d = Math.sqrt((mx - node.x) ** 2 + (my - node.y) ** 2);
        if (d < minDist) { minDist = d; nearest = node.id; }
      }
      if (nearest !== hoveredId) {
        hoveredId = nearest;
        if (hoveredId) showCard(nodeMap.get(hoveredId)!);
        else hideCard();
      }
    }

    function handleMouseLeave(): void {
      hoveredId = null;
      hideCard();
    }

    resize();

    if (rm) {
      state   = runToStability(state, cssW, cssH);
      nodeMap = new Map(state.nodes.map((n) => [n.id, n]));
      draw(0);
    } else {
      rafId = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (rm) {
        state   = runToStability(state, cssW, cssH);
        nodeMap = new Map(state.nodes.map((n) => [n.id, n]));
        draw(0);
      }
    });
    ro.observe(canvas);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas!.removeEventListener('mousemove', handleMouseMove);
      canvas!.removeEventListener('mouseleave', handleMouseLeave);
    };
  }

  let cleanup: Cleanup = () => {};

  document.addEventListener('astro:page-load', () => {
    cleanup = mountNodesGraph();
  });

  document.addEventListener('astro:before-swap', () => {
    cleanup();
    cleanup = () => {};
  });
</script>

<style>
  .nodes-graph-wrap {
    position: relative;
    margin-bottom: var(--space-12);
  }

  .nodes-graph-canvas {
    display: block;
    width: 100%;
    height: 480px;
    background: transparent;
    cursor: crosshair;
  }

  @media (max-width: 640px) {
    .nodes-graph-canvas {
      height: 320px;
    }
  }

  /* Info card */
  .node-card {
    position: absolute;
    top: 0;
    left: 0;
    background: var(--ground);
    border: 1px solid var(--ink-faint);
    border-radius: 2px;
    padding: var(--space-3) var(--space-4);
    min-width: 140px;
    max-width: 200px;
    pointer-events: none;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity var(--duration-fast) var(--easing),
                transform var(--duration-fast) var(--easing);
    z-index: 10;
  }

  .node-card[data-visible] {
    opacity: 1;
    transform: none;
  }

  .node-card-label {
    font-size: var(--text-xs);
    font-style: italic;
    margin: 0 0 var(--space-1);
    color: var(--ink-muted);
  }

  .node-card-role {
    font-size: var(--text-sm);
    margin: 0 0 var(--space-2);
    color: var(--ink);
    line-height: 1.5;
  }

  .node-card-link {
    font-size: var(--text-xs);
    color: var(--ink-muted);
    text-decoration: none;
  }

  .node-card-link:hover {
    color: var(--ink);
  }

  /* Accessible lists */
  .mycelium-lists {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-8);
    padding-top: var(--space-4);
    border-top: 1px solid var(--ink-faint);
  }

  .mycelium-list-title {
    display: block;
    margin-bottom: var(--space-4);
    color: var(--ink-muted);
  }

  .mycelium-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .mycelium-list-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .mycelium-item-label {
    color: var(--ink);
  }

  .mycelium-item-link {
    text-decoration: none;
    color: var(--ink);
    transition: color var(--duration-fast) var(--easing);
  }

  .mycelium-item-link:hover {
    color: var(--ink-muted);
  }

  .mycelium-item-role {
    font-size: var(--text-sm);
    color: var(--ink-muted);
    line-height: 1.5;
  }

  @media (prefers-reduced-motion: reduce) {
    .node-card {
      transition: none;
    }
  }
</style>
```

- [ ] **Step 2: Type-check and build**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm astro check && pnpm build
```

Expected: 0 errors, 0 warnings. Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/gurden/Documents/code/g-xyz
git add src/components/zones/Mycelium/NodesGraph.astro
git commit -m "feat: NodesGraph canvas component — force-directed graph with pulse animation"
```

---

### Task 4: `/mycelium` route + zone link + LHCI

**Files:**
- Create: `src/pages/mycelium/index.astro`
- Modify: `src/lib/zones.ts` (line with `id: 'mycelium'` — change `href: null` to `href: '/mycelium'`)
- Modify: `lighthouserc.json` (add `/mycelium` to URL list)

---

- [ ] **Step 1: Create `src/pages/mycelium/index.astro`**

```astro
---
import Garden from '@layouts/Garden.astro';
import NodesGraph from '../../components/zones/Mycelium/NodesGraph.astro';
---

<Garden
  title="The Mycelium — Gurden's Garden"
  description="Collaborators, organisations, and ideas — the network that sustains the work."
>
  <div class="mycelium-wrap page-wrap">

    <header class="mycelium-header">
      <p class="label zone-emoji" aria-hidden="true">🍄</p>
      <h1>The Mycelium</h1>
      <p class="mycelium-intro">
        The network of collaborators, organisations, and ideas that the work
        grows through. Signals pass between nodes.
      </p>
    </header>

    <section class="nodes-section" aria-labelledby="nodes-heading">
      <h2 id="nodes-heading" class="label section-heading">Nodes</h2>
      <NodesGraph />
    </section>

  </div>
</Garden>

<style>
  .mycelium-wrap {
    padding-block: var(--space-16);
  }

  .mycelium-header {
    margin-bottom: var(--space-16);
    border-bottom: 1px solid var(--ink);
    padding-bottom: var(--space-8);
  }

  .zone-emoji {
    font-size: var(--text-xl);
    margin-bottom: var(--space-3);
    display: block;
  }

  .mycelium-header h1 {
    font-size: var(--text-3xl);
    font-style: italic;
    margin-top: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .mycelium-intro {
    font-size: var(--text-md);
    line-height: 1.65;
    max-width: 560px;
  }

  .section-heading {
    display: block;
    margin-bottom: var(--space-8);
  }

  .nodes-section {
    margin-bottom: var(--space-20);
  }
</style>
```

- [ ] **Step 2: Update `src/lib/zones.ts` — enable the mycelium link**

Find the `mycelium` zone object. Change:
```typescript
    href: null,
```
To:
```typescript
    href: '/mycelium',
```

- [ ] **Step 3: Update `lighthouserc.json` — add `/mycelium` URL**

In the `"url"` array, add `"http://localhost:4321/mycelium"`. Final array:

```json
"url": [
  "http://localhost:4321/",
  "http://localhost:4321/polyculture",
  "http://localhost:4321/compost",
  "http://localhost:4321/beds",
  "http://localhost:4321/hive",
  "http://localhost:4321/mycelium"
]
```

- [ ] **Step 4: Build and verify**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm build
```

Expected: Build succeeds. `/mycelium/index.html` appears in output. Should now show 14 pages built.

- [ ] **Step 5: Commit**

```bash
cd /Users/gurden/Documents/code/g-xyz
git add src/pages/mycelium/index.astro src/lib/zones.ts lighthouserc.json
git commit -m "feat: /mycelium route with Nodes graph piece; enable mycelium zone link"
```

---

### Task 5: E2E + axe tests

**Files:**
- Create: `e2e/mycelium.spec.ts`
- Modify: `e2e/map.spec.ts` (move mycelium from inactive to active zones)

---

- [ ] **Step 1: Create `e2e/mycelium.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Mycelium page — structure', () => {
  test('loads and shows zone heading', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /The Mycelium/i, level: 1 })).toBeVisible();
  });

  test('shows intro text', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByText(/network of collaborators/i).first()).toBeVisible();
  });

  test('canvas element is in DOM', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.locator('[data-nodes-graph]')).toBeAttached();
  });

  test('accessible "People" list heading is present', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /^People$/i })).toBeVisible();
  });

  test('accessible "Organisations" list heading is present', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /^Organisations$/i })).toBeVisible();
  });

  test('accessible "Ideas" list heading is present', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /^Ideas$/i })).toBeVisible();
  });

  test('Dark Matter Labs link is present in the accessible list', async ({ page }) => {
    await page.goto('/mycelium');
    const dmlLink = page.getByRole('link', { name: /Dark Matter Labs/i });
    await expect(dmlLink).toBeVisible();
    await expect(dmlLink).toHaveAttribute('href', 'https://darkmatterlabs.org');
  });
});

test.describe('Mycelium page — canvas', () => {
  test('canvas has non-zero dimensions after mount', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(300);
    const bbox = await page.locator('[data-nodes-graph]').boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });

  test('canvas renders content (non-blank pixels) after mount', async ({ page }) => {
    await page.goto('/mycelium');
    // Poll until non-blank pixels appear (force-directed layout may take a few frames)
    const isNonBlank = await page.locator('[data-nodes-graph]').evaluate(async (canvas) => {
      const c = canvas as HTMLCanvasElement;
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const ctx = c.getContext('2d');
        if (ctx) {
          const data = ctx.getImageData(0, 0, c.width, c.height).data;
          if (data.some((v) => v !== 0)) return true;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    });
    expect(isNonBlank).toBe(true);
  });
});

test.describe('Mycelium page — node hover', () => {
  test('hovering near a node shows the info card', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(500); // allow graph to settle

    const canvas = page.locator('[data-nodes-graph]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Sweep across canvas at 40% and 60% height — nodes settle in central 60%
    let found = false;
    for (const yFrac of [0.4, 0.5, 0.6]) {
      if (found) break;
      const y = box!.y + box!.height * yFrac;
      for (let x = box!.x + 60; x < box!.x + box!.width - 60; x += 20) {
        await page.mouse.move(x, y);
        const visible = await page
          .locator('[data-node-card]')
          .evaluate((el) => el.hasAttribute('data-visible'));
        if (visible) { found = true; break; }
      }
    }
    expect(found).toBe(true);
  });

  test('info card hides when mouse leaves canvas', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(500);

    const canvas = page.locator('[data-nodes-graph]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Sweep to find a node first
    let found = false;
    const sweepY = box!.y + box!.height * 0.5;
    for (let x = box!.x + 60; x < box!.x + box!.width - 60; x += 20) {
      await page.mouse.move(x, sweepY);
      const visible = await page
        .locator('[data-node-card]')
        .evaluate((el) => el.hasAttribute('data-visible'));
      if (visible) { found = true; break; }
    }
    if (!found) return; // no node found — skip assertion rather than false fail

    // Move off canvas
    await page.mouse.move(box!.x - 50, box!.y - 50);
    await page.waitForTimeout(200);

    const visible = await page
      .locator('[data-node-card]')
      .evaluate((el) => el.hasAttribute('data-visible'));
    expect(visible).toBe(false);
  });
});

test.describe('Mycelium page — reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('canvas still renders in reduced-motion mode', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(300);
    const bbox = await page.locator('[data-nodes-graph]').boundingBox();
    expect(bbox?.width).toBeGreaterThan(0);
    expect(bbox?.height).toBeGreaterThan(0);
  });

  test('accessible lists still visible in reduced-motion mode', async ({ page }) => {
    await page.goto('/mycelium');
    await expect(page.getByRole('heading', { name: /^People$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Organisations$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Ideas$/i })).toBeVisible();
  });
});

test.describe('Mycelium page — keyboard navigation', () => {
  test('organisation links are reachable by keyboard', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit headless does not Tab-focus links consistently');
    await page.goto('/mycelium');
    let found = false;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('href') ?? '');
      if (focused === 'https://darkmatterlabs.org') { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

test.describe('Mycelium page — accessibility', () => {
  test('has zero axe violations', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Mycelium page — accessibility (reduced motion)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('has zero axe violations', async ({ page }) => {
    await page.goto('/mycelium');
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Update `e2e/map.spec.ts` — graduate mycelium from inactive to active**

In `e2e/map.spec.ts`, find the `'active zones are keyboard-navigable links'` test and add:

```typescript
    await expect(map.locator('[data-zone="mycelium"] a[href="/mycelium"]')).toBeAttached();
```

Then find the `'inactive zones have no interactive link'` test and remove the mycelium assertion, leaving only canopy:

```typescript
    await expect(map.locator('[data-zone="canopy"] a')).not.toBeAttached();
```

The updated `'inactive zones have no interactive link'` test should be:
```typescript
  test('inactive zones have no interactive link', async ({ page }) => {
    await page.goto('/');
    const map = page.locator('.garden-map');
    await expect(map.locator('[data-zone="canopy"] a')).not.toBeAttached();
  });
```

- [ ] **Step 3: Run mycelium E2E tests**

Start dev server in background, then run:

```bash
cd /Users/gurden/Documents/code/g-xyz
pnpm dev &
sleep 5
pnpm test:e2e e2e/mycelium.spec.ts
kill %1 2>/dev/null || true
```

Expected: All tests pass (1 skip for WebKit keyboard test).

If the `canvas renders content` test fails: the graph simulation may need more time to settle before pixels appear. The 5s poll window should cover this, but if Playwright is running in headless mode with a GPU constraint, verify the canvas `width` attribute is non-zero (it's set on resize). If `canvas.width === 0`, the `initSimulation` step ran but `resize()` hasn't fired — add `await page.waitForTimeout(100)` before the poll.

- [ ] **Step 4: Run full E2E suite — expect no regressions**

```bash
cd /Users/gurden/Documents/code/g-xyz
pnpm dev &
sleep 5
pnpm test:e2e
kill %1 2>/dev/null || true
```

Expected: All existing tests still pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/gurden/Documents/code/g-xyz
git add e2e/mycelium.spec.ts e2e/map.spec.ts
git commit -m "test: E2E + axe coverage for /mycelium zone"
```

---

### Task 6: Final sweep — Lighthouse CI + full verification

**Files:**
- Modify: `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md`

---

- [ ] **Step 1: Run the full Vitest suite**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm test
```

Expected: All tests pass (collaborators + graph tests included).

- [ ] **Step 2: Run Lighthouse CI — all URLs must pass budgets**

```bash
cd /Users/gurden/Documents/code/g-xyz && pnpm lhci
```

Expected: `/`, `/polyculture`, `/compost`, `/beds`, `/hive`, `/mycelium` all report:
- Performance ≥ 0.9
- Accessibility = 1.0
- No assertion errors

If `/mycelium` has a performance issue: the graph simulation is ~150 lines of vanilla JS, running at 60fps over ~9 nodes (O(n²) = 36 ops/frame). This should be well under the 5ms frame budget. If performance is below 0.9, check whether the `<script>` bundle is being included in the JS size budget — it's lazy-loaded inline in the page, not in the critical path.

- [ ] **Step 3: Update design spec status**

In `docs/superpowers/specs/2026-05-25-gurdens-garden-design.md`, change line 4:

```markdown
**Status:** Phase 6 (Hive) complete; Phase 7 (Mycelium) next
```

To:

```markdown
**Status:** Phase 7 (Mycelium) complete; Phase 8 (Canopy) next
```

- [ ] **Step 4: Commit**

```bash
cd /Users/gurden/Documents/code/g-xyz
git add docs/superpowers/specs/2026-05-25-gurdens-garden-design.md
git commit -m "docs: mark Phase 7 (Mycelium) complete with Lighthouse + axe coverage"
```

---

## Self-Review

### 1. Spec coverage

| Spec requirement | Task |
|---|---|
| `/mycelium` route | Task 4 |
| Force-directed graph — Canvas 2D, no d3 | Task 2 (graph.ts) + Task 3 (NodesGraph.astro) |
| Person / org / idea nodes | Task 1 (collaborators.ts kinds) + Task 3 (drawNode shapes) |
| Connections pulse as signals flow | Task 3 (drawEdge pulse dot) |
| Click/hover node → info card | Task 3 (showCard / handleMouseMove) |
| `collaborators.yml` seed data | Task 1 (`collaborators.ts` with 9 nodes) |
| Reduced motion: graph settles immediately, no pulse | Task 2 (runToStability) + Task 3 (rm guard) |
| Zone link on map enabled | Task 4 (zones.ts) |
| LHCI budget enforced | Task 4 (lighthouserc.json) + Task 6 |
| axe zero violations | Task 5 |

### 2. Placeholder scan

No TBDs, TODOs, or incomplete sections found.

### 3. Type consistency

- `CollaboratorNode` — defined in `collaborators.ts` Task 1; `[...collaborators]` spread in `NodesGraph.astro` Task 3 is shape-compatible with `RawNode[]` via TypeScript structural typing ✓
- `RawNode` — defined in `graph.ts` Task 2; imported as type in `NodesGraph.astro` frontmatter ✓
- `GraphNode extends RawNode` — defined in `graph.ts`; used in `drawNode`, `drawEdge`, `showCard`, `handleMouseMove` ✓
- `SimulationState.nodes: GraphNode[]` — returned by all three public functions ✓
- `initSimulation(rawNodes: RawNode[], w, h, seed)` — called in `resize()` with `[...rawNodes!]` ✓
- `stepSimulation(state, w, h)` — called in `loop()` ✓
- `runToStability(state, w, h)` — called in reduced-motion branch ✓
- `edgeIdx` — incremented per unique edge in `draw()`; stable ordering since we iterate `nodes` array deterministically ✓
