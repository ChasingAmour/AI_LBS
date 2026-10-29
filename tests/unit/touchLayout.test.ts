import { describe, it, expect } from 'vitest';
import { TOUCH, TOUCH_HOTBAR, isTouchControlPoint } from '../../src/ui/touchLayout';

describe('touch layout', () => {
  it('marks the joystick ring and action buttons as control areas', () => {
    expect(isTouchControlPoint(TOUCH.joystick.x, TOUCH.joystick.y)).toBe(true);
    expect(isTouchControlPoint(TOUCH.joystick.x + 40, TOUCH.joystick.y)).toBe(true);
    expect(isTouchControlPoint(TOUCH.joystick.x + 65, TOUCH.joystick.y)).toBe(false);
    for (const button of [TOUCH.attack, TOUCH.interact, TOUCH.sprint, TOUCH.menu]) {
      expect(isTouchControlPoint(button.x, button.y), button.label).toBe(true);
    }
  });

  it('ignores the playfield and corners', () => {
    expect(isTouchControlPoint(320, 180)).toBe(false);
    expect(isTouchControlPoint(400, 180)).toBe(false);
    expect(isTouchControlPoint(0, 0)).toBe(false);
    expect(isTouchControlPoint(640, 360)).toBe(false);
  });

  it('reserves the hotbar so tapping a slot does not place a building', () => {
    expect(isTouchControlPoint(TOUCH_HOTBAR.x + 4, TOUCH_HOTBAR.y + 4)).toBe(true);
    expect(isTouchControlPoint(TOUCH_HOTBAR.x + TOUCH_HOTBAR.w - 4, TOUCH_HOTBAR.y + 4)).toBe(true);
  });
});
