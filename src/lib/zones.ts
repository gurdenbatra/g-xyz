export type ZoneId =
  | 'polyculture'
  | 'canopy'
  | 'hive'
  | 'compost'
  | 'mycelium'
  | 'beds';

export interface Zone {
  id: ZoneId;
  name: string;
  shortDesc: string;
  longDesc: string;
  href: string | null;
}

export const zones: readonly Zone[] = [
  {
    id: 'polyculture',
    name: 'The Polyculture',
    shortDesc: 'Work',
    longDesc: 'Work & projects',
    href: '/polyculture',
  },
  {
    id: 'canopy',
    name: 'The Canopy',
    shortDesc: 'Art',
    longDesc: 'Art, poetry & essays',
    href: '/canopy',
  },
  {
    id: 'hive',
    name: 'The Hive',
    shortDesc: 'Now',
    longDesc: 'Now & contact',
    href: '/hive',
  },
  {
    id: 'compost',
    name: 'The Compost',
    shortDesc: 'Story',
    longDesc: 'Story & origins',
    href: '/compost',
  },
  {
    id: 'mycelium',
    name: 'The Mycelium',
    shortDesc: 'Network',
    longDesc: 'Collaborators & network',
    href: '/mycelium',
  },
  {
    id: 'beds',
    name: 'The Beds',
    shortDesc: 'Care',
    longDesc: 'Colophon & care',
    href: '/beds',
  },
] as const;
