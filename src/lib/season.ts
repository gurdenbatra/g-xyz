export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Returns the season for a given Date in the northern hemisphere.
 * Months 3-5 = spring, 6-8 = summer, 9-11 = autumn, 12/1/2 = winter.
 */
export function seasonFor(date: Date): Season {
  const month = date.getMonth() + 1; // 1-indexed
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
