// Pure, Node-safe scheduler for the homepage ambient ecology. No DOM, no timers:
// the RNG is injected so it unit-tests in Node; the island calls it with
// Math.random() and owns all timing/spawning. "Sparse & calm" pacing is encoded
// here (one pass at a time, 25–60s apart).

export const AMBIENT_KINDS = [
  'insect',
  'seed',
  'worm',
  'bird',
  'dew',
  'butterfly',
  'critter',
] as const;
export type AmbientKind = (typeof AMBIENT_KINDS)[number];

// Selection weights (same order as AMBIENT_KINDS) — common small life, rare events.
const WEIGHTS: readonly number[] = [0.28, 0.22, 0.18, 0.12, 0.1, 0.06, 0.04];

// Lane (top %) each kind travels along, mapped to the cross-section.
const LANE_TOP: Record<AmbientKind, number> = {
  bird: 12,
  butterfly: 24,
  seed: 30,
  insect: 34,
  worm: 60, // the earth horizon sits ~62%
  dew: 66,
  critter: 90, // along the ground
};
const LANE_JITTER = 10; // ± vertical wobble so repeats don't share a track

// Per-kind duration window (ms). Slow on purpose.
export const DURATION_MS: Record<AmbientKind, readonly [number, number]> = {
  insect: [16000, 24000],
  seed: [18000, 28000],
  worm: [6000, 9000],
  bird: [9000, 14000],
  dew: [4000, 7000],
  butterfly: [12000, 18000],
  critter: [14000, 20000],
};

export const DELAY_MIN_MS = 25000;
export const DELAY_MAX_MS = 60000;

// Animate in place (no traverse): the worm surfaces, the dew shimmers.
export const IN_PLACE: ReadonlySet<AmbientKind> = new Set(['worm', 'dew']);

export interface Pass {
  kind: AmbientKind;
  laneTopPct: number;
  durationMs: number;
  dir: 'ltr' | 'rtl';
  delayMs: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Weighted pick over AMBIENT_KINDS from r in [0, 1). */
export function pickKind(r: number): AmbientKind {
  let acc = 0;
  for (let i = 0; i < AMBIENT_KINDS.length; i++) {
    acc += WEIGHTS[i];
    if (r < acc) return AMBIENT_KINDS[i];
  }
  return AMBIENT_KINDS[AMBIENT_KINDS.length - 1];
}

/**
 * Plan the next pass. Consumes `rng()` in a FIXED order so it is reproducible:
 *   1) kind  2) lane jitter  3) duration  4) direction  5) delay-to-next.
 */
export function planPass(rng: () => number): Pass {
  const kind = pickKind(rng());
  const laneTopPct = clamp(LANE_TOP[kind] + (rng() - 0.5) * LANE_JITTER, 0, 100);
  const [lo, hi] = DURATION_MS[kind];
  const durationMs = Math.round(lo + rng() * (hi - lo));
  const dir: 'ltr' | 'rtl' = rng() < 0.5 ? 'ltr' : 'rtl';
  const delayMs = Math.round(DELAY_MIN_MS + rng() * (DELAY_MAX_MS - DELAY_MIN_MS));
  return { kind, laneTopPct, durationMs, dir, delayMs };
}
