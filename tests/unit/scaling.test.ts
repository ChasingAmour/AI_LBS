import { describe, it, expect } from 'vitest';
import { fitScale, integerScale } from '../../src/core/scaling';

describe('integerScale', () => {
  it('uses 3x at 1920x1080', () => {
    expect(integerScale(1920, 1080)).toEqual({ scale: 3, offsetX: 0, offsetY: 0 });
  });
  it('letterboxes 1366x768 at 2x', () => {
    expect(integerScale(1366, 768)).toEqual({ scale: 2, offsetX: 43, offsetY: 24 });
  });
  it('uses 6x at 3840x2160', () => {
    expect(integerScale(3840, 2160)).toEqual({ scale: 6, offsetX: 0, offsetY: 0 });
  });
  it('never goes below 1x', () => {
    expect(integerScale(500, 300)).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });
});

describe('fitScale', () => {
  it('fills a landscape phone with a fractional scale', () => {
    const result = fitScale(844, 390);
    expect(result.scale).toBeCloseTo(1.0833, 3);
    expect(result.offsetX).toBe(75);
    expect(result.offsetY).toBe(0);
  });

  it('letterboxes a portrait phone', () => {
    const result = fitScale(390, 844);
    expect(result.scale).toBeCloseTo(0.6094, 3);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(312);
  });

  it('caps large displays at maxScale', () => {
    expect(fitScale(3840, 2160, 2.5).scale).toBe(2.5);
  });

  it('never shrinks below 0.5', () => {
    expect(fitScale(320, 180).scale).toBe(0.5);
  });
});
