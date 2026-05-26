import { describe, it, expect } from 'vitest';
import { initSimulation, stepSimulation, runToStability } from './graph';
import type { RawNode, SimulationState } from './graph';

const rawNodes: RawNode[] = [
  { id: 'a', label: 'A', kind: 'person', connections: ['b', 'c'] },
  { id: 'b', label: 'B', kind: 'org',    connections: ['a', 'c'] },
  { id: 'c', label: 'C', kind: 'idea',   connections: ['a', 'b'] },
];

const W = 400;
const H = 300;

describe('initSimulation', () => {
  it('creates correct node count', () => {
    const state = initSimulation(rawNodes, W, H, 42);
    expect(state.nodes).toHaveLength(rawNodes.length);
  });

  it('places nodes within canvas bounds', () => {
    const state = initSimulation(rawNodes, W, H, 42);
    for (const n of state.nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(W);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(H);
    }
  });

  it('initialises all velocities to zero', () => {
    const state = initSimulation(rawNodes, W, H, 42);
    for (const n of state.nodes) {
      expect(n.vx).toBe(0);
      expect(n.vy).toBe(0);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = initSimulation(rawNodes, W, H, 99);
    const b = initSimulation(rawNodes, W, H, 99);
    expect(a.nodes.map((n) => n.x)).toEqual(b.nodes.map((n) => n.x));
    expect(a.nodes.map((n) => n.y)).toEqual(b.nodes.map((n) => n.y));
  });

  it('produces different positions for different seeds', () => {
    const a = initSimulation(rawNodes, W, H, 1);
    const b = initSimulation(rawNodes, W, H, 2);
    expect(a.nodes[0].x).not.toBe(b.nodes[0].x);
  });

  it('preserves node ids and labels', () => {
    const state = initSimulation(rawNodes, W, H, 42);
    expect(state.nodes[0].id).toBe('a');
    expect(state.nodes[1].label).toBe('B');
  });

  it('handles empty node list', () => {
    const state = initSimulation([], W, H, 42);
    expect(state.nodes).toHaveLength(0);
    expect(state.energy).toBe(0);
  });
});

describe('stepSimulation', () => {
  const initial = initSimulation(rawNodes, W, H, 42);

  it('returns the same node count', () => {
    const next = stepSimulation(initial, W, H);
    expect(next.nodes).toHaveLength(initial.nodes.length);
  });

  it('does not mutate the input state', () => {
    const origX = initial.nodes[0].x;
    const origY = initial.nodes[0].y;
    stepSimulation(initial, W, H);
    expect(initial.nodes[0].x).toBe(origX);
    expect(initial.nodes[0].y).toBe(origY);
  });

  it('nodes move after a step (forces applied)', () => {
    const next = stepSimulation(initial, W, H);
    const moved = next.nodes.filter(
      (n, i) =>
        Math.abs(n.x - initial.nodes[i].x) > 0.0001 ||
        Math.abs(n.y - initial.nodes[i].y) > 0.0001,
    );
    expect(moved.length).toBeGreaterThan(0);
  });

  it('energy is a non-negative finite number', () => {
    const next = stepSimulation(initial, W, H);
    expect(next.energy).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(next.energy)).toBe(true);
  });

  it('positions remain finite over 50 steps', () => {
    let s = initial;
    for (let i = 0; i < 50; i++) s = stepSimulation(s, W, H);
    for (const n of s.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it('connected nodes converge when placed far apart', () => {
    const farNodes: RawNode[] = [
      { id: 'x', label: 'X', kind: 'person', connections: ['y'] },
      { id: 'y', label: 'Y', kind: 'org',    connections: ['x'] },
    ];
    const s0: SimulationState = {
      nodes: [
        { ...farNodes[0], x: 10,      y: H / 2, vx: 0, vy: 0 },
        { ...farNodes[1], x: W - 10,  y: H / 2, vx: 0, vy: 0 },
      ],
      energy: 0,
    };
    const distBefore = Math.abs(s0.nodes[1].x - s0.nodes[0].x);
    let s = s0;
    for (let i = 0; i < 100; i++) s = stepSimulation(s, W, H);
    const distAfter = Math.abs(s.nodes[1].x - s.nodes[0].x);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('unconnected nodes pushed apart when placed at the same point', () => {
    const closeNodes: RawNode[] = [
      { id: 'p', label: 'P', kind: 'person', connections: [] },
      { id: 'q', label: 'Q', kind: 'org',    connections: [] },
    ];
    const s0: SimulationState = {
      nodes: [
        { ...closeNodes[0], x: W / 2, y: H / 2, vx: 0, vy: 0 },
        { ...closeNodes[1], x: W / 2 + 1, y: H / 2, vx: 0, vy: 0 },
      ],
      energy: 0,
    };
    const distBefore = 1;
    let s = s0;
    for (let i = 0; i < 20; i++) s = stepSimulation(s, W, H);
    const distAfter = Math.sqrt(
      (s.nodes[1].x - s.nodes[0].x) ** 2 + (s.nodes[1].y - s.nodes[0].y) ** 2,
    );
    expect(distAfter).toBeGreaterThan(distBefore);
  });
});

describe('runToStability', () => {
  const initial = initSimulation(rawNodes, W, H, 42);

  it('returns state with finite energy', () => {
    const stable = runToStability(initial, W, H);
    expect(Number.isFinite(stable.energy)).toBe(true);
  });

  it('does not mutate the original state', () => {
    const origX = initial.nodes[0].x;
    runToStability(initial, W, H);
    expect(initial.nodes[0].x).toBe(origX);
  });

  it('positions remain finite after full stability run', () => {
    const stable = runToStability(initial, W, H);
    for (const n of stable.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it('energy after stability run is less than after 1 step (simulation converges)', () => {
    const after1 = stepSimulation(initial, W, H);
    const stable = runToStability(initial, W, H);
    expect(stable.energy).toBeLessThan(after1.energy + 1);
  });

  it('respects maxSteps override', () => {
    const s = runToStability(initial, W, H, 1);
    const oneStep = stepSimulation(initial, W, H);
    expect(s.nodes[0].x).toBeCloseTo(oneStep.nodes[0].x, 5);
  });
});
