// src/components/zones/Hive/flock.ts
// Pure bee flock simulation for the Live Flock canvas piece.
// No DOM dependencies. Deterministic for a given seed + time.

import { noise2D } from '../../../lib/noise';

export interface RawFlower {
  id: string;
  label: string;
  kind: 'carrying' | 'reading' | 'contact';
  detail: string;
  url?: string;
}

export interface FlowerDef extends RawFlower {
  x: number; // 0–1 (fraction of canvas CSS width)
  y: number; // 0–1 (fraction of canvas CSS height)
}

export interface FlockBee {
  id: number;
  x: number;  // canvas CSS pixels
  y: number;
  vx: number;
  vy: number;
  targetFlower: number | null; // flower index; null = free roaming
  pollenFlower: number | null; // carrying pollen from this flower index
}

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_SPEED    = 1.5;  // px per frame
const MAX_FORCE    = 0.12; // px per frame²
const ARRIVE_R     = 30;   // px — slow down within this radius of target
const POLLEN_R     = 20;   // px — pick up / deliver pollen within this radius
const FLOW_SCALE   = 0.004; // spatial scale of noise flow field
const FLOW_SPEED   = 0.0001; // temporal evolution of flow field
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.399 rad (137.5°)

// ── Helpers ──────────────────────────────────────────────────────────────────

/** LCG hash for deterministic seeding */
function lcg(n: number): number {
  return ((n * 1664525 + 1013904223) & 0xffffffff) >>> 0;
}

function clampMag(vx: number, vy: number, max: number): [number, number] {
  const mag = Math.sqrt(vx * vx + vy * vy);
  if (mag < 0.001 || mag <= max) return [vx, vy];
  return [(vx / mag) * max, (vy / mag) * max];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Deterministically places flowers using a sunflower phyllotaxis layout.
 * Positions are normalized to [0.1, 0.9] × [0.15, 0.85].
 */
export function layoutFlowers(rawFlowers: RawFlower[], _w: number, _h: number): FlowerDef[] {
  const count = rawFlowers.length;
  if (count === 0) return [];
  return rawFlowers.map((raw, i) => {
    const r     = 0.32 * Math.sqrt((i + 0.5) / count);
    const angle = i * GOLDEN_ANGLE;
    const x = Math.max(0.1, Math.min(0.9,  0.5 + r * Math.cos(angle)));
    const y = Math.max(0.15, Math.min(0.85, 0.5 + r * Math.sin(angle)));
    return { ...raw, x, y };
  });
}

/**
 * Creates a flock of `count` bees with deterministic positions/velocities.
 */
export function createFlock(count: number, w: number, h: number, seed: number): FlockBee[] {
  const bees: FlockBee[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = lcg(s); const x  = (s / 0xffffffff) * w;
    s = lcg(s); const y  = (s / 0xffffffff) * h;
    s = lcg(s); const vx = ((s / 0xffffffff) * 2 - 1) * MAX_SPEED * 0.5;
    s = lcg(s); const vy = ((s / 0xffffffff) * 2 - 1) * MAX_SPEED * 0.5;
    bees.push({ id: i, x, y, vx, vy, targetFlower: null, pollenFlower: null });
  }
  return bees;
}

/**
 * Pure simulation step — returns a NEW array of bees.
 * hoveredFlower: index of the flower being hovered (null = free roam).
 * t: elapsed ms since mount.
 */
export function stepFlock(
  bees: FlockBee[],
  flowers: FlowerDef[],
  w: number,
  h: number,
  t: number,
  hoveredFlower: number | null,
): FlockBee[] {
  return bees.map((bee) => {
    let { x, y, vx, vy, pollenFlower } = bee;

    // Target = hovered flower (or null = free roam). Simple: all bees
    // immediately target on hover, immediately release on leave.
    const newTarget = hoveredFlower;

    let fx = 0;
    let fy = 0;

    if (newTarget !== null && newTarget < flowers.length) {
      // ── Steering toward flower ──────────────────────────────────────────
      const flower = flowers[newTarget];
      const tx   = flower.x * w;
      const ty   = flower.y * h;
      const dx   = tx - x;
      const dy   = ty - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        const speed    = dist < ARRIVE_R ? (dist / ARRIVE_R) * MAX_SPEED : MAX_SPEED;
        const desiredX = (dx / dist) * speed;
        const desiredY = (dy / dist) * speed;
        fx = desiredX - vx;
        fy = desiredY - vy;
      }

      // Pollen pickup / delivery
      let newPollen = pollenFlower;
      if (dist < POLLEN_R) {
        if (pollenFlower === null) {
          newPollen = newTarget;            // pick up pollen
        } else if (pollenFlower !== newTarget) {
          newPollen = null;                 // deliver pollen
        }
      }
      pollenFlower = newPollen;
    } else {
      // ── Free roaming — Perlin flow field ──────────────────────────────
      const angle = noise2D(x * FLOW_SCALE + t * FLOW_SPEED, y * FLOW_SCALE) * Math.PI * 2;
      fx = Math.cos(angle) * 0.05;
      fy = Math.sin(angle) * 0.05;
    }

    // Apply force (clamped) → integrate velocity (clamped) → integrate position
    const [cfx, cfy] = clampMag(fx, fy, MAX_FORCE);
    vx += cfx;
    vy += cfy;
    const [nvx, nvy] = clampMag(vx, vy, MAX_SPEED);
    vx = nvx;
    vy = nvy;
    x += vx;
    y += vy;

    // Wrap edges with a 20px margin so bees re-enter smoothly
    const M = 20;
    if (x < -M)    x += w + M * 2;
    else if (x > w + M) x -= w + M * 2;
    if (y < -M)    y += h + M * 2;
    else if (y > h + M) y -= h + M * 2;

    return { ...bee, x, y, vx, vy, targetFlower: newTarget, pollenFlower };
  });
}
