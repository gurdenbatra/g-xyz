// src/lib/collaborators.ts
// Seed data for the Hive's Network section — collaborators, organisations, and idea nodes.
// Owner-reviewed seed data drawn from public project files (people, partner orgs, through-lines).
// Connections are bidirectional: if A lists B, B also lists A.

export type NodeKind = 'person' | 'org' | 'idea';

export interface CollaboratorNode {
  id: string;
  label: string;
  kind: NodeKind;
  role?: string;
  url?: string;
  connections: string[];  // ids of directly connected nodes
}

export const collaborators: readonly CollaboratorNode[] = [
  // ── People (co-inceptors named across projects — owner: verify/prune) ──
  { id: 'gurden', label: 'Gurden', kind: 'person', role: 'Design technologist', url: 'https://gurden.xyz',
    connections: ['dml', 'circulaw', 'treesai', 'life-pact', 'sheffield', 'planetary-civics'] },
  { id: 'romy', label: 'Romy Snijders', kind: 'person', role: 'CircuLaw', connections: ['circulaw'] },
  { id: 'sofia', label: 'Sofia Valentini', kind: 'person', role: 'TreesAI', connections: ['treesai'] },
  { id: 'arianna', label: 'Arianna Smaron', kind: 'person', role: 'CircuLaw · TreesAI · Sheffield', connections: ['circulaw', 'treesai', 'sheffield'] },
  { id: 'alessandra', label: 'Alessandra Puricelli', kind: 'person', role: 'Life Pact · TreesAI', connections: ['life-pact', 'treesai'] },
  { id: 'martin', label: 'Martin Lorenz', kind: 'person', role: 'Planetary Civics', connections: ['planetary-civics'] },
  { id: 'prateek', label: 'Prateek Shankar', kind: 'person', role: 'Planetary Civics', connections: ['planetary-civics'] },
  { id: 'tom', label: 'Tom Beresford', kind: 'person', role: 'Sheffield City Goals', connections: ['sheffield'] },

  // ── Organisations / partners ──
  { id: 'dml', label: 'Dark Matter Labs', kind: 'org', role: 'Civic innovation lab', url: 'https://darkmatterlabs.org',
    connections: ['gurden', 'circulaw', 'treesai', 'life-pact', 'sheffield', 'planetary-civics', 'civic-tech', 'ai-llm'] },
  { id: 'circulaw', label: 'CircuLaw', kind: 'org', role: 'Circular-economy law', url: 'https://www.circulaw.nl',
    connections: ['gurden', 'romy', 'arianna', 'dml', 'civic-tech'] },
  { id: 'treesai', label: 'TreesAI', kind: 'org', role: 'Urban forest as infrastructure', url: 'https://treesai.org',
    connections: ['gurden', 'sofia', 'arianna', 'alessandra', 'dml', 'civic-tech'] },
  { id: 'life-pact', label: 'Life Pact', kind: 'org', role: 'Replication toolkit', url: 'https://www.lifepactreplication.org',
    connections: ['gurden', 'alessandra', 'dml', 'civic-tech'] },
  { id: 'sheffield', label: 'Sheffield City Goals', kind: 'org', role: 'City participation', url: 'https://sheffieldcitygoals.uk',
    connections: ['gurden', 'arianna', 'tom', 'dml', 'civic-tech'] },

  // ── Ideas / through-lines ──
  { id: 'civic-tech', label: 'Civic Technology', kind: 'idea',
    connections: ['dml', 'circulaw', 'treesai', 'life-pact', 'sheffield', 'planetary-civics'] },
  { id: 'ai-llm', label: 'Applied AI & LLMs', kind: 'idea', connections: ['dml', 'planetary-civics'] },
  { id: 'planetary-civics', label: 'Planetary Civics', kind: 'idea',
    connections: ['gurden', 'martin', 'prateek', 'dml', 'civic-tech', 'ai-llm'] },
] as const;
