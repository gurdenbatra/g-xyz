import { describe, it, expect } from 'vitest';
import { collaborators } from './collaborators';
import type { CollaboratorNode } from './collaborators';

describe('collaborators data integrity', () => {
  const ids = new Set(collaborators.map((n) => n.id));

  it('has at least one node of each kind', () => {
    expect(collaborators.some((n) => n.kind === 'person')).toBe(true);
    expect(collaborators.some((n) => n.kind === 'org')).toBe(true);
    expect(collaborators.some((n) => n.kind === 'idea')).toBe(true);
  });

  it('all ids are unique', () => {
    expect(ids.size).toBe(collaborators.length);
  });

  it('all connections reference valid node ids', () => {
    for (const node of collaborators) {
      for (const connId of node.connections) {
        expect(
          ids.has(connId),
          `${node.id} references unknown connection: ${connId}`,
        ).toBe(true);
      }
    }
  });

  it('connections are bidirectional — if A→B then B→A', () => {
    for (const node of collaborators) {
      for (const connId of node.connections) {
        const conn = collaborators.find((n) => n.id === connId);
        expect(
          conn?.connections.includes(node.id),
          `${connId} does not list ${node.id} as a connection (must be bidirectional)`,
        ).toBe(true);
      }
    }
  });

  it('all labels are non-empty strings', () => {
    for (const node of collaborators) {
      expect(node.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('all nodes have valid kind', () => {
    const valid: CollaboratorNode['kind'][] = ['person', 'org', 'idea'];
    for (const node of collaborators) {
      expect(valid).toContain(node.kind);
    }
  });

  it('nodes with URL have valid URL format', () => {
    for (const node of collaborators) {
      if (node.url) {
        expect(() => new URL(node.url!)).not.toThrow();
      }
    }
  });
});
