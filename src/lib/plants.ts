// src/lib/plants.ts
// Deterministic L-system plant generation. Pure functions only — no DOM,
// no Canvas, no globals.

export type PlantType = 'fern' | 'sunflower' | 'thistle' | 'vine' | 'grass' | 'shrub';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Normalized 0–1 from root to tip — used by the wind shader for displacement strength */
  growth: number;
  /** Drawing thickness hint (1 at root, tapers toward 0.5 at tips) */
  thickness: number;
  /** Optional marker for renderer flourishes (e.g. 'bloom' for sunflower tip) */
  tip?: 'bloom' | 'leaf' | 'spike';
}

/** Plant L-system grammars. axiom + rules + iteration depth + turn angle. */
interface Grammar {
  axiom: string;
  rules: Record<string, string>;
  depth: number;
  angleDeg: number;
  /** Forward step length at depth 0 (gets divided by depth at runtime) */
  stepBase: number;
  /** Maximum height in pixels (used to scale the final plant) */
  targetHeight: number;
  /** Optional tip marker drawn at the END of each branch leaf */
  tipMarker?: 'bloom' | 'leaf' | 'spike';
}

const GRAMMARS: Record<PlantType, Grammar> = {
  fern: {
    axiom: 'X',
    rules: {
      X: 'F+[[X]-X]-F[-FX]+X',
      F: 'FF',
    },
    depth: 3,
    angleDeg: 25,
    stepBase: 6,
    targetHeight: 180,
    tipMarker: 'leaf',
  },
  sunflower: {
    axiom: 'F',
    rules: {
      F: 'FF+[+F-F-F]-[-F+F+F]',
    },
    depth: 3,
    angleDeg: 22.5,
    stepBase: 8,
    targetHeight: 220,
    tipMarker: 'bloom',
  },
  thistle: {
    axiom: 'F',
    rules: {
      F: 'F[+F]F[-F]F',
    },
    depth: 3,
    angleDeg: 30,
    stepBase: 6,
    targetHeight: 160,
    tipMarker: 'spike',
  },
  vine: {
    axiom: 'F',
    rules: {
      F: 'F[+F]F[-F][F]',
    },
    depth: 3,
    angleDeg: 22.5,
    stepBase: 5,
    targetHeight: 150,
    tipMarker: 'leaf',
  },
  grass: {
    axiom: 'F',
    rules: {
      F: 'F[+F][-F]',
    },
    depth: 2,
    angleDeg: 25,
    stepBase: 8,
    targetHeight: 90,
    tipMarker: undefined,
  },
  shrub: {
    axiom: 'F',
    rules: {
      F: 'FF-[-F+F+F]+[+F-F-F]',
    },
    depth: 3,
    angleDeg: 27.5,
    stepBase: 5,
    targetHeight: 140,
    tipMarker: 'leaf',
  },
};

/** djb2-style string hash. Returns a non-negative 32-bit integer. */
export function hashSlug(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const ALL_TYPES: readonly PlantType[] = [
  'fern',
  'sunflower',
  'thistle',
  'vine',
  'grass',
  'shrub',
] as const;

/** If an override is provided, use it. Otherwise hash the slug to pick a type. */
export function assignPlantType(slug: string, override?: PlantType): PlantType {
  if (override) return override;
  return ALL_TYPES[hashSlug(slug) % ALL_TYPES.length];
}

/** Expand an L-system axiom by N iterations using the rules table. */
function expand(axiom: string, rules: Record<string, string>, depth: number): string {
  let current = axiom;
  for (let i = 0; i < depth; i++) {
    let next = '';
    for (const ch of current) {
      next += rules[ch] ?? ch;
    }
    current = next;
  }
  return current;
}

/**
 * Walk the expanded L-system with a turtle and emit segments.
 * Turtle starts pointing up (angle = -90°). Segments are returned in growth order
 * so renderers can taper thickness or animate growth.
 */
function turtle(
  program: string,
  angleDeg: number,
  step: number,
  jitter: (n: number) => number,
  tipMarker?: 'bloom' | 'leaf' | 'spike',
): Segment[] {
  const segments: Segment[] = [];
  const stack: Array<{ x: number; y: number; a: number }> = [];
  const turn = (angleDeg * Math.PI) / 180;
  let x = 0;
  let y = 0;
  let a = -Math.PI / 2; // up

  for (let i = 0; i < program.length; i++) {
    const ch = program[i];
    const nextCh = program[i + 1] ?? '';
    switch (ch) {
      case 'F': {
        const j = jitter(i) * 0.3; // ±15% jitter on each step
        const len = step * (1 + j);
        const nx = x + Math.cos(a) * len;
        const ny = y + Math.sin(a) * len;
        // A "tip" segment is one whose forward F is followed by ']' or end-of-string
        const isTip = nextCh === ']' || nextCh === '';
        segments.push({
          x1: x,
          y1: y,
          x2: nx,
          y2: ny,
          growth: 0, // filled in below
          thickness: 1, // filled in below
          tip: isTip ? tipMarker : undefined,
        });
        x = nx;
        y = ny;
        break;
      }
      case '+':
        a += turn * (1 + jitter(i) * 0.1);
        break;
      case '-':
        a -= turn * (1 + jitter(i) * 0.1);
        break;
      case '[':
        stack.push({ x, y, a });
        break;
      case ']': {
        const s = stack.pop();
        if (s) {
          x = s.x;
          y = s.y;
          a = s.a;
        }
        break;
      }
      default:
        // X and other rule symbols don't draw; turtle ignores them
        break;
    }
  }

  // Compute growth (0 at root, 1 at tip) and thickness (1 at root, 0.45 at tip)
  // Growth = index/total approximation; thickness tapers.
  const total = segments.length || 1;
  for (let i = 0; i < segments.length; i++) {
    const g = i / total;
    segments[i].growth = g;
    segments[i].thickness = 1 - g * 0.55;
  }

  return segments;
}

/**
 * Build a deterministic plant for the given slug + type.
 * The returned segments are in the plant's LOCAL coordinate space:
 * x ≈ 0 at the stem; y = 0 at the root, growing upward toward negative y.
 * Callers translate to canvas coordinates and flip Y as needed.
 */
export function generatePlant(slug: string, type: PlantType): Segment[] {
  const grammar = GRAMMARS[type];
  const expanded = expand(grammar.axiom, grammar.rules, grammar.depth);

  // Per-slug deterministic jitter source — a small LCG seeded by the hash.
  const seed = hashSlug(slug);
  const jitter = (i: number) => {
    // Mulberry32-style mix; returns -1..1.
    let t = (seed + i * 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    const u = ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
    return u * 2 - 1;
  };

  const stepLen = grammar.stepBase / Math.max(1, grammar.depth);
  const segments = turtle(expanded, grammar.angleDeg, stepLen, jitter, grammar.tipMarker);

  // Rescale so the plant's vertical extent matches grammar.targetHeight.
  const ys = segments.flatMap((s) => [s.y1, s.y2]);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const naturalH = Math.max(1, maxY - minY);
  const scale = grammar.targetHeight / naturalH;
  return segments.map((s) => ({
    ...s,
    x1: s.x1 * scale,
    y1: s.y1 * scale,
    x2: s.x2 * scale,
    y2: s.y2 * scale,
  }));
}
