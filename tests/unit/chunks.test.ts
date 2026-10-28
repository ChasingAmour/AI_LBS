import { describe, it, expect } from 'vitest';
import { CHUNK_TILES, chunkOf, visibleChunks } from '../../src/world/chunks';
import { terrainFrame, terrainSprite, variantFor } from '../../src/world/terrainVisual';
import { decorForChunk } from '../../src/world/decor';
import { TILE } from '../../src/world/terrain';

describe('chunks', () => {
  it('maps tiles to 32x32 chunks', () => {
    expect(CHUNK_TILES).toBe(32);
    expect(chunkOf(0, 0)).toEqual({ cx: 0, cy: 0 });
    expect(chunkOf(31, 31)).toEqual({ cx: 0, cy: 0 });
    expect(chunkOf(32, 33)).toEqual({ cx: 1, cy: 1 });
  });

  it('covers the viewport at the world origin', () => {
    const chunks = visibleChunks(0, 0, 320, 180);
    expect(chunks).toContainEqual({ cx: 0, cy: 0 });
    expect(chunks.length).toBeGreaterThanOrEqual(4);
  });

  it('covers the viewport at the bottom-right corner', () => {
    const chunks = visibleChunks(10000 - 320, 6000 - 180, 320, 180);
    expect(chunks).toContainEqual({
      cx: Math.floor((10000 - 320) / 512),
      cy: Math.floor((6000 - 180) / 512),
    });
  });

  it('has no duplicate chunks', () => {
    const chunks = visibleChunks(4321, 2100, 320, 180);
    expect(new Set(chunks.map((c) => `${c.cx},${c.cy}`)).size).toBe(chunks.length);
    expect(chunks.length).toBeLessThanOrEqual(9);
  });
});

describe('terrainFrame', () => {
  it('uses different frames for coast and inland', () => {
    const coast = terrainFrame(TILE.sand, { n: false, e: true, s: true, w: true }, 0);
    const inland = terrainFrame(TILE.sand, { n: true, e: true, s: true, w: true }, 0);
    expect(coast).not.toBe(inland);
  });
});

describe('terrainSprite land', () => {
  it('uses the clean sand frame so beaches are not covered in grass tufts', () => {
    const sand = terrainSprite(TILE.sand, { n: true, e: true, s: true, w: true }, 0);
    expect(sand.frame).toBe(25);
  });

  it('tints clay so it reads differently from sand', () => {
    expect(terrainSprite(TILE.clay, { n: true, e: true, s: true, w: true }, 0).shade).not.toBeNull();
  });
});

describe('terrainSprite water', () => {  it('uses a pure water frame in open water', () => {
    for (const variant of [0, 1, 2]) {
      const interior = terrainSprite(TILE.deepWater, { n: false, e: false, s: false, w: false }, variant);
      expect(interior.frame).toBe(37);
      expect(interior.foam).toBe(0);
    }
  });

  it('marks land neighbours so the baker can draw a foam edge', () => {
    const shore = terrainSprite(TILE.shallowWater, { n: true, e: false, s: false, w: true }, 1);
    expect(shore.foam).toBe(1 | 8);
  });
});

describe('variantFor', () => {
  it('favours the plain variant so the ground stays calm', () => {
    const counts = [0, 0, 0];
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) counts[variantFor(x, y, 42)]++;
    }
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
  });

  it('is stable for the same tile and seed', () => {
    expect(variantFor(17, 29, 7)).toBe(variantFor(17, 29, 7));
  });
});

describe('decorForChunk', () => {
  it('keeps 1-2 deterministic decorations inside the chunk', () => {
    const chunkPx = CHUNK_TILES * 16;
    const first = decorForChunk(42, 3, 4);
    expect(first.length).toBeGreaterThanOrEqual(1);
    expect(first.length).toBeLessThanOrEqual(2);
    expect(decorForChunk(42, 3, 4)).toEqual(first);
    for (const decor of first) {
      expect(decor.x).toBeGreaterThanOrEqual(3 * chunkPx);
      expect(decor.x).toBeLessThan(4 * chunkPx);
      expect(decor.y).toBeGreaterThanOrEqual(4 * chunkPx);
      expect(decor.y).toBeLessThan(5 * chunkPx);
    }
  });
});
