import { describe, expect, it } from 'vitest';
import { ITEMS, isEdible } from '../../src/data/items';
import { foodEffectLines } from '../../src/ui/format';

describe('物品食物与光源数据', () => {
  it('椰子同时回饱食与口渴', () => {
    expect(ITEMS.coconut.food).toEqual({ hunger: 10, thirst: 15 });
  });

  it('烤肉与肉干是食物且生肉不是', () => {
    expect(ITEMS.cooked_meat.food).toEqual({ hunger: 40 });
    expect(ITEMS.dried_meat.food).toEqual({ hunger: 30 });
    expect(ITEMS.raw_meat.kind).toBe('material');
    expect(ITEMS.raw_meat.food).toBeUndefined();
  });

  it('火把带光源参数', () => {
    expect(ITEMS.torch.light).toEqual({ radius: 64, brightness: 0.85 });
  });

  it('食物才可食用', () => {
    expect(isEdible('coconut')).toBe(true);
    expect(isEdible('cooked_meat')).toBe(true);
    expect(isEdible('raw_meat')).toBe(false);
    expect(isEdible('wood')).toBe(false);
  });

  it('tooltip 行只列非零项', () => {
    expect(foodEffectLines('coconut')).toEqual(['饱食 +10', '口渴 +15']);
    expect(foodEffectLines('bandage')).toEqual(['回复 30 生命（8 秒）']);
    expect(foodEffectLines('raw_meat')).toEqual([]);
  });
});
