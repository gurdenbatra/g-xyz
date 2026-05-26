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
