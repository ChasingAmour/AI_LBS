import { hash2D } from '../core/noise';
import { CHUNK_TILES } from './chunks';
import { WORLD } from '../core/config';

export interface Decor {
  x: number;
  y: number;
  texture: 'town' | 'farm';
  frame: number;
}

const DECOR_FRAMES: ReadonlyArray<{ texture: 'town' | 'farm'; frame: number }> = [
  { texture: 'town', frame: 29 },
  { texture: 'town', frame: 30 },
  { texture: 'farm', frame: 4 },
  { texture: 'farm', frame: 5 },
  { texture: 'farm', frame: 16 },
];

const CHUNK_PX = CHUNK_TILES * WORLD.tile;

/** 1–2 ground decorations per chunk, deterministic from the seed and chunk coords. */
export function decorForChunk(seed: number, cx: number, cy: number): Decor[] {
  const count = 1 + Math.floor(hash2D(cx, cy, seed + 77) * 2);
  const decor: Decor[] = [];
  for (let i = 0; i < count; i++) {
    const u = hash2D(cx * 7 + i, cy * 13 + i * 3, seed + 991);
    const v = hash2D(cx * 17 + i * 5, cy * 3 + i, seed + 331);
    const pick = DECOR_FRAMES[Math.floor(hash2D(i, cx + cy, seed + 55) * DECOR_FRAMES.length)];
    const x = Math.floor((cx * CHUNK_PX + u * CHUNK_PX) / WORLD.tile) * WORLD.tile + WORLD.tile / 2;
    const y = Math.floor((cy * CHUNK_PX + v * CHUNK_PX) / WORLD.tile) * WORLD.tile + WORLD.tile / 2;
    decor.push({ x, y, texture: pick.texture, frame: pick.frame });
  }
  return decor;
}
