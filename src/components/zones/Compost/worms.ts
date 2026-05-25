export interface WormDef {
  id: string;
  layerDepth: number; // 0 = surface … 3 = deepest
  seed: number;       // positive integer — deterministic position seed
  anecdote: string;
}

/**
 * Returns a deterministic base x-position in [0.1, 0.9] for a given seed.
 * Uses an LCG hash: (seed * 1664525 + 1013904223) & 0xffffffff
 */
export function wormBaseX(seed: number): number {
  const hash = ((seed * 1664525 + 1013904223) & 0xffffffff) >>> 0;
  // Normalise unsigned 32-bit int to [0, 1], then scale to [0.1, 0.9]
  return 0.1 + (hash / 0xffffffff) * 0.8;
}

/**
 * Returns a sinusoidal wiggle offset for a worm at a given elapsed time (ms).
 * speed = 0.0008 + (seed % 5) * 0.0001
 * amplitude = 0.04 + (seed % 4) * 0.008
 */
export function wormWiggle(seed: number, t: number): number {
  const speed = 0.0008 + (seed % 5) * 0.0001;
  const amplitude = 0.04 + (seed % 4) * 0.008;
  return Math.sin(t * speed + seed) * amplitude;
}

/**
 * Returns the clamped x-position [0.05, 0.95] for a worm at elapsed time t.
 */
export function wormX(seed: number, t: number): number {
  const raw = wormBaseX(seed) + wormWiggle(seed, t);
  return Math.max(0.05, Math.min(0.95, raw));
}

const WORM_RX = 5;
const WORM_RY = 22;
const WORM_TILT = 0.18;
const HIT_X = 18;
const HIT_Y = 28;
const FILL_COLOR = 'rgba(241,232,208,0.82)';
const STROKE_COLOR = 'rgba(138,79,46,0.55)';

function yJitter(seed: number): number {
  return ((seed * 17) % 21) - 10;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  worms: WormDef[],
  layerMidpoints: number[],
  t: number,
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const worm of worms) {
    const x = wormX(worm.seed, t) * canvas.width;
    const y = (layerMidpoints[worm.layerDepth] ?? 0) + yJitter(worm.seed);

    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.ellipse(0, 0, WORM_RX, WORM_RY, WORM_TILT, 0, Math.PI * 2);
    ctx.fillStyle = FILL_COLOR;
    ctx.fill();
    ctx.strokeStyle = STROKE_COLOR;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Mounts the worm canvas animation.
 * Returns a cleanup function that cancels animation and removes event listeners.
 */
export function mount(
  canvas: HTMLCanvasElement,
  worms: WormDef[],
  layerMidpoints: number[],
  reducedMotion: boolean,
  onAnecdote: (worm: WormDef, clientX: number, clientY: number) => void,
): () => void {
  // ctx may be null in test environments (jsdom does not implement canvas)
  const ctx = canvas.getContext('2d');

  let rafId = 0;
  let startTime: number | null = null;

  function handleClick(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    const elapsed = startTime !== null ? performance.now() - startTime : 0;

    for (const worm of worms) {
      const wx = wormX(worm.seed, elapsed) * canvas.width;
      const wy = (layerMidpoints[worm.layerDepth] ?? 0) + yJitter(worm.seed);

      if (Math.abs(canvasX - wx) <= HIT_X && Math.abs(canvasY - wy) <= HIT_Y) {
        onAnecdote(worm, event.clientX, event.clientY);
        break;
      }
    }
  }

  canvas.addEventListener('click', handleClick);

  if (ctx) {
    if (reducedMotion) {
      drawFrame(ctx, canvas, worms, layerMidpoints, 0);
    } else {
      function loop(timestamp: number): void {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        drawFrame(ctx!, canvas, worms, layerMidpoints, elapsed);
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
    }
  }

  return function cleanup(): void {
    if (rafId) cancelAnimationFrame(rafId);
    canvas.removeEventListener('click', handleClick);
  };
}
