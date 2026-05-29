import { describe, it, expect } from 'vitest';
import { lcg, slugHash, positionNote } from './scatter';

describe('lcg', () => {
  it('returns an unsigned 32-bit integer', () => {
    const result = lcg(12345);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(2 ** 32);
  });

  it('is deterministic', () => {
    expect(lcg(0)).toBe(lcg(0));
    expect(lcg(999)).toBe(lcg(999));
  });
});

describe('slugHash', () => {
  it('returns an unsigned integer for any slug', () => {
    const slugs = [
      'elegy-for-the-undercommons',
      'three-ways-to-hold-rain',
      'what-civic-technology-actually-means',
      'eternal-noises-iii',
      'reactive-study-4',
    ];
    for (const slug of slugs) {
      const h = slugHash(slug);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });

  it('is order-sensitive (abc ≠ cba)', () => {
    expect(slugHash('abc')).not.toBe(slugHash('cba'));
  });
});

describe('positionNote — seed slugs', () => {
  const seedSlugs: Array<[string, string]> = [
    ['elegy-for-the-undercommons',          'poem'],
    ['three-ways-to-hold-rain',             'poem'],
    ['what-civic-technology-actually-means','essay'],
    ['eternal-noises-iii',                  'music'],
    ['reactive-study-4',                    'av'],
  ];

  for (const [slug, kind] of seedSlugs) {
    it(`positions "${slug}" within valid bounds`, () => {
      const pos = positionNote(slug, kind);
      const leftPct = parseFloat(pos.leftPct);
      expect(leftPct).toBeGreaterThanOrEqual(0);
      expect(leftPct).toBeLessThanOrEqual(100);
      expect(pos.topPx).toBeGreaterThanOrEqual(20);
      expect(pos.topPx).toBeLessThanOrEqual(359);
      expect(pos.r).toBeGreaterThanOrEqual(-8);
      expect(pos.r).toBeLessThanOrEqual(8);
    });
  }
});
