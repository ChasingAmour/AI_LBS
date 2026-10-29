export const TILE = {
  deepWater: 1,
  shallowWater: 2,
  sand: 3,
  grass: 4,
  forest: 5,
  rock: 6,
  stream: 7,
  clay: 8,
  cliff: 9,
  path: 10,
} as const;

const SPEED: Record<number, number> = {
  [TILE.deepWater]: 0,
  [TILE.shallowWater]: 0.6,
  [TILE.sand]: 0.9,
  [TILE.grass]: 1,
  [TILE.forest]: 0.85,
  [TILE.rock]: 0.9,
  [TILE.stream]: 0.8,
  [TILE.clay]: 0.95,
  [TILE.cliff]: 0,
  [TILE.path]: 1.05,
};

export function terrainSpeedAt(tileId: number): number {
  return SPEED[tileId] ?? 1;
}
