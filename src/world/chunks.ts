import { WORLD } from '../core/config';

export const CHUNK_TILES = 32;
export const CHUNK_PX = CHUNK_TILES * WORLD.tile;
export const WORLD_CHUNKS_X = Math.ceil(WORLD.widthTiles / CHUNK_TILES);
export const WORLD_CHUNKS_Y = Math.ceil(WORLD.heightTiles / CHUNK_TILES);

export interface ChunkCoord {
  cx: number;
  cy: number;
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function chunkOf(tileX: number, tileY: number): ChunkCoord {
  return { cx: Math.floor(tileX / CHUNK_TILES), cy: Math.floor(tileY / CHUNK_TILES) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Chunks touching the camera rectangle, plus a one-chunk margin so a fast
 * camera never shows an unbaked seam. Clamped to the world.
 */
export function visibleChunks(
  cameraX: number,
  cameraY: number,
  viewW: number,
  viewH: number,
): ChunkCoord[] {
  const minCx = clamp(Math.floor((cameraX - CHUNK_PX) / CHUNK_PX), 0, WORLD_CHUNKS_X - 1);
  const maxCx = clamp(Math.floor((cameraX + viewW + CHUNK_PX) / CHUNK_PX), 0, WORLD_CHUNKS_X - 1);
  const minCy = clamp(Math.floor((cameraY - CHUNK_PX) / CHUNK_PX), 0, WORLD_CHUNKS_Y - 1);
  const maxCy = clamp(Math.floor((cameraY + viewH + CHUNK_PX) / CHUNK_PX), 0, WORLD_CHUNKS_Y - 1);

  const chunks: ChunkCoord[] = [];
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      chunks.push({ cx, cy });
    }
  }
  return chunks;
}
