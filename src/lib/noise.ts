// src/lib/noise.ts
// Deterministic 2D value-noise. Lattice points hashed; bilinear-smoothed
// between them with a smoothstep curve. No dependencies, no globals.

function hash(ix: number, iy: number): number {
  // Mulberry32-ish 2D integer mix → returns [-1, 1]
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 2D value-noise in the range [-1, 1]. Smooth and deterministic. */
export function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const v00 = hash(ix, iy);
  const v10 = hash(ix + 1, iy);
  const v01 = hash(ix, iy + 1);
  const v11 = hash(ix + 1, iy + 1);

  const sx = smoothstep(fx);
  const sy = smoothstep(fy);

  const a = v00 + (v10 - v00) * sx;
  const b = v01 + (v11 - v01) * sx;
  return a + (b - a) * sy;
}
