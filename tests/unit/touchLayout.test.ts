import { describe, it, expect } from 'vitest';
import { TOUCH, isTouchControlPoint } from '../../src/ui/touchLayout';

describe('touch layout', () => {
  it('marks the joystick and action buttons as control areas', () => {
    expect(isTouchControlPoint(TOUCH.joystick.x, TOUCH.joystick.y)).toBe(true);
    expect(isTouchControlPoint(TOUCH.joystick.x + 40, TOUCH.joystick.y)).toBe(false);
    for (const button of [TOUCH.attack, TOUCH.interact, TOUCH.sprint, TOUCH.menu]) {
      expect(isTouchControlPoint(button.x, button.y), button.label).toBe(true);
    }
  });

  it('ignores the playfield and corners', () => {
    expect(isTouchControlPoint(320, 180)).toBe(false);
    expect(isTouchControlPoint(0, 0)).toBe(false);
    expect(isTouchControlPoint(640, 360)).toBe(false);
  });
});
