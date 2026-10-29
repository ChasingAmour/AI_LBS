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
      if (height > 0.86) return TILE.rock;
      if (height > 0.8) return TILE.cliff;
      return height > 0.72 ? TILE.rock : TILE.grass;
    case 3:
      return detail > 0.62 ? TILE.clay : TILE.grass;
    case 4:
      if (height > 0.86) return TILE.cliff;
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

/** Rasterises the landmark trails into dirt paths, cutting ramps through cliffs. */
function carveTrails(base: TerrainData, trails: Trail[], protectedCenter: Vec2): void {
  const cx = Math.floor(protectedCenter.x / 16);
  const cy = Math.floor(protectedCenter.y / 16);
  const carve = (tx: number, ty: number): void => {
    if (tx < 0 || ty < 0 || tx >= base.width || ty >= base.height) return;
    if (Math.abs(tx - cx) <= 2 && Math.abs(ty - cy) <= 2) return;
    const index = ty * base.width + tx;
    const tile = base.terrain[index];
    if (
      tile === TILE.sand ||
      tile === TILE.grass ||
      tile === TILE.forest ||
      tile === TILE.rock ||
      tile === TILE.clay ||
      tile === TILE.cliff
    ) {
      base.terrain[index] = TILE.path;
    }
  };
  for (const trail of trails) {
    for (let i = 1; i < trail.points.length; i++) {
      const from = trail.points[i - 1];
      const to = trail.points[i];
      let x0 = Math.floor(from.x / 16);
      let y0 = Math.floor(from.y / 16);
      const x1 = Math.floor(to.x / 16);
      const y1 = Math.floor(to.y / 16);
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let error = dx + dy;
      for (let guard = 0; guard < 500; guard++) {
        carve(x0, y0);
        carve(x0 + 1, y0);
        carve(x0, y0 + 1);
        carve(x0 + 1, y0 + 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * error;
        if (e2 >= dy) {
          error += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          error += dx;
          y0 += sy;
        }
      }
    }
  }
}

/** Terrain plus landmarks, trails, rivers and the spawn point. */
export function generateIsland(seed: number): IslandData {
  const base = generateTerrain(seed);
  const { landmarks, campCenter, spawn } = placeLandmarks(base, seed);
  const trails = buildTrails(landmarks, seed);
  const spring = landmarks.find((landmark) => landmark.kind === 'spring');
  const river = spring ? carveRiver(base, spring, seed, campCenter) : null;
  carveTrails(base, trails, campCenter);

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
