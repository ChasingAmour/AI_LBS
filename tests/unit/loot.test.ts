import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { rollChestLoot } from '../../src/systems/lootSystem';
import { EQUIPMENT, LOOT_EQUIPMENT_IDS } from '../../src/data/equipment';

describe('chest loot', () => {
  it('first final chest is legendary and consumes the flag', () => {
    const s = createNewGame(5);
    const loot = rollChestLoot(s, 'final', createRng(1));
    expect(loot.firstClear).toBe(true);
    expect(loot.equipment.rarity).toBe('legendary');
    expect(s.dungeon.firstClearDone).toBe(true);
  });

  it('later final chests stop forcing legendary', () => {
    const s = createNewGame(5);
    s.dungeon.firstClearDone = true;
    const loot = rollChestLoot(s, 'final', createRng(2));
    expect(loot.firstClear).toBe(false);
  });

  it('normal chests never roll legendary', () => {
    const s = createNewGame(9);
    for (let i = 0; i < 40; i++) {
      const loot = rollChestLoot(s, 'normal', createRng(i));
      expect(loot.equipment.rarity).not.toBe('legendary');
      expect(EQUIPMENT[loot.equipment.baseId]).toBeTruthy();
      expect(EQUIPMENT[loot.equipment.baseId].source).toBe('loot');
      expect(LOOT_EQUIPMENT_IDS).toContain(loot.equipment.baseId);
      expect(loot.materials.length).toBeGreaterThanOrEqual(1);
      expect(loot.materials.length).toBeLessThanOrEqual(2);
      for (const material of loot.materials) {
        expect(['cloth', 'flint', 'stone', 'wood', 'vine']).toContain(material.baseId);
        expect(material.count).toBeGreaterThan(0);
      }
    }
  });

  it('advances lootRolls and is stable for the same seed', () => {
    const a = createNewGame(11);
    const b = createNewGame(11);
    const first = rollChestLoot(a, 'normal');
    const second = rollChestLoot(b, 'normal');
    expect(first).toEqual(second);
    expect(a.lootRolls).toBe(1);
  });
});
