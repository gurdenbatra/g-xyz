import { describe, expect, it } from 'vitest';
import {
  AMBIENT_KINDS,
  DELAY_MIN_MS,
  DELAY_MAX_MS,
  DURATION_MS,
  pickKind,
  planPass,
} from './ambient';

// A deterministic rng that yields a fixed queue, looping if exhausted.
function seq(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('pickKind', () => {
  it('returns the first kind at r=0 and the last at r→1', () => {
    expect(pickKind(0)).toBe(AMBIENT_KINDS[0]);
    expect(pickKind(0.999)).toBe(AMBIENT_KINDS[AMBIENT_KINDS.length - 1]);
  });
  it('only ever returns a known kind across the unit interval', () => {
    for (let r = 0; r < 1; r += 0.017) {
      expect(AMBIENT_KINDS).toContain(pickKind(r));
    }
  });
});

describe('planPass', () => {
  it('is deterministic and consumes rng in order (kind, jitter, duration, dir, delay)', () => {
    // kind r=0 → first kind; jitter 0.5 → no offset; duration 0 → low bound;
    // dir 0.1 → ltr; delay 0 → DELAY_MIN.
    const p = planPass(seq([0, 0.5, 0, 0.1, 0]));
    expect(p.kind).toBe(AMBIENT_KINDS[0]);
    expect(p.dir).toBe('ltr');
    expect(p.durationMs).toBe(DURATION_MS[AMBIENT_KINDS[0]][0]);
    expect(p.delayMs).toBe(DELAY_MIN_MS);
  });

  it('picks rtl when the direction draw is ≥ 0.5', () => {
    expect(planPass(seq([0, 0.5, 0, 0.9, 0])).dir).toBe('rtl');
  });

  it('keeps every field within bounds for random draws', () => {
    const rng = () => Math.random();
    for (let i = 0; i < 300; i++) {
      const p = planPass(rng);
      expect(AMBIENT_KINDS).toContain(p.kind);
      expect(p.laneTopPct).toBeGreaterThanOrEqual(0);
      expect(p.laneTopPct).toBeLessThanOrEqual(100);
      const [lo, hi] = DURATION_MS[p.kind];
      expect(p.durationMs).toBeGreaterThanOrEqual(lo);
      expect(p.durationMs).toBeLessThanOrEqual(hi);
      expect(p.delayMs).toBeGreaterThanOrEqual(DELAY_MIN_MS);
      expect(p.delayMs).toBeLessThanOrEqual(DELAY_MAX_MS);
    }
  });
});
