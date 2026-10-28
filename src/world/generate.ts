import { WORLD } from '../core/config';
import { fbm, fnv1a } from '../core/noise';
import { TILE } from './terrain';
import { regionIndexAt } from './regions';
import { heightAt } from './height';
import { placeLandmarks } from './landmarks';
import { buildTrails, carveRiver, type Trail } from './paths';
import type { Landmark, Vec2 } from './landmarks';

export interface TerrainData {
  width: number;
  height: number;
  /** Logical terrain ids, one byte per tile (625×375). */
  terrain: Uint8Array;
  /** Region id per tile (0..4). */
  regions: Uint8Array;
  /** FNV-1a checksum of the terrain bytes. */
  hash: number;
}

export interface IslandData extends TerrainData {
  landmarks: Landmark[];
  trails: Trail[];
  rivers: Trail[];
  spawn: Vec2;
  campCenter: Vec2;
}

const SEA_DEEP = 0.455;
const SEA_SHALLOW = 0.535;
const SHORE = 0.575;
const BEACH_END = 0.615;

function landTile(region: number, height: number, wx: number, wy: number, seed: number): number {
  if (height < BEACH_END) return TILE.sand;
  const detail = fbm(wx / 260, wy / 260, seed + 91, 3);
  switch (region) {
    case 1:
      return detail > 0.35 ? TILE.forest : TILE.grass;
    case 2:
      return height > 0.72 ? TILE.rock : TILE.grass;
    case 3:
      return detail > 0.62 ? TILE.clay : TILE.grass;
    case 4:
      return detail > 0.45 ? TILE.rock : TILE.grass;
    default:
      return detail > 0.62 ? TILE.forest : TILE.grass;
  }
}

export function generateTerrain(seed: number): TerrainData {
  const { widthTiles, heightTiles, tile } = WORLD;
  const terrain = new Uint8Array(widthTiles * heightTiles);
  const regions = new Uint8Array(widthTiles * heightTiles);

  for (let ty = 0; ty < heightTiles; ty++) {
    for (let tx = 0; tx < widthTiles; tx++) {
      const index = ty * widthTiles + tx;
      const wx = tx * tile + tile / 2;
      const wy = ty * tile + tile / 2;
      const height = heightAt(seed, wx, wy);
      const region = regionIndexAt(seed, tx, ty);
      regions[index] = region;

      if (height < SEA_DEEP) terrain[index] = TILE.deepWater;
      else if (height < SEA_SHALLOW) terrain[index] = TILE.shallowWater;
      else if (height < SHORE) terrain[index] = TILE.sand;
      else terrain[index] = landTile(region, height, wx, wy, seed);
    }
  }

  return { width: widthTiles, height: heightTiles, terrain, regions, hash: fnv1a(terrain) };
}

/** Terrain plus landmarks, trails, rivers and the spawn point. */
export function generateIsland(seed: number): IslandData {
  const base = generateTerrain(seed);
  const { landmarks, campCenter, spawn } = placeLandmarks(base, seed);
  const trails = buildTrails(landmarks, seed);
  const spring = landmarks.find((landmark) => landmark.kind === 'spring');
  const river = spring ? carveRiver(base, spring, seed, campCenter) : null;

  return {
    ...base,
    landmarks,
    trails,
    rivers: river ? [river] : [],
    spawn,
    campCenter,
    hash: fnv1a(base.terrain),
  };
}
