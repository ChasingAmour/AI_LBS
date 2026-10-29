import { describe, it, expect } from 'vitest';
import {
  MAP_RECT,
  clampMapView,
  defaultMapView,
  explorePercent,
  mapToWorld,
  panMap,
  worldToMap,
  zoomMapAt,
} from '../../src/world/mapView';
import { WORLD } from '../../src/core/config';

describe('mapView', () => {
  it('round-trips world and map coordinates', () => {
    const p = worldToMap(5000, 3000, MAP_RECT);
    const back = mapToWorld(p.x, p.y, MAP_RECT);
    expect(back.x).toBeCloseTo(5000, 0);
    expect(back.y).toBeCloseTo(3000, 0);
  });
  it('puts the world origin at the map top-left', () => {
    expect(worldToMap(0, 0, MAP_RECT)).toEqual({ x: 40, y: 70 });
  });
  it('computes exploration percentage over 240 chunks', () => {
    expect(explorePercent(new Set())).toBe(0);
    const all = new Set<string>();
    for (let cy = 0; cy < 12; cy++) for (let cx = 0; cx < 20; cx++) all.add(`${cx},${cy}`);
    expect(explorePercent(all)).toBe(100);
  });

  it('shows the whole island at 1× and half of it at 2×', () => {
    const view = defaultMapView();
    expect(worldToMap(0, 0, MAP_RECT, view)).toEqual({ x: 40, y: 70 });
    expect(worldToMap(WORLD.widthPx, WORLD.heightPx, MAP_RECT, view)).toEqual({
      x: 440,
      y: 310,
    });
    const zoomed = clampMapView({ ...view, zoom: 2 });
    const center = worldToMap(WORLD.widthPx / 2, WORLD.heightPx / 2, MAP_RECT, zoomed);
    expect(center.x).toBeCloseTo(MAP_RECT.x + MAP_RECT.w / 2, 5);
    expect(center.y).toBeCloseTo(MAP_RECT.y + MAP_RECT.h / 2, 5);
    expect(worldToMap(0, 0, MAP_RECT, zoomed).x).toBeCloseTo(40 - 200, 5);
    expect(worldToMap(WORLD.widthPx, 0, MAP_RECT, zoomed).x).toBeCloseTo(40 + 600, 5);
  });

  it('round-trips at 2× and clamps the viewport inside the island', () => {
    const view = clampMapView({ zoom: 2, centerX: 8000, centerY: 1000 });
    const p = worldToMap(8000, 1500, MAP_RECT, view);
    const back = mapToWorld(p.x, p.y, MAP_RECT, view);
    expect(back.x).toBeCloseTo(8000, 5);
    expect(back.y).toBeCloseTo(1500, 5);
    expect(view.centerX).toBeLessThanOrEqual(WORLD.widthPx - WORLD.widthPx / 4);
    expect(view.centerY).toBeGreaterThanOrEqual(WORLD.heightPx / 4);
  });

  it('keeps the anchor under the cursor while zooming', () => {
    const view = defaultMapView();
    const px = { x: 120, y: 120 };
    const anchor = mapToWorld(px.x, px.y, MAP_RECT, view);
    const zoomed = zoomMapAt(anchor, px, MAP_RECT, 2);
    expect(zoomed.zoom).toBe(2);
    const again = worldToMap(anchor.x, anchor.y, MAP_RECT, zoomed);
    expect(again.x).toBeCloseTo(px.x, 5);
    expect(again.y).toBeCloseTo(px.y, 5);
  });

  it('pans by screen pixels and never leaves the world', () => {
    const view = clampMapView({ zoom: 2, centerX: 5000, centerY: 3000 });
    const moved = panMap(view, 10, -10, MAP_RECT);
    expect(moved.centerX).toBeCloseTo(5000 - (10 / 400) * 5000, 5);
    expect(moved.centerY).toBeCloseTo(3000 + (10 / 240) * 3000, 5);
    const edge = panMap(view, 100000, 100000, MAP_RECT);
    expect(edge.centerX).toBe(WORLD.widthPx / 4);
    expect(edge.centerY).toBe(WORLD.heightPx / 4);
  });
});
