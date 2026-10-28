import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from '../../src/core/config';

describe('bootstrap', () => {
  it('uses the pixel-art resolution from the spec', () => {
    expect(GAME_CONFIG.width).toBe(640);
    expect(GAME_CONFIG.height).toBe(360);
    expect(GAME_CONFIG.pixelArt).toBe(true);
  });
});
