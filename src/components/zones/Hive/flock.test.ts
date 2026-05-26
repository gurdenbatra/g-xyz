import { describe, it, expect } from 'vitest';
import { createFlock, layoutFlowers, stepFlock } from './flock';
import type { RawFlower, FlockBee } from './flock';

const rawFlowers: RawFlower[] = [
  { id: 'carrying-0', label: 'Civic Tech', kind: 'carrying', detail: 'Berlin' },
  { id: 'contact-0',  label: 'Email',      kind: 'contact',  detail: 'a@b.com', url: 'mailto:a@b.com' },
  { id: 'reading-0',  label: 'A Book',     kind: 'reading',  detail: 'Some author' },
];

const W = 400;
const H = 300;

describe('layoutFlowers', () => {
  it('returns same count as input', () => {
    expect(layoutFlowers(rawFlowers, W, H)).toHaveLength(rawFlowers.length);
  });

  it('places flowers with x in [0.1, 0.9]', () => {
    for (const f of layoutFlowers(rawFlowers, W, H)) {
      expect(f.x).toBeGreaterThanOrEqual(0.1);
      expect(f.x).toBeLessThanOrEqual(0.9);
    }
  });

  it('places flowers with y in [0.15, 0.85]', () => {
    for (const f of layoutFlowers(rawFlowers, W, H)) {
      expect(f.y).toBeGreaterThanOrEqual(0.15);
      expect(f.y).toBeLessThanOrEqual(0.85);
    }
  });

  it('is deterministic', () => {
    const a = layoutFlowers(rawFlowers, W, H);
    const b = layoutFlowers(rawFlowers, W, H);
    expect(a.map((f) => f.x)).toEqual(b.map((f) => f.x));
    expect(a.map((f) => f.y)).toEqual(b.map((f) => f.y));
  });

  it('returns [] for empty input', () => {
    expect(layoutFlowers([], W, H)).toHaveLength(0);
  });

  it('preserves flower ids and labels', () => {
    const flowers = layoutFlowers(rawFlowers, W, H);
    expect(flowers[0].id).toBe('carrying-0');
    expect(flowers[1].label).toBe('Email');
  });
});

describe('createFlock', () => {
  it('returns the requested count', () => {
    expect(createFlock(10, W, H, 42)).toHaveLength(10);
  });

  it('places bees within canvas bounds', () => {
    for (const b of createFlock(20, W, H, 7)) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(W);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(H);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = createFlock(5, W, H, 99);
    const b = createFlock(5, W, H, 99);
    expect(a.map((bee) => bee.x)).toEqual(b.map((bee) => bee.x));
  });

  it('produces different positions for different seeds', () => {
    const a = createFlock(5, W, H, 1);
    const b = createFlock(5, W, H, 2);
    expect(a[0].x).not.toBe(b[0].x);
  });

  it('assigns unique ids starting at 0', () => {
    const bees = createFlock(5, W, H, 42);
    expect(bees.map((b) => b.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it('initializes targetFlower and pollenFlower to null', () => {
    for (const b of createFlock(3, W, H, 1)) {
      expect(b.targetFlower).toBeNull();
      expect(b.pollenFlower).toBeNull();
    }
  });
});

describe('stepFlock', () => {
  const flowers = layoutFlowers(rawFlowers, W, H);
  const bees = createFlock(5, W, H, 42);

  it('returns the same count', () => {
    expect(stepFlock(bees, flowers, W, H, 0, null)).toHaveLength(bees.length);
  });

  it('does not mutate the input bees', () => {
    const origX = bees[0].x;
    const origY = bees[0].y;
    stepFlock(bees, flowers, W, H, 100, null);
    expect(bees[0].x).toBe(origX);
    expect(bees[0].y).toBe(origY);
  });

  it('bees move over many steps (flow field active)', () => {
    let current = bees;
    for (let i = 0; i < 30; i++) {
      current = stepFlock(current, flowers, W, H, i * 16, null);
    }
    const moved = current.filter(
      (b, i) => Math.abs(b.x - bees[i].x) > 1 || Math.abs(b.y - bees[i].y) > 1,
    );
    expect(moved.length).toBeGreaterThan(0);
  });

  it('assigns hoveredFlower as targetFlower for all bees', () => {
    const next = stepFlock(bees, flowers, W, H, 0, 0);
    for (const b of next) {
      expect(b.targetFlower).toBe(0);
    }
  });

  it('clears targetFlower when hoveredFlower is null', () => {
    const withTarget = bees.map((b) => ({ ...b, targetFlower: 1 }));
    const next = stepFlock(withTarget, flowers, W, H, 0, null);
    for (const b of next) {
      expect(b.targetFlower).toBeNull();
    }
  });

  it('bees steer toward hovered flower over 60 steps', () => {
    // Flower 0: phyllotaxis at index 0 → x ≈ 0.585, y ≈ 0.5 → (234, 150) in 400×300
    const flower = flowers[0];
    const flowerX = flower.x * W;
    const flowerY = flower.y * H;
    const startBees: FlockBee[] = [
      { id: 0, x: 350, y: 250, vx: 0, vy: 0, targetFlower: null, pollenFlower: null },
    ];
    const distBefore = Math.sqrt((350 - flowerX) ** 2 + (250 - flowerY) ** 2);
    let current = startBees;
    for (let i = 0; i < 60; i++) {
      current = stepFlock(current, flowers, W, H, i * 16, 0);
    }
    const distAfter = Math.sqrt((current[0].x - flowerX) ** 2 + (current[0].y - flowerY) ** 2);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('positions remain finite after 100 steps', () => {
    let current = bees;
    for (let i = 0; i < 100; i++) {
      current = stepFlock(current, flowers, W, H, i * 16, null);
    }
    for (const b of current) {
      expect(Number.isFinite(b.x)).toBe(true);
      expect(Number.isFinite(b.y)).toBe(true);
    }
  });
});
