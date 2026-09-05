// Talks & public appearances — surfaced in the Hive. Owner-editable.
export interface Talk {
  venue: string;
  year: string;
  role: string;
  topic?: string;
  url: string;
}

export const talks: readonly Talk[] = [
  {
    venue: 'The Conduit, Berlin',
    year: '2026',
    role: 'Live AI-assisted synthesis & discussion',
    url: 'https://www.theconduit.com/insights/ai-can-bolster-democracy-but-only-if-the-people-behind-it-have-good-intentions/',
  },
  {
    venue: 'MozFest House, Amsterdam',
    year: '2024',
    role: 'Interactive session holder',
    topic: 'TreesAI location-based scoring',
    url: 'https://pretalx.com/mozfest-house-amsterdam-2024/talk/FLFMR9/',
  },
  {
    venue: 'WCEF, Helsinki',
    year: '2023',
    role: 'Panelist',
    topic: 'New education for a changing world',
    url: 'https://wcef2023.com/blog/sessions/new-education-for-a-changing-world/',
  },
  {
    venue: 'Civic Tech & SDGs',
    year: '2022',
    role: 'Speaker',
    topic: 'Civic tech for sustainable cities',
    url: 'https://codeforall.org/events/civic-tech-sdg-11/',
  },
];
