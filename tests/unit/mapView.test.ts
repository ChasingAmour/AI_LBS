import { describe, it, expect } from 'vitest';
import { MAP_RECT, explorePercent, mapToWorld, worldToMap } from '../../src/world/mapView';

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
});
