import { describe, it, expect } from 'vitest';
import { createBee, stepBee } from './bee';

describe('createBee', () => {
  it('starts at origin with zero velocity', () => {
    const bee = createBee();
    expect(bee.x).toBe(0);
    expect(bee.y).toBe(0);
    expect(bee.targetX).toBe(0);
    expect(bee.targetY).toBe(0);
  });

  it('accepts an initial position', () => {
    const bee = createBee({ x: 10, y: 20 });
    expect(bee.x).toBe(10);
    expect(bee.y).toBe(20);
  });
});

describe('stepBee', () => {
  it('moves the bee a fraction of the way toward the target', () => {
    const bee = { x: 0, y: 0, targetX: 100, targetY: 0 };
    const next = stepBee(bee, 0.1);
    expect(next.x).toBeCloseTo(10);
    expect(next.y).toBeCloseTo(0);
  });

  it('does not mutate the input bee', () => {
    const bee = { x: 0, y: 0, targetX: 100, targetY: 100 };
    stepBee(bee, 0.5);
    expect(bee.x).toBe(0);
    expect(bee.y).toBe(0);
  });

  it('converges toward target across multiple steps', () => {
    let bee = { x: 0, y: 0, targetX: 100, targetY: 0 };
    for (let i = 0; i < 60; i++) bee = stepBee(bee, 0.1);
    expect(bee.x).toBeGreaterThan(99);
    expect(bee.x).toBeLessThanOrEqual(100);
  });

  it('updates target via setTarget without mutating prior state', () => {
    const bee = { x: 5, y: 5, targetX: 0, targetY: 0 };
    const next = stepBee({ ...bee, targetX: 50, targetY: 50 }, 0.1);
    expect(next.x).toBeCloseTo(9.5);
    expect(next.y).toBeCloseTo(9.5);
  });
});
