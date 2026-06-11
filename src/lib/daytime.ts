// Pure, Node-safe day/night logic. Mirrors lib/season.ts. No DOM access:
// the hour and preferences are injected, so it unit-tests in Node and the
// thresholds are reused (mirrored) by the pre-paint script in Garden.astro.

export const DAYTIMES = ['dawn', 'day', 'dusk', 'night'] as const;
export type Daytime = (typeof DAYTIMES)[number];

export type DaytimePref = 'auto' | 'light' | 'dark';

/** Local-hour → phase. dawn 5–7, day 8–16, dusk 17–19, night 20–4. */
export function timeOfDay(hour: number): Daytime {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

/** Precedence: manual toggle > OS dark preference > local hour. */
export function resolveDaytime(
  pref: DaytimePref,
  prefersDark: boolean,
  hour: number,
): Daytime {
  if (pref === 'light') return 'day';
  if (pref === 'dark') return 'night';
  if (prefersDark) return 'night';
  return timeOfDay(hour);
}
