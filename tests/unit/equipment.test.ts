import { describe, it, expect } from 'vitest';
import { EQUIPMENT, RARITY, affixesFor } from '../../src/data/equipment';
import { rollEquipment } from '../../src/systems/equipmentSystem';
import { createRng } from '../../src/core/rng';

describe('equipment rolls', () => {
  it('defines the 14 approved bases', () => {
    expect(Object.keys(EQUIPMENT)).toHaveLength(14);
    expect(EQUIPMENT.captain_boots.slot).toBe('boots');
  });

  it('is deterministic for the same rng state', () => {
    const a = rollEquipment(createRng(42), 'spear', 'rare', 'e1');
    const b = rollEquipment(createRng(42), 'spear', 'rare', 'e1');
    expect(a).toEqual(b);
  });

  it('rolls the rarity affix count without duplicates', () => {
    for (const rarity of ['fine', 'rare', 'epic', 'legendary'] as const) {
      const item = rollEquipment(createRng(7), 'vine_armor', rarity, 'e2')!;
      expect(item.affixes).toHaveLength(RARITY[rarity].affixes);
      expect(new Set(item.affixes.map((affix) => affix.id)).size).toBe(item.affixes.length);
      for (const affix of item.affixes) {
        expect(affixesFor('armor').some((def) => def.id === affix.id)).toBe(true);
      }
    }
  });

  it('keeps common gear affix-free', () => {
    const item = rollEquipment(createRng(1), 'club', 'common', 'e3')!;
    expect(item.affixes).toEqual([]);
    expect(item.uniqueTraitId).toBeUndefined();
  });

  it('binds the legendary trait and scales durability', () => {
    const legendary = rollEquipment(createRng(3), 'captain_coat', 'legendary', 'e4')!;
    expect(legendary.uniqueTraitId).toBe('old_sailor');
    expect(legendary.maxDurability).toBeGreaterThan(EQUIPMENT.captain_coat.durability);
  });
});
