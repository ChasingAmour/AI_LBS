import { hash2D } from '../core/noise';
import { TILE } from './terrain';
import type { TerrainData } from './generate';

export type LandmarkKind = 'camp' | 'wreck' | 'spring' | 'lookout' | 'ruins' | 'cave' | 'oldcamp';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Landmark {
  id: string;
  kind: LandmarkKind;
  region: number;
  x: number;
  y: number;
}

const TILE_PX = 16;

export function tileIndex(island: TerrainData, tx: number, ty: number): number {
  return ty * island.width + tx;
}

export function tileAt(island: TerrainData, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= island.width || ty >= island.height) return TILE.deepWater;
  return island.terrain[tileIndex(island, tx, ty)];
}

export function isWalkableTile(tile: number): boolean {
  return (
    tile === TILE.sand ||
    tile === TILE.grass ||
    tile === TILE.forest ||
    tile === TILE.rock ||
    tile === TILE.clay
  );
}

export function isFlatTile(tile: number): boolean {
  return tile === TILE.grass || tile === TILE.sand || tile === TILE.clay;
}

export function tileCenter(tx: number, ty: number): Vec2 {
  return { x: tx * TILE_PX + TILE_PX / 2, y: ty * TILE_PX + TILE_PX / 2 };
}

interface Search {
  center: Vec2;
  minPx: number;
  maxPx: number;
  region?: number;
  salt: number;
  predicate: (tx: number, ty: number) => boolean;
}

/** Picks the best matching tile: closest to the centre, with a seeded jitter for variety. */
function findTile(island: TerrainData, seed: number, search: Search): Vec2 | null {
  let best: Vec2 | null = null;
  let bestScore = Infinity;
  for (let ty = 0; ty < island.height; ty++) {
    for (let tx = 0; tx < island.width; tx++) {
      const point = tileCenter(tx, ty);
      const distance = Math.hypot(point.x - search.center.x, point.y - search.center.y);
      if (distance < search.minPx || distance > search.maxPx) continue;
      if (search.region !== undefined && island.regions[tileIndex(island, tx, ty)] !== search.region) {
        continue;
      }
      if (!search.predicate(tx, ty)) continue;
      const score = distance + hash2D(tx, ty, seed + search.salt) * 260;
      if (score < bestScore) {
        bestScore = score;
        best = point;
      }
    }
  }
  return best;
}

function pick(island: TerrainData, seed: number, search: Search): Vec2 {
  const exact = findTile(island, seed, search);
  if (exact) return exact;

  const widened = findTile(island, seed, { ...search, minPx: 0, maxPx: search.maxPx * 2.5 });
  if (widened) return widened;

  const anyLand = findTile(island, seed, {
    center: search.center,
    minPx: 0,
    maxPx: 5000,
    salt: search.salt + 1,
    predicate: (tx, ty) => isWalkableTile(tileAt(island, tx, ty)),
  });
  return anyLand ?? { x: search.center.x, y: search.center.y };
}

function flattenCamp(island: TerrainData, center: Vec2): void {
  const tx = Math.floor(center.x / TILE_PX);
  const ty = Math.floor(center.y / TILE_PX);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = tx + dx;
      const y = ty + dy;
      if (x < 0 || y < 0 || x >= island.width || y >= island.height) continue;
      island.terrain[tileIndex(island, x, y)] = TILE.grass;
    }
  }
}

function landmark(kind: LandmarkKind, island: TerrainData, point: Vec2): Landmark {
  const tx = Math.floor(point.x / TILE_PX);
  const ty = Math.floor(point.y / TILE_PX);
  return {
    id: kind,
    kind,
    region: island.regions[tileIndex(island, tx, ty)],
    x: tx * TILE_PX + TILE_PX / 2,
    y: ty * TILE_PX + TILE_PX / 2,
  };
}

const farFrom = (placed: Landmark[], minPx: number) => (tx: number, ty: number) => {
  const point = tileCenter(tx, ty);
  return placed.every(
    (other) => Math.hypot(point.x - other.x, point.y - other.y) >= minPx,
  );
};

export interface PlacementResult {
  landmarks: Landmark[];
  campCenter: Vec2;
  spawn: Vec2;
}

/**
 * Landmark order matters: the wreck anchors the south beach, the camp must sit
 * 1�? screens inland, and the spring is the first guided objective.
 */
export function placeLandmarks(island: TerrainData, seed: number): PlacementResult {
  const placed: Landmark[] = [];

  const wreckPoint = pick(island, seed, {
    center: { x: 5200, y: 5150 },
    minPx: 0,
    maxPx: 1200,
    region: 0,
    salt: 101,
    predicate: (tx, ty) => {
      if (tileAt(island, tx, ty) !== TILE.sand) return false;
      const neighbours = [
        tileAt(island, tx + 1, ty),
        tileAt(island, tx - 1, ty),
        tileAt(island, tx, ty + 1),
        tileAt(island, tx, ty - 1),
      ];
      return neighbours.some((tile) => !isWalkableTile(tile));
    },
  });
  const wreck = landmark('wreck', island, wreckPoint);
  placed.push(wreck);

  const campPoint = pick(island, seed, {
    center: wreckPoint,
    minPx: 320,
    maxPx: 640,
    salt: 211,
    predicate: (tx, ty) => {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (!isFlatTile(tileAt(island, tx + dx, ty + dy))) return false;
        }
      }
      return true;
    },
  });
  flattenCamp(island, campPoint);
  const campCenter = tileCenter(
    Math.floor(campPoint.x / TILE_PX),
    Math.floor(campPoint.y / TILE_PX),
  );
  placed.push(landmark('camp', island, campCenter));

  const springPoint = pick(island, seed, {
    center: campCenter,
    minPx: 480,
    maxPx: 640,
    salt: 307,
    predicate: (tx, ty) => {
      const tile = tileAt(island, tx, ty);
      return tile === TILE.grass || tile === TILE.clay || tile === TILE.forest;
    },
  });
  placed.push(landmark('spring', island, springPoint));

  const spawnPoint =
    findTile(island, seed, {
      center: wreckPoint,
      minPx: 32,
      maxPx: 96,
      salt: 401,
      predicate: (tx, ty) => isWalkableTile(tileAt(island, tx, ty)),
    }) ?? wreckPoint;

  const outer: Array<{ kind: LandmarkKind; region: number; center: Vec2; salt: number }> = [
    { kind: 'cave', region: 1, center: { x: 7100, y: 3700 }, salt: 503 },
    { kind: 'lookout', region: 2, center: { x: 4700, y: 1500 }, salt: 601 },
    { kind: 'ruins', region: 4, center: { x: 7700, y: 1700 }, salt: 701 },
    { kind: 'oldcamp', region: 3, center: { x: 2100, y: 3700 }, salt: 809 },
  ];

  for (const entry of outer) {
    const point = pick(island, seed, {
      center: entry.center,
      minPx: 0,
      maxPx: 3000,
      region: entry.region,
      salt: entry.salt,
      predicate: (tx, ty) => {
        if (!isWalkableTile(tileAt(island, tx, ty))) return false;
        return farFrom(placed, 320)(tx, ty);
      },
    });
    placed.push(landmark(entry.kind, island, point));
  }

  return { landmarks: placed, campCenter, spawn: spawnPoint };
}
