import { createRng } from '../core/rng';

/** Tile ids for the shipwreck decks. */
export const DUNGEON_TILE = {
  void: 0,
  floor: 1,
  wall: 2,
  water: 3,
  hazard: 4,
  door: 5,
  stairs: 6,
  /** floor entrance: leave the wreck on floor 1, stairs up on floors 2-3 */
  exit: 7,
  /** the captain's cabin door, sealed while the boss fight runs */
  bossDoor: 8,
} as const;

export type HazardKind = 'loose' | 'flooded' | 'collapse';
export type DungeonEnemyType = 'crab' | 'hermit' | 'snake' | 'rat' | 'ghost';
export type DungeonEnemyRank = 'normal' | 'elite' | 'boss';

export interface DungeonRoom {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'cabin' | 'hold' | 'galley' | 'captain';
}

export interface DungeonChest {
  id: string;
  x: number;
  y: number;
  final: boolean;
}

export interface DungeonHazard {
  x: number;
  y: number;
  kind: HazardKind;
}

export interface DungeonEnemySpawn {
  type: DungeonEnemyType;
  rank: DungeonEnemyRank;
  x: number;
  y: number;
}

export interface DungeonFloor {
  floor: 1 | 2 | 3;
  width: number;
  height: number;
  tiles: Uint8Array;
  rooms: DungeonRoom[];
  entry: { x: number; y: number };
  stairs: { x: number; y: number };
  bossRoom: { x: number; y: number; w: number; h: number };
  bossDoor: { x: number; y: number };
  chests: DungeonChest[];
  hazards: DungeonHazard[];
  enemies: DungeonEnemySpawn[];
}

const SIZES: Record<1 | 2 | 3, { w: number; h: number }> = {
  1: { w: 64, h: 36 },
  2: { w: 72, h: 40 },
  3: { w: 80, h: 44 },
};

function at(floor: DungeonFloor, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= floor.width || y >= floor.height) return DUNGEON_TILE.void;
  return floor.tiles[y * floor.width + x];
}

function set(floor: DungeonFloor, x: number, y: number, tile: number): void {
  if (x < 0 || y < 0 || x >= floor.width || y >= floor.height) return;
  floor.tiles[y * floor.width + x] = tile;
}

function carveRect(floor: DungeonFloor, x: number, y: number, w: number, h: number): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) set(floor, x + dx, y + dy, DUNGEON_TILE.floor);
  }
}

/** Half-height of the hull at a given column: rounded stern, pointed bow. */
function hullHalf(x: number, width: number, height: number): number {
  const t = x / (width - 1);
  const stern = Math.min(1, t / 0.12);
  const bow = Math.min(1, (1 - t) / 0.22);
  const shape = Math.min(stern, bow);
  return Math.max(2, Math.round((height / 2 - 2) * (0.35 + 0.65 * shape)));
}

/**
 * Builds one deck of the wreck: a hull outline with a central corridor, cabins
 * above and below, and the captain's cabin (boss room) at the stern.
 */
