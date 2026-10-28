import { describe, it, expect } from 'vitest';
import { animalSprite, buildingSprite, entranceSprite, nodeSprite } from '../../src/ui/assets';

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

  it('每种动物都有精灵帧', () => {
    for (const id of ['chicken', 'rabbit', 'boar']) {
      expect(animalSprite(id).texture).toBeTruthy();
    }
    expect(animalSprite('chicken')).not.toEqual(animalSprite('boar'));
  });

  it('沉船入口用独立舱口贴图，不是营火帧', () => {
    expect(entranceSprite().texture).toBe('wreck-hatch');
    expect(entranceSprite().texture).not.toBe(buildingSprite('campfire').texture);
  });
});
