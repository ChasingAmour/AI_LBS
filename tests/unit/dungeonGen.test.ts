import { describe, it, expect } from 'vitest';
import {
  DUNGEON_TILE,
  generateDungeonFloor,
  hasLineOfSight,
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

  it('places a full deck of cabins, chests and hazards', () => {
    for (const floorLevel of [1, 2, 3] as const) {
      const floor = generateDungeonFloor(11, floorLevel);
      expect(floor.rooms.length).toBeGreaterThanOrEqual(8);
      expect(floor.chests.length).toBeGreaterThanOrEqual(4);
      expect(floor.hazards.length).toBeGreaterThan(0);
      expect(floor.enemies.filter((e) => e.rank === 'normal').length).toBeGreaterThanOrEqual(6);
      expect(floor.enemies.filter((e) => e.rank === 'elite').length).toBe(2);
      expect(floor.enemies.filter((e) => e.rank === 'boss').length).toBe(1);
    }
  });

  it('puts the boss and the final chest in the captain cabin', () => {
    const floor = generateDungeonFloor(3, 3);
    const boss = floor.enemies.find((enemy) => enemy.rank === 'boss')!;
    const room = floor.bossRoom;
    expect(boss.x).toBeGreaterThanOrEqual(room.x);
    expect(boss.x).toBeLessThan(room.x + room.w);
    expect(boss.y).toBeGreaterThanOrEqual(room.y);
    expect(boss.y).toBeLessThan(room.y + room.h);
    expect(floor.chests.some((chest) => chest.final)).toBe(true);
    expect(floor.tiles[floor.bossDoor.y * floor.width + floor.bossDoor.x]).toBe(
      DUNGEON_TILE.bossDoor,
    );
    expect(isDungeonWalkable(DUNGEON_TILE.bossDoor)).toBe(true);
  });

  it('grows the deck with every floor', () => {
    const one = generateDungeonFloor(3, 1);
    const three = generateDungeonFloor(3, 3);
    expect(one.width).toBe(64);
    expect(one.height).toBe(36);
    expect(three.width).toBe(80);
    expect(three.height).toBe(44);
  });

  it('stairs are walkable', () => {
    const floor = generateDungeonFloor(5, 1);
    expect(floor.tiles[floor.stairs.y * floor.width + floor.stairs.x]).toBe(DUNGEON_TILE.stairs);
    expect(isDungeonWalkable(DUNGEON_TILE.stairs)).toBe(true);
  });

  it('每层的入口是可见的出口瓦片', () => {
    for (const level of [1, 2, 3] as const) {
      const floor = generateDungeonFloor(5, level);
      expect(floor.tiles[floor.entry.y * floor.width + floor.entry.x]).toBe(DUNGEON_TILE.exit);
      expect(isDungeonWalkable(DUNGEON_TILE.exit)).toBe(true);
    }
  });

  it('墙会挡住视线', () => {
    const floor: DungeonFloor = {
      floor: 1,
      width: 5,
      height: 3,
      // open corridor with a single wall column at tile x = 2
      tiles: new Uint8Array([
        1, 1, 2, 1, 1,
        1, 1, 2, 1, 1,
        1, 1, 2, 1, 1,
      ]),
      rooms: [],
      entry: { x: 0, y: 0 },
      stairs: { x: 0, y: 0 },
      bossRoom: { x: 0, y: 0, w: 1, h: 1 },
      bossDoor: { x: 0, y: 0 },
      chests: [],
      hazards: [],
      enemies: [],
    };
    expect(hasLineOfSight(floor, { x: 8, y: 24 }, { x: 24, y: 24 })).toBe(true);
    expect(hasLineOfSight(floor, { x: 8, y: 24 }, { x: 72, y: 24 })).toBe(false);
  });
});
