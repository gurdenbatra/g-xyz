export type ZoneId =
  | 'flora'
  | 'hive'
  | 'mulch'
  | 'roots'
  | 'castings';

export interface Zone {
  id: ZoneId;
  name: string;
  shortDesc: string;
  longDesc: string;
  href: string | null;
}

export const zones: readonly Zone[] = [
  {
    id: 'flora',
    name: 'The Flora & Fauna',
    shortDesc: 'Work',
    longDesc: 'Work & projects',
    href: '/flora',
  },
  {
    id: 'hive',
    name: 'The Hive',
    shortDesc: 'Now',
    longDesc: 'Now, contact & network',
    href: '/hive',
  },
  {
    id: 'mulch',
    name: 'The Mulch',
    shortDesc: 'Art',
    longDesc: 'Art, music, poetry & essays',
    href: '/mulch',
  },
  {
    id: 'roots',
    name: 'The Roots',
    shortDesc: 'Story',
    longDesc: 'Story & origins',
    href: '/roots',
  },
  {
    id: 'castings',
    name: 'The Compost',
    shortDesc: 'Care',
    longDesc: 'Design, tech & care',
    href: '/castings',
  },
] as const;
