export type ZoneId =
  | 'polyculture'
  | 'canopy'
  | 'hive'
  | 'compost'
  | 'mycelium'
  | 'beds';

export interface Zone {
  id: ZoneId;
  emoji: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  href: string | null;
}

export const zones: readonly Zone[] = [
  {
    id: 'polyculture',
    emoji: '🌿',
    name: 'The Polyculture',
    shortDesc: 'Work',
    longDesc: 'Work & projects',
    href: '/polyculture',
  },
  {
    id: 'canopy',
    emoji: '🌳',
    name: 'The Canopy',
    shortDesc: 'Art',
    longDesc: 'Art, poetry & essays',
    href: null,
  },
  {
    id: 'hive',
    emoji: '🐝',
    name: 'The Hive',
    shortDesc: 'Now',
    longDesc: 'Now & contact',
    href: null,
  },
  {
    id: 'compost',
    emoji: '🪱',
    name: 'The Compost',
    shortDesc: 'Story',
    longDesc: 'Story & origins',
    href: '/compost',
  },
  {
    id: 'mycelium',
    emoji: '🍄',
    name: 'The Mycelium',
    shortDesc: 'Network',
    longDesc: 'Collaborators & network',
    href: null,
  },
  {
    id: 'beds',
    emoji: '🛠',
    name: 'The Beds',
    shortDesc: 'Care',
    longDesc: 'Colophon & care',
    href: '/beds',
  },
] as const;
