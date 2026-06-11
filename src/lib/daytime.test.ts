import { describe, expect, it } from 'vitest';
import { timeOfDay, resolveDaytime, DAYTIMES } from './daytime';

describe('timeOfDay', () => {
  it('maps hours to the four phases', () => {
    expect(timeOfDay(0)).toBe('night');
    expect(timeOfDay(4)).toBe('night');
    expect(timeOfDay(5)).toBe('dawn');
    expect(timeOfDay(7)).toBe('dawn');
    expect(timeOfDay(8)).toBe('day');
    expect(timeOfDay(16)).toBe('day');
    expect(timeOfDay(17)).toBe('dusk');
    expect(timeOfDay(19)).toBe('dusk');
    expect(timeOfDay(20)).toBe('night');
    expect(timeOfDay(23)).toBe('night');
  });

  it('only ever returns a known phase, for every hour 0–23', () => {
    for (let h = 0; h < 24; h++) {
      expect(DAYTIMES).toContain(timeOfDay(h));
    }
  });
});

describe('resolveDaytime', () => {
  it("manual 'light' wins over everything", () => {
    expect(resolveDaytime('light', true, 23)).toBe('day');
  });
  it("manual 'dark' wins over everything", () => {
    expect(resolveDaytime('dark', false, 12)).toBe('night');
  });
  it('auto + OS dark → night', () => {
    expect(resolveDaytime('auto', true, 12)).toBe('night');
  });
  it('auto + no OS pref → follows the local hour', () => {
    expect(resolveDaytime('auto', false, 12)).toBe('day');
    expect(resolveDaytime('auto', false, 22)).toBe('night');
    expect(resolveDaytime('auto', false, 6)).toBe('dawn');
  });
});
