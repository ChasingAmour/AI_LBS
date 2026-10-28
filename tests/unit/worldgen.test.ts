import { describe, it, expect } from 'vitest';
import { WORLD } from '../../src/core/config';
import { createNewGame } from '../../src/core/gameState';
import { generateTerrain } from '../../src/world/generate';

describe('generateTerrain', () => {
  it('has the world dimensions', () => {
    expect(WORLD.widthTiles).toBe(625);
    expect(WORLD.heightTiles).toBe(375);
    const island = generateTerrain(42);
    expect(island.terrain).toHaveLength(625 * 375);
    expect(island.regions).toHaveLength(625 * 375);
  });

  it('is deterministic for the same seed', () => {
    const a = generateTerrain(42);
    const b = generateTerrain(42);
    expect(a.hash).toBe(b.hash);
    expect(Array.from(a.terrain.slice(0, 5000))).toEqual(Array.from(b.terrain.slice(0, 5000)));
  });

  it('differs for a different seed', () => {
    expect(generateTerrain(42).hash).not.toBe(generateTerrain(43).hash);
  });

  it('has a playable land ratio', () => {
    const island = generateTerrain(42);
    const land = island.terrain.filter((t) => t >= 3).length;
    const ratio = land / island.terrain.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.6);
  });

  it('assigns one of five regions', () => {
    const island = generateTerrain(42);
    expect(new Set(Array.from(island.regions)).size).toBeLessThanOrEqual(5);
  });
});

describe('world seed in new games', () => {
  it('stores the seed and an unset hash', () => {
    const state = createNewGame(7);
    expect(state.world.seed).toBe(7);
    expect(state.world.hash).toBe(0);
  });
});
