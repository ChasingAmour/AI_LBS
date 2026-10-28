import { describe, it, expect } from 'vitest';
import { clampTooltip } from '../../src/ui/widgets/tooltip';

describe('clampTooltip', () => {
  it('keeps the tooltip inside the screen', () => {
    expect(clampTooltip(630, 350, 200, 92, 640, 360)).toEqual({ x: 440, y: 268 });
  });
  it('leaves room when the cursor is near the top-left', () => {
    expect(clampTooltip(0, 0, 200, 92, 640, 360)).toEqual({ x: 0, y: 0 });
  });
  it('flips to the left of the cursor when needed', () => {
    const out = clampTooltip(600, 100, 200, 92, 640, 360);
    expect(out.x).toBeLessThanOrEqual(440);
  });
});
