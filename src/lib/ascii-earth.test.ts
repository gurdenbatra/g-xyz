import { describe, expect, it } from 'vitest';
import {
  GROUND_CHARS,
  SPROUT_CHAR,
  groundFrame,
  groundHeight,
  pickChar,
} from './ascii-earth';

describe('groundHeight', () => {
  it('is deterministic', () => {
    expect(groundHeight(7, 1.5)).toBe(groundHeight(7, 1.5));
  });

  it('stays within [0, 1]', () => {
    for (let i = 0; i < 500; i++) {
      const h = groundHeight(i, i * 0.37);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
    }
  });
});

describe('groundFrame', () => {
  it('returns exactly `width` characters', () => {
    expect(groundFrame(240, 0)).toHaveLength(240);
  });

  it('is deterministic for the same time', () => {
    expect(groundFrame(80, 2)).toBe(groundFrame(80, 2));
  });

  it('changes over time', () => {
    expect(groundFrame(80, 0)).not.toBe(groundFrame(80, 3));
  });

  it('only emits known characters', () => {
    const allowed = new Set<string>([...GROUND_CHARS, SPROUT_CHAR]);
    for (const ch of groundFrame(300, 1)) {
      expect(allowed.has(ch)).toBe(true);
    }
  });

  it('returns an empty string for non-positive width', () => {
    expect(groundFrame(0, 1)).toBe('');
    expect(groundFrame(-5, 1)).toBe('');
  });
});

describe('pickChar', () => {
  const metrics = [
    { char: '.', width: 4, brightness: 0.1 },
    { char: '~', width: 8, brightness: 0.5 },
    { char: '*', width: 8, brightness: 1 },
  ];

  it('picks the closest brightness at equal width', () => {
    expect(pickChar(metrics, 0.95, 8)).toBe('*');
    expect(pickChar(metrics, 0.45, 8)).toBe('~');
  });

  it('weights width differences', () => {
    expect(pickChar(metrics, 0.1, 4)).toBe('.');
  });

  it('throws on empty candidates', () => {
    expect(() => pickChar([], 0.5, 8)).toThrow();
  });
});
