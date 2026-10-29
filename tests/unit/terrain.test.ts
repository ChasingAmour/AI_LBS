import { describe, it, expect } from 'vitest';
import { TILE, terrainSpeedAt } from '../../src/world/terrain';
import { isWalkableTile } from '../../src/world/landmarks';
import { generateIsland } from '../../src/world/generate';
import { depthFor } from '../../src/world/depthSort';

describe('terrain', () => {
  it('applies terrain speed multipliers', () => {
    expect(terrainSpeedAt(TILE.grass)).toBe(1);
    expect(terrainSpeedAt(TILE.sand)).toBe(0.9);
    expect(terrainSpeedAt(TILE.shallowWater)).toBe(0.6);
    expect(terrainSpeedAt(TILE.deepWater)).toBe(0);
    expect(terrainSpeedAt(TILE.cliff)).toBe(0);
    expect(terrainSpeedAt(TILE.path)).toBeGreaterThan(1);
  });

  it('makes cliffs impassable but paths walkable', () => {
    expect(isWalkableTile(TILE.cliff)).toBe(false);
    expect(isWalkableTile(TILE.path)).toBe(true);
  });

  it('generates mountain cliffs and connecting paths', () => {
    const island = generateIsland(42);
    expect(island.terrain.includes(TILE.cliff)).toBe(true);
    expect(island.terrain.includes(TILE.path)).toBe(true);
  });

  it('sorts depth by feet y', () => {
    expect(depthFor(120)).toBeLessThan(depthFor(121));
  });
});
