import { createRng } from '../core/rng';

/** Tile ids for the shipwreck floors. */
export const DUNGEON_TILE = {
  void: 0,
  floor: 1,
  wall: 2,
  water: 3,
  hazard: 4,
  door: 5,
  stairs: 6,
} as const;

export type HazardKind = 'loose' | 'flooded' | 'collapse';
export type DungeonEnemyType = 'crab' | 'hermit' | 'snake';

export interface DungeonRoom {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'normal' | 'flooded' | 'collapsed';
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

export interface DungeonEnemy {
  type: DungeonEnemyType;
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
  chests: DungeonChest[];
  hazards: DungeonHazard[];
  enemies: DungeonEnemy[];
}

const SIZES: Record<1 | 2 | 3, { w: number; h: number }> = {
  1: { w: 40, h: 24 },
  2: { w: 40, h: 24 },
  3: { w: 32, h: 20 },
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

/**
 * Seeded "ship spine + side cabins": a two-tile corridor runs the length of the
 * hull and rectangular cabins attach to it, so every room is reachable by
 * construction.
 */
export function generateDungeonFloor(seed: number, floorLevel: 1 | 2 | 3): DungeonFloor {
  const rng = createRng(seed + floorLevel * 1013);
  const size = SIZES[floorLevel];
  const floor: DungeonFloor = {
    floor: floorLevel,
    width: size.w,
    height: size.h,
    tiles: new Uint8Array(size.w * size.h),
    rooms: [],
    entry: { x: 2, y: Math.floor(size.h / 2) - 1 },
    stairs: { x: size.w - 3, y: Math.floor(size.h / 2) - 1 },
    chests: [],
    hazards: [],
    enemies: [],
  };

  const mid = Math.floor(floor.height / 2);
  carveRect(floor, 2, mid - 1, floor.width - 4, 2);

  const roomCount = floorLevel === 2 ? 4 : 3;
  const span = floor.width - 10;
  const step = span / roomCount;
  for (let i = 0; i < roomCount; i++) {
    const w = 6 + rng.int(0, 2);
    const h = 4 + rng.int(0, 1);
    const above = i % 2 === 0;
    const cx = Math.round(3 + i * step + rng.int(0, Math.max(1, Math.floor(step - w - 1))));
    const x = Math.max(2, Math.min(floor.width - w - 2, cx));
    const y = above ? Math.max(2, mid - 2 - h) : Math.min(floor.height - h - 2, mid + 2);
    carveRect(floor, x, y, w, h);
    const doorX = x + Math.floor(w / 2);
    const doorY = above ? y + h - 1 : y;
    for (let ty = above ? doorY : mid - 1; ty <= (above ? mid - 1 : doorY); ty++) {
      set(floor, doorX, ty, DUNGEON_TILE.door);
    }
    set(floor, doorX, above ? doorY : doorY, DUNGEON_TILE.floor);
    floor.rooms.push({
      x,
      y,
      w,
      h,
      kind: 'normal',
    });
  }

  // Normal chests in the first two cabins; the third floor's last cabin is the final one.
  floor.rooms.forEach((room, index) => {
    const isFinal = floorLevel === 3 && index === floor.rooms.length - 1;
    floor.chests.push({
      id: `d${floorLevel}_chest_${index}`,
      x: room.x + room.w - 2,
      y: room.y + room.h - 2,
      final: isFinal,
    });
    if (isFinal) room.kind = 'collapsed';
    else if (floorLevel === 2) room.kind = 'flooded';
  });

  // One hazard per cabin, placed away from the door and the chest.
  const hazardKind: HazardKind = floorLevel === 3 ? 'collapse' : floorLevel === 2 ? 'flooded' : 'loose';
  for (const room of floor.rooms) {
    const x = room.x + Math.floor(room.w / 2);
    const y = room.y + 1;
    for (let dx = -1; dx <= 1; dx++) {
      if (at(floor, x + dx, y) === DUNGEON_TILE.floor) {
        set(floor, x + dx, y, DUNGEON_TILE.hazard);
        floor.hazards.push({ x: x + dx, y, kind: room.kind === 'flooded' ? 'flooded' : hazardKind });
      }
    }
  }

  // Enemies: 2 on floor 1, 3 on floor 2 (with a hermit), 3 on floor 3 (with a snake).
  const enemyPlan: DungeonEnemyType[] =
    floorLevel === 1 ? ['crab', 'crab'] : floorLevel === 2 ? ['crab', 'hermit', 'crab'] : ['crab', 'snake', 'crab'];
  enemyPlan.forEach((type, index) => {
    const room = floor.rooms[index % floor.rooms.length];
    floor.enemies.push({
      type,
      x: room.x + 1 + (index % Math.max(1, room.w - 2)),
      y: room.y + 1 + (index % Math.max(1, room.h - 2)),
    });
  });

  // Wall ring around every carved area.
  const tiles = floor.tiles.slice();
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (tiles[y * floor.width + x] !== DUNGEON_TILE.void) continue;
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
  return floor;
}

/** Walkable tiles (floor, door, hazard, stairs). */
export function isDungeonWalkable(tile: number): boolean {
  return (
    tile === DUNGEON_TILE.floor ||
    tile === DUNGEON_TILE.door ||
    tile === DUNGEON_TILE.hazard ||
    tile === DUNGEON_TILE.stairs
  );
}
