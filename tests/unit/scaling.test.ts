import { describe, it, expect } from 'vitest';
import { integerScale } from '../../src/core/scaling';

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
