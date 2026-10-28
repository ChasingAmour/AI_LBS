import Phaser from 'phaser';
import { WORLD } from '../core/config';
import { TILE } from '../world/terrain';
import { CHUNK_PX } from '../world/chunks';
import type { IslandData } from '../world/generate';

const TERRAIN_COLOR: Record<number, number> = {
  [TILE.deepWater]: 0x1c4f66,
  [TILE.shallowWater]: 0x2f7f96,
  [TILE.stream]: 0x3f9fd0,
  [TILE.sand]: 0xd9a05e,
  [TILE.grass]: 0x7ec850,
  [TILE.forest]: 0x4f8a3c,
  [TILE.rock]: 0x8a8478,
  [TILE.clay]: 0xb07a4f,
};

const PARCHMENT = 0xf0dfb8;

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Paints the island silhouette (terrain colours + parchment fog) into a canvas
 * texture. Shared by the full map (400×240) and the HUD minimap (128×96).
 */
export function renderIslandCanvas(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  island: IslandData | undefined,
  explored: Set<string>,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture || !island) return;
  const ctx = texture.context;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const worldX = (px / width) * WORLD.widthPx;
      const worldY = (py / height) * WORLD.heightPx;
      const tile = island.terrain[
        Math.floor(worldY / WORLD.tile) * WORLD.widthTiles + Math.floor(worldX / WORLD.tile)
      ];
      const base = TERRAIN_COLOR[tile] ?? TERRAIN_COLOR[TILE.grass];
      const cx = Math.floor(worldX / CHUNK_PX);
      const cy = Math.floor(worldY / CHUNK_PX);
      const seen = explored.has(`${cx},${cy}`);
      const sea = base === TERRAIN_COLOR[TILE.deepWater] || base === TERRAIN_COLOR[TILE.shallowWater];
      const color = seen ? base : mix(base, PARCHMENT, sea ? 0.22 : 0.74);
      ctx.fillStyle = css(color);
      ctx.fillRect(px, py, 1, 1);
    }
  }

  if (width >= 200) {
    const image = ctx.getImageData(0, 0, width, height).data;
    ctx.fillStyle = 'rgba(74,47,24,0.85)';
    for (let py = 1; py < height - 1; py++) {
      for (let px = 1; px < width - 1; px++) {
        const i = (py * width + px) * 4;
        const isLand = image[i + 1] > image[i + 2] + 10;
        const neighborLand =
          image[i - 4 + 1] > image[i - 4 + 2] + 10 ||
          image[i + 4 + 1] > image[i + 4 + 2] + 10 ||
          image[i - width * 4 + 1] > image[i - width * 4 + 2] + 10 ||
          image[i + width * 4 + 1] > image[i + width * 4 + 2] + 10;
        if (isLand && !neighborLand) ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  texture.refresh();
}
