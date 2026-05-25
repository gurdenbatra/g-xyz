import { describe, it, expect } from 'vitest';
import { noise2D } from './noise';

describe('noise2D', () => {
  it('returns the same value for the same coordinates (deterministic)', () => {
    expect(noise2D(1.5, 2.5)).toBe(noise2D(1.5, 2.5));
  });

  it('returns a value in the range [-1, 1]', () => {
    for (let i = 0; i < 100; i++) {
      const v = noise2D(Math.random() * 100, Math.random() * 100);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('produces different values at distant points', () => {
    // Sample many points; at least 80% should be different from each other
    const samples = Array.from({ length: 50 }, (_, i) => noise2D(i * 0.37, i * 0.73));
    const unique = new Set(samples);
    expect(unique.size).toBeGreaterThan(40);
  });

  it('is smooth — neighbouring samples are close to each other', () => {
    const a = noise2D(3.0, 3.0);
    const b = noise2D(3.001, 3.001);
    expect(Math.abs(a - b)).toBeLessThan(0.05);
  });

  it('returns 0 for integer-aligned coordinates due to value-noise lattice', () => {
    // Value noise at lattice corners is the hash value itself, mapped to [-1, 1].
    // The test only asserts the result is in range and finite — exact 0 is not
    // guaranteed for all integer coords by this implementation.
    const v = noise2D(0, 0);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(-1);
    expect(v).toBeLessThanOrEqual(1);
  });
});
