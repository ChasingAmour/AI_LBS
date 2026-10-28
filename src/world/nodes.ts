import { hash2D } from '../core/noise';
import { chunkOf } from './chunks';
import { TILE } from './terrain';
import { tileAt } from './landmarks';
import type { IslandData } from './generate';

export interface GeneratedNode {
  id: string;
  type: string;
  x: number;
  y: number;
}

const STRIDE = 12;

function pickType(tile: number, region: number, roll: number): string | null {
  switch (tile) {
    case TILE.forest:
      return roll < 0.7 ? 'tree' : roll < 0.88 ? 'vine' : 'berry';
    case TILE.grass:
      if (roll < 0.42) return 'tree';
      if (roll < 0.62) return 'berry';
      if (roll < 0.78) return 'vine';
      if (roll < 0.92) return 'rock';
      return 'clay';
    case TILE.sand:
      return roll < 0.72 ? 'palm' : 'clay';
    case TILE.rock:
      return roll < 0.9 ? 'rock' : 'clay';
    case TILE.clay:
      return roll < 0.8 ? 'clay' : 'rock';
    case TILE.shallowWater:
      return 'tide';
    default:
      return region === 3 && roll < 0.5 ? 'tide' : null;
  }
}

/**
 * Rebuilds resource nodes from the seed instead of storing every coordinate:
 * one candidate every 12 tiles, roughly half of them become nodes.
 */
export function generateNodes(island: IslandData, seed: number): GeneratedNode[] {
  const nodes: GeneratedNode[] = [];
  const perChunk = new Map<string, number>();

  for (let ty = 2; ty < island.height - 2; ty += STRIDE) {
    for (let tx = 2; tx < island.width - 2; tx += STRIDE) {
      const roll = hash2D(tx, ty, seed + 900);
      if (roll > 0.5) continue;
      const tile = tileAt(island, tx, ty);
      const region = island.regions[ty * island.width + tx];
      const type = pickType(tile, region, hash2D(tx + 11, ty + 7, seed + 417));
      if (!type) continue;

      const x = tx * 16 + 8;
      const y = ty * 16 + 16;
      if (Math.hypot(x - island.campCenter.x, y - island.campCenter.y) < 64) continue;
      if (Math.hypot(x - island.spawn.x, y - island.spawn.y) < 48) continue;

      const { cx, cy } = chunkOf(tx, ty);
      const key = `${cx},${cy}`;
      const index = perChunk.get(key) ?? 0;
      perChunk.set(key, index + 1);
      nodes.push({ id: `${type}:${cx}:${cy}:${index}`, type, x, y });
    }
  }

  return nodes;
}