export function generateDungeonFloor(seed: number, floorLevel: 1 | 2 | 3): DungeonFloor {
  const rng = createRng(seed + floorLevel * 1013);
  const size = SIZES[floorLevel];
  const mid = Math.floor(size.h / 2);
  const floor: DungeonFloor = {
    floor: floorLevel,
    width: size.w,
    height: size.h,
    tiles: new Uint8Array(size.w * size.h),
    rooms: [],
    entry: { x: size.w - 7, y: mid },
    stairs: { x: 5, y: mid + 4 },
    bossRoom: { x: 2, y: mid - 5, w: 10, h: 11 },
    bossDoor: { x: 12, y: mid },
    chests: [],
    hazards: [],
    enemies: [],
  };

  // hull
  for (let x = 1; x < size.w - 1; x++) {
    const half = hullHalf(x, size.w, size.h);
    for (let y = mid - half; y <= mid + half; y++) set(floor, x, y, DUNGEON_TILE.floor);
  }

  // central corridor, three tiles tall, from the bow to the captain's cabin
  carveRect(floor, 12, mid - 1, size.w - 18, 3);

  // captain's cabin
  const boss = floor.bossRoom;
  carveRect(floor, boss.x, boss.y, boss.w, boss.h);
  set(floor, floor.bossDoor.x, floor.bossDoor.y, DUNGEON_TILE.bossDoor);

  // cabins along both sides of the corridor
  const cabinWidth = 5;
  const cabinHeight = 4;
  const step = cabinWidth + 2;
  const firstCabin = 15;
  const lastCabin = size.w - 12;
  for (let x = firstCabin; x + cabinWidth <= lastCabin; x += step) {
    for (const side of [-1, 1] as const) {
      if (rng.next() < 0.12) continue;
      const y = side === -1 ? mid - 2 - cabinHeight : mid + 2;
      const half = hullHalf(x + 2, size.w, size.h);
      if (Math.abs(y + (side === -1 ? 0 : cabinHeight) - mid) > half - 1) continue;
      carveRect(floor, x, y, cabinWidth, cabinHeight);
      // door passage towards the corridor
      const doorX = x + 1 + rng.int(0, cabinWidth - 3);
      if (side === -1) {
        set(floor, doorX, mid - 2, DUNGEON_TILE.door);
        set(floor, doorX, mid - 3, DUNGEON_TILE.floor);
      } else {
        set(floor, doorX, mid + 2, DUNGEON_TILE.door);
        set(floor, doorX, mid + 3, DUNGEON_TILE.floor);
      }
      const index = floor.rooms.length;
      const kind: DungeonRoom['kind'] =
        index === 2 && floorLevel === 2 ? 'galley' : index === 3 ? 'hold' : 'cabin';
      floor.rooms.push({ x, y, w: cabinWidth, h: cabinHeight, kind });
    }
  }

  // wall ring around every carved area
  const tiles = floor.tiles.slice();
  for (let y = 0; y < size.h; y++) {
    for (let x = 0; x < size.w; x++) {
      if (tiles[y * size.w + x] !== DUNGEON_TILE.void) continue;
      let touching = false;
      for (let dy = -1; dy <= 1 && !touching; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (at(floor, x + dx, y + dy) !== DUNGEON_TILE.void) {
            touching = true;
            break;
          }
        }
      }
      if (touching) set(floor, x, y, DUNGEON_TILE.wall);
    }
  }

  set(floor, floor.stairs.x, floor.stairs.y, DUNGEON_TILE.stairs);
  set(floor, floor.entry.x, floor.entry.y, DUNGEON_TILE.exit);

  // loot: one chest per other cabin, plus the final chest in the captain's cabin
  floor.rooms.forEach((room, index) => {
    if (index % 2 !== 0) return;
    floor.chests.push({
      id: `d${floorLevel}_chest_${index}`,
      x: room.x + room.w - 2,
      y: room.y + room.h - 2,
      final: false,
    });
  });
  floor.chests.push({
    id: `d${floorLevel}_chest_final`,
    x: boss.x + boss.w - 3,
    y: boss.y + boss.h - 3,
    final: true,
  });

  // hazards: every third cabin is flooded or collapsing
  const hazardKind: HazardKind =
    floorLevel === 3 ? 'collapse' : floorLevel === 2 ? 'flooded' : 'loose';
  floor.rooms.forEach((room, index) => {
    if (index % 3 !== 1) return;
    const x = room.x + 1;
    const y = room.y + 1;
    if (at(floor, x, y) !== DUNGEON_TILE.floor) return;
    set(floor, x, y, DUNGEON_TILE.hazard);
    floor.hazards.push({ x, y, kind: hazardKind });
  });

  // crew: one monster per cabin, two elites, and the captain
  const normalPlan: DungeonEnemyType[] =
    floorLevel === 1
      ? ['crab', 'rat', 'hermit', 'rat', 'crab', 'rat']
      : floorLevel === 2
        ? ['crab', 'ghost', 'rat', 'hermit', 'ghost', 'rat', 'crab']
        : ['ghost', 'snake', 'hermit', 'ghost', 'rat', 'snake', 'ghost', 'rat'];
  floor.rooms.forEach((room, index) => {
    const type = normalPlan[index % normalPlan.length];
    floor.enemies.push({
      type,
      rank: 'normal',
      x: room.x + 1 + rng.int(0, Math.max(0, room.w - 3)),
      y: room.y + 1 + rng.int(0, Math.max(0, room.h - 3)),
    });
  });
  const eliteSlots = floor.rooms.filter((_, index) => index % 3 === 2);
  for (const room of eliteSlots.slice(0, 2)) {
    floor.enemies.push({
      type: floorLevel === 3 ? 'ghost' : 'hermit',
      rank: 'elite',
      x: room.x + Math.floor(room.w / 2),
      y: room.y + Math.floor(room.h / 2),
    });
  }
  floor.enemies.push({
    type: floorLevel === 3 ? 'ghost' : floorLevel === 2 ? 'hermit' : 'crab',
    rank: 'boss',
    x: boss.x + Math.floor(boss.w / 2),
    y: boss.y + Math.floor(boss.h / 2),
  });

  return floor;
}

/** Walkable tiles (floor, door, hazard, stairs, exit, open boss door). */
export function isDungeonWalkable(tile: number): boolean {
  return (
    tile === DUNGEON_TILE.floor ||
    tile === DUNGEON_TILE.door ||
    tile === DUNGEON_TILE.hazard ||
    tile === DUNGEON_TILE.stairs ||
    tile === DUNGEON_TILE.exit ||
    tile === DUNGEON_TILE.bossDoor
  );
}

/** Walks the tile line between two points; walls and void block sight. */
export function hasLineOfSight(
  floor: DungeonFloor,
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.floor((from.x + (to.x - from.x) * t) / 16);
    const y = Math.floor((from.y + (to.y - from.y) * t) / 16);
    const tile = at(floor, x, y);
    if (tile === DUNGEON_TILE.wall || tile === DUNGEON_TILE.void) return false;
  }
  return true;
}
