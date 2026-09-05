// src/lib/collaborators.ts
// Seed data for the Hive's Network section — collaborators, organisations, and idea nodes.
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
  // ── People ────────────────────────────────────────────────────────────────
  {
    id: 'gurden',
    label: 'Gurden',
    kind: 'person',
    role: 'Designer & developer',
    url: 'https://gurden.xyz',
    connections: ['dml', 'treesai', 'flux-island', 'circulaw', 'sheffield-cc'],
  },

  // ── Organisations ─────────────────────────────────────────────────────────
  {
    id: 'dml',
    label: 'Dark Matter Labs',
    kind: 'org',
    role: 'Civic innovation lab',
    url: 'https://darkmatterlabs.org',
    connections: ['gurden', 'civic-tech', 'ai-democracy', 'planetary-civics'],
  },
  {
    id: 'treesai',
    label: 'TreesAI',
    kind: 'org',
    role: 'Urban forest intelligence',
    url: 'https://treesai.org',
    connections: ['gurden', 'civic-tech'],
  },
  {
    id: 'flux-island',
    label: 'Flux Island',
    kind: 'org',
    role: 'Participatory design',
    connections: ['gurden', 'civic-tech'],
  },
  {
    id: 'circulaw',
    label: 'CircuLaw',
    kind: 'org',
    role: 'Circular economy law',
    connections: ['gurden', 'civic-tech'],
  },
  {
    id: 'sheffield-cc',
    label: 'Sheffield City Council',
    kind: 'org',
    role: 'Local government partner',
    connections: ['gurden', 'civic-tech'],
  },

  // ── Ideas ─────────────────────────────────────────────────────────────────
  {
    id: 'civic-tech',
    label: 'Civic Technology',
    kind: 'idea',
    connections: ['dml', 'treesai', 'flux-island', 'circulaw', 'sheffield-cc', 'planetary-civics'],
  },
  {
    id: 'ai-democracy',
    label: 'AI & Democracy',
    kind: 'idea',
    connections: ['dml', 'planetary-civics'],
  },
  {
    id: 'planetary-civics',
    label: 'Planetary Civics',
    kind: 'idea',
    connections: ['dml', 'civic-tech', 'ai-democracy'],
  },
] as const;
