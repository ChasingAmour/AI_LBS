import { hash2D } from '../core/noise';
import { TILE } from './terrain';

/** True when the neighbour in that direction is land. */
export interface Neighbors {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
}

export interface TerrainSprite {
  texture: 'town' | 'battle';
  frame: number;
  shade: { color: number; alpha: number } | null;
  /** Bitmask of land neighbours (n=1, e=2, s=4, w=8) that need a foam edge. */
  foam: number;
}

export function isWater(tile: number): boolean {
  return tile === TILE.deepWater || tile === TILE.shallowWater || tile === TILE.stream;
}

/** 4-bit mask of the neighbours, used for coast shading and foam edges. */
export function coastBits(neighbors: Neighbors): number {
  return (
    (neighbors.n ? 1 : 0) |
    (neighbors.e ? 2 : 0) |
    (neighbors.s ? 4 : 0) |
    (neighbors.w ? 8 : 0)
  );
}

/**
 * Tiny Battle's pond set is not a full autotile: every bank frame bakes grass
 * into the tile (36 left, 38/72 right, 74 left, 54-56 bottom), which tiled the
 * open sea with green stripes. Frame 37 is the only pure water tile; shorelines
 * get a foam edge from the baker instead.
 */
const PURE_WATER_FRAME = 37;

function waterFrame(): number {
  return PURE_WATER_FRAME;
}

const GROUND_FRAMES: Record<number, number[]> = {
  [TILE.sand]: [25, 40, 41],
  [TILE.grass]: [0, 1, 2],
  [TILE.forest]: [0, 1, 2],
  [TILE.rock]: [48, 49, 50],
  [TILE.clay]: [12, 13, 14],
};

const SHADE: Record<number, { color: number; alpha: number }> = {
  [TILE.forest]: { color: 0x2f5a2a, alpha: 0.22 },
  [TILE.clay]: { color: 0x8a5a2b, alpha: 0.3 },
};

/** Stable per-tile variant; weighted toward the plain frame so the ground stays calm. */
export function variantFor(tx: number, ty: number, seed: number): number {
  const roll = hash2D(tx, ty, seed + 1237);
  if (roll > 0.99) return 2;
  if (roll > 0.8) return 1;
  return 0;
}

/**
 * Visual frame index. Water uses a pure water frame; land mixes the tile id,
 * variant and land-neighbour bits so a coastline never looks like a solid block.
 */
export function terrainFrame(tile: number, neighbors: Neighbors, variant: number): number {
  if (isWater(tile)) return waterFrame();
  return tile * 16 + (variant % 3) * 4 + coastBits(neighbors);
}

export function terrainSprite(tile: number, neighbors: Neighbors, variant: number): TerrainSprite {
  if (isWater(tile)) {
    return {
      texture: 'battle',
      frame: waterFrame(),
      shade:
        tile === TILE.deepWater
          ? { color: 0x0a2438, alpha: 0.62 }
          : tile === TILE.shallowWater
            ? { color: 0x1f6f8f, alpha: 0.12 }
            : null,
      foam: coastBits(neighbors),
    };
  }
  const frames = GROUND_FRAMES[tile] ?? GROUND_FRAMES[TILE.grass];
  return {
    texture: 'town',
    frame: frames[variant % frames.length],
    shade: SHADE[tile] ?? null,
    foam: 0,
  };
}
