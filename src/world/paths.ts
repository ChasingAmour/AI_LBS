import { hash2D } from '../core/noise';
import { TILE } from './terrain';
import { heightAt } from './height';
import { isWalkableTile, tileAt, tileCenter, type Landmark, type Vec2 } from './landmarks';
import type { TerrainData } from './generate';

export interface Trail {
  points: Vec2[];
}

const TILE_PX = 16;

function bend(from: Vec2, to: Vec2, seed: number): Vec2[] {
  const points: Vec2[] = [{ x: from.x, y: from.y }];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  for (let segment = 1; segment < 4; segment++) {
    const t = segment / 4;
    const offset = (hash2D(segment, seed, 17) - 0.5) * Math.min(180, length * 0.22);
    points.push({
      x: Math.round(from.x + dx * t + nx * offset),
      y: Math.round(from.y + dy * t + ny * offset),
    });
  }
  points.push({ x: to.x, y: to.y });
  return points;
}

/** Prim's minimum spanning tree over the landmarks: six trails for seven landmarks. */
export function buildTrails(landmarks: Landmark[], seed: number): Trail[] {
  if (landmarks.length < 2) return [];

  const inTree = new Set<number>([0]);
  const trails: Trail[] = [];

  while (inTree.size < landmarks.length) {
    let best: { from: number; to: number; distance: number } | null = null;
    for (const from of inTree) {
      for (let to = 0; to < landmarks.length; to++) {
        if (inTree.has(to)) continue;
        const distance = Math.hypot(
          landmarks[from].x - landmarks[to].x,
          landmarks[from].y - landmarks[to].y,
        );
        if (!best || distance < best.distance) best = { from, to, distance };
      }
    }
    if (!best) break;
    inTree.add(best.to);
    trails.push({
      points: bend(landmarks[best.from], landmarks[best.to], seed + best.from * 31 + best.to * 7),
    });
  }

  return trails;
}

/**
 * Walks downhill from the spring toward the tidal bay, then carves the path
 * into stream tiles. The spring tile itself and the camp clearing are left
 * untouched so landmarks stay on walkable ground.
 */
export function carveRiver(
  island: TerrainData,
  spring: Landmark,
  seed: number,
  protectedCenter: Vec2,
): Trail | null {
  const target = { x: 2100, y: 3700 };
  const points: Vec2[] = [];
  const visited = new Set<number>();
  let tx = Math.floor(spring.x / TILE_PX);
  let ty = Math.floor(spring.y / TILE_PX);

  for (let step = 0; step < 320; step++) {
    const index = ty * island.width + tx;
    if (visited.has(index)) break;
    visited.add(index);

    const tile = tileAt(island, tx, ty);
    if (step > 3 && !isWalkableTile(tile)) {
      points.push(tileCenter(tx, ty));
      break;
    }
    points.push(tileCenter(tx, ty));

    let best: { x: number; y: number; score: number } | null = null;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx < 0 || ny < 0 || nx >= island.width || ny >= island.height) continue;
        if (visited.has(ny * island.width + nx)) continue;
        const wx = nx * TILE_PX + TILE_PX / 2;
        const wy = ny * TILE_PX + TILE_PX / 2;
        const height = heightAt(seed, wx, wy);
        const pull = Math.hypot(wx - target.x, wy - target.y) / 60000;
        const noise = hash2D(nx, ny, seed + 13) * 0.002;
        const score = height + pull + noise;
        if (!best || score < best.score) best = { x: nx, y: ny, score };
      }
    }
    if (!best) break;
    tx = best.x;
    ty = best.y;
  }

  if (points.length < 5) return null;

  const cx = Math.floor(protectedCenter.x / TILE_PX);
  const cy = Math.floor(protectedCenter.y / TILE_PX);
  for (let i = 2; i < points.length; i++) {
    const px = Math.floor(points[i].x / TILE_PX);
    const py = Math.floor(points[i].y / TILE_PX);
    if (Math.abs(px - cx) <= 2 && Math.abs(py - cy) <= 2) continue;
    const index = py * island.width + px;
    const tile = island.terrain[index];
    if (isWalkableTile(tile) && tile !== TILE.stream) island.terrain[index] = TILE.stream;
  }

  return { points };
}
