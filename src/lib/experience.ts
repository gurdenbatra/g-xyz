// Curated professional experience — surfaced on The Roots. Owner-editable.
export interface Role {
  title: string;
  org: string;
  period: string;
  location?: string;
}

export const experience: readonly Role[] = [
  {
    title: 'Civic Tech Lead',
    org: 'Dark Matter Labs',
    period: '2020 — Now',
    location: 'Berlin',
  },
  {
    title: 'Tech & Strategic Lead',
    org: 'TreesAI',
    period: '2021 — Now',
  },
  {
    title: 'Tech Lead',
    org: 'CircuLaw',
    period: '2021 — 2025',
  },
  {
    title: 'Creative Technologist',
    org: 'Fjord',
    period: '2017 — 2020',
    location: 'Helsinki',
  },
  {
    title: 'UX Engineer',
    org: 'Accenture Liquid Studio',
    period: '2017 — 2018',
    location: 'Helsinki',
  },
  {
    title: 'UX Engineer',
    org: 'Helvar',
    period: '2016 — 2017',
    location: 'Espoo',
  },
  {
    title: 'QA Engineer',
    org: 'Redfin',
    period: '2013 — 2014',
    location: 'San Francisco',
  },
  {
    title: 'Software Developer in Test Intern',
    org: 'Microsoft',
    period: '2012',
    location: 'Mountain View',
  },
];
