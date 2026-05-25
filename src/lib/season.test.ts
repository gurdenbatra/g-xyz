import { describe, it, expect } from 'vitest';
import { seasonFor } from './season';

describe('seasonFor (northern hemisphere)', () => {
  it('returns spring for March', () => {
    expect(seasonFor(new Date('2026-03-15T12:00:00'))).toBe('spring');
  });

  it('returns spring for May', () => {
    expect(seasonFor(new Date('2026-05-31T12:00:00'))).toBe('spring');
  });

  it('returns summer for June', () => {
    expect(seasonFor(new Date('2026-06-01T12:00:00'))).toBe('summer');
  });

  it('returns summer for August', () => {
    expect(seasonFor(new Date('2026-08-31T12:00:00'))).toBe('summer');
  });

  it('returns autumn for September', () => {
    expect(seasonFor(new Date('2026-09-01T12:00:00'))).toBe('autumn');
  });

  it('returns autumn for November', () => {
    expect(seasonFor(new Date('2026-11-30T12:00:00'))).toBe('autumn');
  });

  it('returns winter for December', () => {
    expect(seasonFor(new Date('2026-12-15T12:00:00'))).toBe('winter');
  });

  it('returns winter for January', () => {
    expect(seasonFor(new Date('2026-01-15T12:00:00'))).toBe('winter');
  });

  it('returns winter for February (incl. leap day)', () => {
    expect(seasonFor(new Date('2024-02-29T12:00:00'))).toBe('winter');
  });
});
