import { WORLD } from '../core/config';
import { fbm, fnv1a } from '../core/noise';
import { TILE } from './terrain';
import { regionIndexAt } from './regions';

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

interface Lobe {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/** Six overlapping ellipses make the coastline instead of one circular falloff. */
const LOBES: readonly Lobe[] = [
  { x: 5200, y: 3400, rx: 3300, ry: 1750 },
  { x: 5200, y: 4900, rx: 2250, ry: 780 },
  { x: 7150, y: 3700, rx: 1600, ry: 1250 },
  { x: 2700, y: 3750, rx: 1500, ry: 1100 },
  { x: 4800, y: 1950, rx: 1900, ry: 1100 },
  { x: 7250, y: 2100, rx: 1150, ry: 800 },
];

const SEA_DEEP = 0.455;
const SEA_SHALLOW = 0.535;
const SHORE = 0.575;
const BEACH_END = 0.615;

function lobeField(wx: number, wy: number): number {
  let best = -9;
  for (const lobe of LOBES) {
    const dx = (wx - lobe.x) / lobe.rx;
    const dy = (wy - lobe.y) / lobe.ry;
    const field = 1 - (dx * dx + dy * dy);
    if (field > best) best = field;
  }
  return best;
}

/** Height in roughly 0..1: 0.52 base, +0.30 per unit of shape field, plus noise. */
export function heightAt(seed: number, wx: number, wy: number): number {
  const warpX = wx + (fbm(wx / 2400, wy / 2400, seed + 21, 2) - 0.5) * 1000;
  const warpY = wy + (fbm(wx / 2400 + 31, wy / 2400 + 17, seed + 33, 2) - 0.5) * 1000;
  const shape = lobeField(warpX, warpY);
  const detail = (fbm(wx / 900, wy / 900, seed + 3) - 0.5) * 0.1;
  return 0.52 + shape * 0.3 + detail;
}

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
