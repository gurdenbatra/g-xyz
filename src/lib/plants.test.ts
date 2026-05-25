import { describe, it, expect } from 'vitest';
import {
  hashSlug,
  assignPlantType,
  generatePlant,
  type PlantType,
  type Segment,
} from './plants';

describe('hashSlug', () => {
  it('returns the same number for the same slug', () => {
    expect(hashSlug('circulaw')).toBe(hashSlug('circulaw'));
  });

  it('returns different numbers for different slugs', () => {
    expect(hashSlug('circulaw')).not.toBe(hashSlug('treesai'));
  });

  it('returns a non-negative integer', () => {
    const h = hashSlug('flux-island');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe('assignPlantType', () => {
  it('uses the override when provided', () => {
    expect(assignPlantType('whatever', 'sunflower')).toBe('sunflower');
  });

  it('deterministically picks a plant type for the same slug', () => {
    const a = assignPlantType('circulaw');
    const b = assignPlantType('circulaw');
    expect(a).toBe(b);
  });

  it('returns one of the 6 known plant types', () => {
    const knownTypes: PlantType[] = ['fern', 'sunflower', 'thistle', 'vine', 'grass', 'shrub'];
    expect(knownTypes).toContain(assignPlantType('any-slug-here'));
  });
});

describe('generatePlant', () => {
  it('returns at least one segment for every plant type', () => {
    const types: PlantType[] = ['fern', 'sunflower', 'thistle', 'vine', 'grass', 'shrub'];
    for (const t of types) {
      const segments = generatePlant('seed', t);
      expect(segments.length).toBeGreaterThan(0);
    }
  });

  it('produces the same segments for the same slug + type (deterministic)', () => {
    const a = generatePlant('circulaw', 'fern');
    const b = generatePlant('circulaw', 'fern');
    expect(a).toEqual(b);
  });

  it('produces different segments for different slugs of the same type', () => {
    const a = generatePlant('one', 'fern');
    const b = generatePlant('two', 'fern');
    // At least the per-slug jitter should make them not exactly equal
    expect(a).not.toEqual(b);
  });

  it('every segment has finite numeric coordinates', () => {
    const segs = generatePlant('circulaw', 'sunflower');
    for (const s of segs) {
      expect(Number.isFinite(s.x1)).toBe(true);
      expect(Number.isFinite(s.y1)).toBe(true);
      expect(Number.isFinite(s.x2)).toBe(true);
      expect(Number.isFinite(s.y2)).toBe(true);
    }
  });

  it('segments stay within a reasonable bounding box (under 500px on either axis)', () => {
    const segs = generatePlant('big', 'sunflower');
    const xs = segs.flatMap((s) => [s.x1, s.x2]);
    const ys = segs.flatMap((s) => [s.y1, s.y2]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    expect(w).toBeLessThan(500);
    expect(h).toBeLessThan(500);
  });
});
