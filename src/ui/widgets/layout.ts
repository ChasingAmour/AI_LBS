/** Fixed 640×360 HUD geometry, shared by the widgets and the tests. */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const HUD = {
  clock: { x: 8, y: 8, w: 168, h: 30 },
  banner: { x: 184, y: 8, w: 296, h: 30 },
  camp: { x: 492, y: 8, w: 140, h: 30 },
  status: { x: 168, y: 280, w: 304, h: 26 },
  statusCompact: { x: 168, y: 280, w: 304, h: 26 },
  goal: { x: 8, y: 44, w: 176, h: 26 },
  goalCompact: { x: 8, y: 44, w: 176, h: 26 },
  prompt: { x: 426, y: 230, w: 88, h: 24 },
} as const;

const PANELS: Record<'inventory' | 'map' | 'pause', Rect> = {
  inventory: { x: 40, y: 12, w: 560, h: 336 },
  map: { x: 24, y: 16, w: 592, h: 328 },
  pause: { x: 220, y: 100, w: 200, h: 160 },
};

export function panelRect(kind: 'inventory' | 'map' | 'pause'): Rect {
  return { ...PANELS[kind] };
}

/** Width of a 0..max value inside a fixed-width bar, clamped to the bar. */
export function barWidth(value: number, max: number, width: number): number {
  if (max <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, value / max));
  return Math.round(ratio * width);
}

export const HOTBAR = {
  startX: 162,
  y: 312,
  size: 36,
  gap: 4,
} as const;

export function hotbarSlotRect(index: number): { x: number; y: number; size: number } {
  return {
    x: HOTBAR.startX + index * (HOTBAR.size + HOTBAR.gap),
    y: HOTBAR.y,
    size: HOTBAR.size,
  };
}
