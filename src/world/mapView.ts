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

/** 1× shows the whole island, 2× shows the half around `center`. */
export interface MapView {
  zoom: number;
  centerX: number;
  centerY: number;
}

export const MIN_MAP_ZOOM = 1;
export const MAX_MAP_ZOOM = 2;

export function defaultMapView(): MapView {
  return { zoom: 1, centerX: WORLD.widthPx / 2, centerY: WORLD.heightPx / 2 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Keeps zoom in range and the viewport inside the world bounds. */
export function clampMapView(view: MapView): MapView {
  const zoom = clamp(view.zoom, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
  const halfW = WORLD.widthPx / (2 * zoom);
  const halfH = WORLD.heightPx / (2 * zoom);
  return {
    zoom,
    centerX: clamp(view.centerX, halfW, WORLD.widthPx - halfW),
    centerY: clamp(view.centerY, halfH, WORLD.heightPx - halfH),
  };
}

/** World rectangle currently visible inside the map panel. */
export function visibleWorldRect(view: MapView): MapRect {
  const safe = clampMapView(view);
  const w = WORLD.widthPx / safe.zoom;
  const h = WORLD.heightPx / safe.zoom;
  return { x: safe.centerX - w / 2, y: safe.centerY - h / 2, w, h };
}

export function worldToMap(
  wx: number,
  wy: number,
  rect: MapRect,
  view: MapView = defaultMapView(),
): { x: number; y: number } {
  const world = visibleWorldRect(view);
  return {
    x: rect.x + ((wx - world.x) / world.w) * rect.w,
    y: rect.y + ((wy - world.y) / world.h) * rect.h,
  };
}

export function mapToWorld(
  mx: number,
  my: number,
  rect: MapRect,
  view: MapView = defaultMapView(),
): { x: number; y: number } {
  const world = visibleWorldRect(view);
  return {
    x: world.x + ((mx - rect.x) / rect.w) * world.w,
    y: world.y + ((my - rect.y) / rect.h) * world.h,
  };
}

/** Zooms while keeping `anchorWorld` under the same panel pixel. */
export function zoomMapAt(
  anchorWorld: { x: number; y: number },
  anchorPx: { x: number; y: number },
  rect: MapRect,
  zoom: number,
): MapView {
  const next = clamp(zoom, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
  const worldW = WORLD.widthPx / next;
  const worldH = WORLD.heightPx / next;
  return clampMapView({
    zoom: next,
    centerX: anchorWorld.x - worldW * ((anchorPx.x - rect.x) / rect.w - 0.5),
    centerY: anchorWorld.y - worldH * ((anchorPx.y - rect.y) / rect.h - 0.5),
  });
}

/** Drags the map by a screen-pixel delta (content follows the pointer). */
export function panMap(view: MapView, dxPx: number, dyPx: number, rect: MapRect): MapView {
  const worldW = WORLD.widthPx / view.zoom;
  const worldH = WORLD.heightPx / view.zoom;
  return clampMapView({
    zoom: view.zoom,
    centerX: view.centerX - (dxPx / rect.w) * worldW,
    centerY: view.centerY - (dyPx / rect.h) * worldH,
  });
}

/** Percentage of the 20×12 chunk grid the player has explored. */
export function explorePercent(explored: Set<string>): number {
  return Math.round((explored.size / (EXPLORED_COLS * EXPLORED_ROWS)) * 100);
}
