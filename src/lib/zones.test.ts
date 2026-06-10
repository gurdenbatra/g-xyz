import { describe, expect, it } from 'vitest';
import { zones, type ZoneId } from './zones';

describe('zones', () => {
  it('has exactly five zones', () => {
    expect(zones).toHaveLength(5);
  });

  it('uses the new ecological ids in order', () => {
    expect(zones.map((z) => z.id)).toEqual([
      'flora',
      'hive',
      'mulch',
      'roots',
      'castings',
    ] satisfies ZoneId[]);
  });

  it('has a unique, non-null href per zone', () => {
    const hrefs = zones.map((z) => z.href);
    expect(hrefs.every((h) => typeof h === 'string' && h.startsWith('/'))).toBe(true);
    expect(new Set(hrefs).size).toBe(zones.length);
  });

  it('drops every retired id', () => {
    const ids = new Set<string>(zones.map((z) => z.id));
    for (const gone of ['polyculture', 'canopy', 'compost', 'beds', 'mycelium']) {
      expect(ids.has(gone)).toBe(false);
    }
  });
});
