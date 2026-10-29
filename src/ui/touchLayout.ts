/** Fixed 640×360 touch geometry, shared by rendering and pointer filtering. */

export interface TouchButton {
  x: number;
  y: number;
  radius: number;
  label: string;
}

export const TOUCH = {
  joystick: { x: 64, y: 300, radius: 34, drag: 60 },
  attack: { x: 604, y: 252, radius: 26, label: '攻' },
  interact: { x: 548, y: 294, radius: 22, label: 'E' },
  sprint: { x: 500, y: 296, radius: 16, label: '跑' },
  menu: { x: 604, y: 196, radius: 18, label: '≡' },
} as const;

/** The keyboard hotbar is still tappable on phones; it must not place buildings. */
export const TOUCH_HOTBAR = { x: 162, y: 312, w: 320, h: 36 } as const;

function inRect(rect: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function inside(point: { x: number; y: number; radius: number }, x: number, y: number): boolean {
  return Math.hypot(x - point.x, y - point.y) <= point.radius;
}

/** True when a pointer is on a virtual control and must not reach the world. */
export function isTouchControlPoint(x: number, y: number): boolean {
  return (
    inside({ ...TOUCH.joystick, radius: TOUCH.joystick.drag }, x, y) ||
    inside(TOUCH.attack, x, y) ||
    inside(TOUCH.interact, x, y) ||
    inside(TOUCH.sprint, x, y) ||
    inside(TOUCH.menu, x, y) ||
    inRect(TOUCH_HOTBAR, x, y)
  );
}

export function isHotbarPoint(x: number, y: number): boolean {
  return inRect(TOUCH_HOTBAR, x, y);
}
