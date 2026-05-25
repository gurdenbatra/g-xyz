export interface BeeState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

export function createBee(init: Partial<BeeState> = {}): BeeState {
  return {
    x: init.x ?? 0,
    y: init.y ?? 0,
    targetX: init.targetX ?? init.x ?? 0,
    targetY: init.targetY ?? init.y ?? 0,
  };
}

/**
 * Pure step: returns a new BeeState with position lerped toward target.
 * Lerp factor is clamped to [0, 1].
 */
export function stepBee(bee: BeeState, lerp: number): BeeState {
  const t = Math.max(0, Math.min(1, lerp));
  return {
    x: bee.x + (bee.targetX - bee.x) * t,
    y: bee.y + (bee.targetY - bee.y) * t,
    targetX: bee.targetX,
    targetY: bee.targetY,
  };
}
