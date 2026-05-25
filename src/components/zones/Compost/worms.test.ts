// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { wormBaseX, wormWiggle, wormX, mount } from './worms';

describe('wormBaseX', () => {
  it('returns a value in [0.1, 0.9]', () => {
    for (const seed of [0, 1, 7, 13, 42, 99, 1000]) {
      const x = wormBaseX(seed);
      expect(x).toBeGreaterThanOrEqual(0.1);
      expect(x).toBeLessThanOrEqual(0.9);
    }
  });

  it('is deterministic for the same seed', () => {
    expect(wormBaseX(7)).toBe(wormBaseX(7));
    expect(wormBaseX(42)).toBe(wormBaseX(42));
  });

  it('produces different values for different seeds', () => {
    expect(wormBaseX(7)).not.toBe(wormBaseX(13));
    expect(wormBaseX(1)).not.toBe(wormBaseX(2));
  });
});

describe('wormWiggle', () => {
  it('returns a finite number at any time', () => {
    for (const t of [0, 100, 500, 1000, 9999]) {
      expect(Number.isFinite(wormWiggle(7, t))).toBe(true);
    }
  });

  it('is deterministic for same seed + time', () => {
    expect(wormWiggle(42, 500)).toBe(wormWiggle(42, 500));
  });

  it('changes over time (not stuck at zero)', () => {
    const v1 = wormWiggle(7, 0);
    const v2 = wormWiggle(7, 3000);
    expect(v1).not.toBe(v2);
  });
});

describe('wormX', () => {
  it('stays in [0.05, 0.95] at many time points', () => {
    for (const t of [0, 250, 1000, 5000, 10000]) {
      const x = wormX(7, t);
      expect(x).toBeGreaterThanOrEqual(0.05);
      expect(x).toBeLessThanOrEqual(0.95);
    }
  });

  it('is deterministic for same seed + time', () => {
    expect(wormX(13, 750)).toBe(wormX(13, 750));
  });
});

describe('mount', () => {
  function makeCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    return canvas;
  }

  it('returns a cleanup function', () => {
    const canvas = makeCanvas();
    const worms = [{ id: 'w0', layerDepth: 0, seed: 7, anecdote: 'test' }];
    const cleanup = mount(canvas, worms, [100, 250, 400, 550], false, () => {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('cleanup cancels RAF (no throws after cleanup)', () => {
    const canvas = makeCanvas();
    const worms = [{ id: 'w0', layerDepth: 1, seed: 13, anecdote: 'hi' }];
    const cleanup = mount(canvas, worms, [150, 300, 450, 550], false, () => {});
    expect(() => cleanup()).not.toThrow();
  });

  it('with reducedMotion=true, cleanup does not throw', () => {
    const canvas = makeCanvas();
    const worms = [{ id: 'w0', layerDepth: 2, seed: 42, anecdote: 'hi' }];
    const cleanup = mount(canvas, worms, [100, 250, 400, 550], true, () => {});
    expect(() => cleanup()).not.toThrow();
  });

  it('calls onAnecdote when click lands on a worm region', () => {
    const canvas = makeCanvas();
    const seed = 7;
    const layerMidpoints = [100, 300, 450, 550];
    const worms = [{ id: 'w0', layerDepth: 0, seed, anecdote: 'test anecdote' }];
    const spy = vi.fn();
    mount(canvas, worms, layerMidpoints, true, spy);

    const expectedX = wormX(seed, 0) * canvas.width;
    const expectedY = layerMidpoints[0];
    const fakeRect = { left: 0, top: 0, width: canvas.width, height: canvas.height } as DOMRect;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(fakeRect);

    const clickEvent = new MouseEvent('click', { clientX: expectedX, clientY: expectedY });
    canvas.dispatchEvent(clickEvent);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'w0', anecdote: 'test anecdote' }),
      expectedX,
      expectedY,
    );
  });
});
