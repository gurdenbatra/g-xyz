// src/lib/scatter.ts
// Deterministic note-card positioning for the Canopy scattered notes layout.
// Uses an LCG hash to derive column, x-offset, y, and rotation from a slug.

export const KIND_STYLE: Record<string, { bg: string; fg: string }> = {
  poem:  { bg: '#4a6e39', fg: '#f1e8d0' },
  essay: { bg: '#D9A857', fg: '#1A1A1A' },
  music: { bg: '#8A4F2E', fg: '#f1e8d0' },
  av:    { bg: '#2a3a5a', fg: '#f1e8d0' },
};

const W_REF = 900;
const COL_W = W_REF / 4; // 225px per column (4 columns)

// LCG hash — deterministic unsigned 32-bit integer from a number
export function lcg(n: number): number {
  return ((n * 1664525 + 1013904223) & 0xffffffff) >>> 0;
}

// Hash a slug string to a deterministic unsigned integer
export function slugHash(slug: string): number {
  return slug.split('').reduce((h, c) => lcg(h ^ c.charCodeAt(0)), 0);
}

export interface NotePosition {
  leftPct: string; // percentage string e.g. "33.33"
  topPx:   number; // 20–499
  r:       number; // -8 to +8 degrees
  bg:      string;
  fg:      string;
}

export function positionNote(slug: string, kind: string): NotePosition {
  const h = slugHash(slug);
  const col   = h % 4;
  const xPx   = col * COL_W + ((h >>> 4)  % Math.floor(COL_W * 0.5));
  const topPx = 20 +          ((h >>> 8)  % 480);
  const r     =               ((h >>> 12) % 17) - 8;
  const leftPct = ((xPx / W_REF) * 100).toFixed(2);
  const { bg, fg } = KIND_STYLE[kind] ?? KIND_STYLE.poem;
  return { leftPct, topPx, r, bg, fg };
}
