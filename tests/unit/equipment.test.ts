import { describe, it, expect } from 'vitest';
import {
  CRAFTED_EQUIPMENT,
  EQUIPMENT,
  LOOT_EQUIPMENT,
  LOOT_EQUIPMENT_IDS,
  RARITY,
  affixesFor,
} from '../../src/data/equipment';
import { RECIPES } from '../../src/data/recipes';
import { gearStatLines, recycleInstance, rollEquipment } from '../../src/systems/equipmentSystem';
import { createRng } from '../../src/core/rng';
import { createNewGame } from '../../src/core/gameState';
import { countItem } from '../../src/systems/inventorySystem';

describe('equipment rolls', () => {
  it('defines the 17 approved bases', () => {
    expect(Object.keys(EQUIPMENT)).toHaveLength(17);
    expect(EQUIPMENT.captain_boots.slot).toBe('boots');
  });

  it('keeps crafted gear and dungeon loot in separate pools', () => {
    expect(CRAFTED_EQUIPMENT).toHaveLength(11);
    expect(LOOT_EQUIPMENT).toHaveLength(6);
    const crafted = CRAFTED_EQUIPMENT.map((base) => base.id);
    expect(new Set(crafted).size).toBe(crafted.length);
    expect(LOOT_EQUIPMENT_IDS.some((id) => crafted.includes(id))).toBe(false);

    const recipeOutputs = new Set(Object.values(RECIPES).map((recipe) => recipe.output));
    for (const id of crafted) expect(recipeOutputs.has(id)).toBe(true);
    for (const id of LOOT_EQUIPMENT_IDS) expect(recipeOutputs.has(id)).toBe(false);
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

  it('tooltip 里显示攻击、耐久与无词条提示', () => {
    const club = rollEquipment(createRng(1), 'club', 'common', 'e5')!;
    expect(gearStatLines(club)).toEqual(['攻击 8', '耐久 40/40', '无词条（普通品质）']);
  });

  it('回炉会移除装备并熔出铁锭', () => {
    const state = createNewGame(1);
    const rare = rollEquipment(createRng(2), 'spear', 'rare', 'e6')!;
    state.equipmentInstances.push(rare);
    state.equipment.weapon = rare.instanceId;
    const gained = recycleInstance(state, rare.instanceId);
    expect(gained).toEqual({ baseId: 'iron_ingot', count: 2 });
    expect(state.equipmentInstances).toHaveLength(0);
    expect(state.equipment.weapon).toBeNull();
    expect(countItem(state, 'iron_ingot')).toBe(2);
  });
});
