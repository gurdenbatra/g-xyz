export const GROUND_CHARS = ['.', "'", ',', '-', '~'] as const;
export const SPROUT_CHAR = '"';

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function groundHeight(i: number, t: number): number {
  const a = Math.sin(i * 0.35 + t * 1.1);
  const b = Math.sin(i * 0.13 - t * 0.7 + 2.1);
  const j = hash01(i) * 0.3;
  return Math.min(1, Math.max(0, 0.5 + 0.32 * a + 0.18 * b + j - 0.15));
}

export function groundFrame(width: number, t: number): string {
  if (width <= 0) return '';
  let out = '';
  for (let i = 0; i < width; i++) {
    const h = groundHeight(i, t);
    if (h > 0.93 && hash01(i * 7 + 3) > 0.6) {
      out += SPROUT_CHAR;
      continue;
    }
    const idx = Math.min(GROUND_CHARS.length - 1, Math.floor(h * GROUND_CHARS.length));
    out += GROUND_CHARS[idx];
  }
  return out;
}

export interface CharMetric {
  char: string;
  width: number;
  brightness: number;
}

export function pickChar(
  candidates: readonly CharMetric[],
  targetBrightness: number,
  targetWidth: number,
): string {
  if (candidates.length === 0) {
    throw new Error('pickChar: candidates must not be empty');
  }
  let best = candidates[0];
  let bestScore = Infinity;
  for (const c of candidates) {
    const widthErr = Math.abs(c.width - targetWidth) / Math.max(targetWidth, 1);
    const score = Math.abs(c.brightness - targetBrightness) + 0.6 * widthErr;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best.char;
}
