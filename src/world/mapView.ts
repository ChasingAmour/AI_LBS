import { WORLD } from '../core/config';
import { EXPLORED_COLS, EXPLORED_ROWS } from '../core/explored';

export interface MapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Map viewport inside the 592×328 parchment panel. */
export const MAP_RECT: MapRect = { x: 40, y: 70, w: 400, h: 240 };

export function worldToMap(wx: number, wy: number, rect: MapRect): { x: number; y: number } {
  return {
    x: rect.x + (wx / WORLD.widthPx) * rect.w,
    y: rect.y + (wy / WORLD.heightPx) * rect.h,
  };
}

export function mapToWorld(mx: number, my: number, rect: MapRect): { x: number; y: number } {
  return {
    x: ((mx - rect.x) / rect.w) * WORLD.widthPx,
    y: ((my - rect.y) / rect.h) * WORLD.heightPx,
  };
}

/** Percentage of the 20×12 chunk grid the player has explored. */
export function explorePercent(explored: Set<string>): number {
  return Math.round((explored.size / (EXPLORED_COLS * EXPLORED_ROWS)) * 100);
}
