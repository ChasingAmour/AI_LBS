import { describe, it, expect } from 'vitest';
import {
  DUNGEON_TILE,
  generateDungeonFloor,
  isDungeonWalkable,
  type DungeonFloor,
} from '../../src/world/dungeonGen';

function reachable(floor: DungeonFloor, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  const seen = new Set<number>([from.y * floor.width + from.x]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === to.x && current.y === to.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= floor.width || ny >= floor.height) continue;
      const index = ny * floor.width + nx;
      if (seen.has(index)) continue;
      if (!isDungeonWalkable(floor.tiles[index])) continue;
      seen.add(index);
      queue.push({ x: nx, y: ny });
    }
  }
  return false;
}

describe('dungeon generation', () => {
  it('is deterministic per seed and floor', () => {
    const a = generateDungeonFloor(42, 2);
    const b = generateDungeonFloor(42, 2);
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
    expect(a.chests).toEqual(b.chests);
  });

  it('differs for another seed', () => {
    const a = generateDungeonFloor(42, 1);
    const b = generateDungeonFloor(43, 1);
    expect(Array.from(a.tiles)).not.toEqual(Array.from(b.tiles));
  });

  it('keeps the entry connected to the stairs and every chest', () => {
    for (const floorLevel of [1, 2, 3] as const) {
      const floor = generateDungeonFloor(7, floorLevel);
      expect(reachable(floor, floor.entry, floor.stairs)).toBe(true);
      for (const chest of floor.chests) {
        expect(reachable(floor, floor.entry, chest)).toBe(true);
      }
    }
  });

  it('places 3-4 cabins, chests and hazards', () => {
    for (const floorLevel of [1, 2, 3] as const) {
      const floor = generateDungeonFloor(11, floorLevel);
      expect(floor.rooms.length).toBeGreaterThanOrEqual(3);
      expect(floor.rooms.length).toBeLessThanOrEqual(4);
      expect(floor.chests).toHaveLength(floor.rooms.length);
      expect(floor.hazards.length).toBeGreaterThan(0);
      expect(floor.enemies.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives floor 3 the final chest and a sea snake', () => {
    const floor = generateDungeonFloor(3, 3);
    expect(floor.chests.some((chest) => chest.final)).toBe(true);
    expect(floor.enemies.some((enemy) => enemy.type === 'snake')).toBe(true);
    expect(floor.width).toBe(32);
    expect(floor.height).toBe(20);
  });

  it('stairs are walkable', () => {
    const floor = generateDungeonFloor(5, 1);
    expect(floor.tiles[floor.stairs.y * floor.width + floor.stairs.x]).toBe(DUNGEON_TILE.stairs);
    expect(isDungeonWalkable(DUNGEON_TILE.stairs)).toBe(true);
  });
});
