import { describe, it, expect } from 'vitest';
import { barWidth, hotbarSlotRect, panelRect } from '../../src/ui/widgets/layout';

describe('ui layout', () => {
  it('clamps bar fill', () => {
    expect(barWidth(50, 100, 86)).toBe(43);
    expect(barWidth(-5, 100, 86)).toBe(0);
    expect(barWidth(200, 100, 86)).toBe(86);
  });
  it('lays out eight hotbar slots', () => {
    expect(hotbarSlotRect(0)).toEqual({ x: 162, y: 312, size: 36 });
    expect(hotbarSlotRect(7)).toEqual({ x: 162 + 7 * 40, y: 312, size: 36 });
  });
  it('uses the approved panel rectangles', () => {
    expect(panelRect('inventory')).toEqual({ x: 40, y: 12, w: 560, h: 336 });
    expect(panelRect('map')).toEqual({ x: 24, y: 16, w: 592, h: 328 });
  });
});
