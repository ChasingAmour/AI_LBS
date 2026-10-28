import { fbm } from '../core/noise';

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
