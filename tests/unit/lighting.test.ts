import { describe, it, expect } from 'vitest';
import { bobOffset, lowHealthVignette, nightAlpha } from '../../src/world/lighting';

describe('lighting', () => {
  it('is dark at midnight and clear at noon', () => {
    expect(nightAlpha(0)).toBeCloseTo(0.55, 2);
    expect(nightAlpha(720)).toBeCloseTo(0, 2);
  });
  it('ramps through dusk', () => {
    expect(nightAlpha(1080)).toBeGreaterThan(0);
    expect(nightAlpha(1080)).toBeLessThan(0.55);
  });
  it('only shows the vignette below 30 hp', () => {
    expect(lowHealthVignette(100)).toBe(0);
    expect(lowHealthVignette(20)).toBeGreaterThan(0);
    expect(lowHealthVignette(0)).toBeLessThanOrEqual(0.2);
  });
  it('bobs by at most one pixel', () => {
    expect([0, 1]).toContain(bobOffset(0));
    expect([0, 1]).toContain(bobOffset(125));
  });
});
