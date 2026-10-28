import { valueNoise2D } from '../core/noise';

export interface RegionDef {
  id: number;
  name: string;
  anchorX: number;
  anchorY: number;
}

/** Five organic regions, each anchored in world pixels. */
export const REGIONS: readonly RegionDef[] = [
  { id: 0, name: '海岸平原', anchorX: 5200, anchorY: 4900 },
  { id: 1, name: '雨林', anchorX: 7100, anchorY: 3700 },
  { id: 2, name: '高地', anchorX: 4700, anchorY: 1500 },
  { id: 3, name: '潮汐湾', anchorX: 2100, anchorY: 3700 },
  { id: 4, name: '石阵荒野', anchorX: 7700, anchorY: 1700 },
] as const;

export const REGION_COUNT = REGIONS.length;

/**
 * Nearest anchor wins, but each anchor's distance is perturbed by its own
 * noise field so borders wander instead of forming straight Voronoi edges.
 */
export function regionIndexAt(seed: number, tileX: number, tileY: number): number {
  const wx = tileX * 16 + 8;
  const wy = tileY * 16 + 8;
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < REGIONS.length; i++) {
    const region = REGIONS[i];
    const jitter = 1 + (valueNoise2D(wx / 700 + i * 13, wy / 700 + i * 7, seed + 7) - 0.5) * 0.55;
    const dx = wx - region.anchorX;
    const dy = wy - region.anchorY;
    const distance = (dx * dx + dy * dy) * jitter;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}
