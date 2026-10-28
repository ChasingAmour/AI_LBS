import { describe, it, expect } from 'vitest';
import { TILE, terrainSpeedAt } from '../../src/world/terrain';
import { depthFor } from '../../src/world/depthSort';

describe('terrain', () => {
  it('applies terrain speed multipliers', () => {
    expect(terrainSpeedAt(TILE.grass)).toBe(1);
    expect(terrainSpeedAt(TILE.sand)).toBe(0.9);
    expect(terrainSpeedAt(TILE.shallowWater)).toBe(0.6);
    expect(terrainSpeedAt(TILE.deepWater)).toBe(0);
  });

  it('sorts depth by feet y', () => {
    expect(depthFor(120)).toBeLessThan(depthFor(121));
  });
});
