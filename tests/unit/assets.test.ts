import { describe, it, expect } from 'vitest';
import { buildingSprite, nodeSprite } from '../../src/ui/assets';

describe('sprite mapping', () => {
  it('maps every resource node type', () => {
    for (const type of ['tree', 'palm', 'rock', 'vine', 'berry', 'tide', 'clay']) {
      expect(nodeSprite(type, false).texture).toBeTruthy();
      expect(nodeSprite(type, true).texture).toBeTruthy();
    }
  });

  it('uses a 2x2 hut for the camp shelter', () => {
    expect(buildingSprite('shelter')).toEqual({ texture: 'hut', w: 64, h: 64 });
  });

  it('falls back to a visible placeholder texture', () => {
    expect(nodeSprite('unknown', false).texture).toBe('farm');
  });
});
