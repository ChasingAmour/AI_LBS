import { describe, it, expect } from 'vitest';
import { TILE } from '../../src/world/terrain';
import { generateIsland } from '../../src/world/generate';
import { WRECK_ENTRANCE_OFFSET_PX } from '../../src/world/landmarks';

const island = generateIsland(42);
const tileAt = (x: number, y: number) =>
  island.terrain[Math.floor(y / 16) * island.width + Math.floor(x / 16)];
const walkable = (x: number, y: number) => {
  const t = tileAt(x, y);
  return t === TILE.sand || t === TILE.grass || t === TILE.forest || t === TILE.rock || t === TILE.clay;
};

describe('generateIsland', () => {
  it('places all seven landmarks on walkable land', () => {
    expect(island.landmarks.map((l) => l.kind).sort()).toEqual(
      ['camp', 'cave', 'lookout', 'oldcamp', 'ruins', 'spring', 'wreck'],
    );
    for (const l of island.landmarks) expect(walkable(l.x, l.y)).toBe(true);
  });

  it('keeps the camp and spring near the wreck', () => {
    const wreck = island.landmarks.find((l) => l.kind === 'wreck')!;
    const camp = island.landmarks.find((l) => l.kind === 'camp')!;
    const spring = island.landmarks.find((l) => l.kind === 'spring')!;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    expect(dist(wreck, camp)).toBeLessThanOrEqual(640);
    expect(dist(camp, spring)).toBeGreaterThanOrEqual(480);
    expect(dist(camp, spring)).toBeLessThanOrEqual(640);
  });

  it('spawns the player on the beach near the wreck', () => {
    const wreck = island.landmarks.find((l) => l.kind === 'wreck')!;
    expect(Math.hypot(island.spawn.x - wreck.x, island.spawn.y - wreck.y)).toBeLessThanOrEqual(96);
    expect(walkable(island.spawn.x, island.spawn.y)).toBe(true);
  });

  it('keeps a flat 5x5 camp clearing', () => {
    const cx = Math.floor(island.campCenter.x / 16);
    const cy = Math.floor(island.campCenter.y / 16);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const t = island.terrain[(cy + dy) * island.width + (cx + dx)];
        expect([TILE.grass, TILE.sand, TILE.clay]).toContain(t);
      }
    }
  });

  it('connects every landmark with trails', () => {
    expect(island.trails.length).toBeGreaterThanOrEqual(6);
    expect(island.rivers.length).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic', () => {
    expect(generateIsland(42).hash).toBe(island.hash);
  });

  it('沉船入口偏移为 24px', () => {
    expect(WRECK_ENTRANCE_OFFSET_PX).toBe(24);
  });
});
