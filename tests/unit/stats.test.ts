import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { addItem } from '../../src/systems/inventorySystem';
import { rollEquipment } from '../../src/systems/equipmentSystem';
import {
  deriveStats,
  repairCost,
  repairEquipped,
  tickBootWear,
} from '../../src/systems/statsSystem';

function equip(slot: 'weapon' | 'armor' | 'boots', baseId: string, rarity: 'common' | 'fine' | 'rare' | 'epic' | 'legendary', seed = 1) {
  const state = createNewGame(1);
  const instance = rollEquipment(createRng(seed), baseId, rarity, 'eq_test')!;
  state.equipment[slot] = instance.instanceId;
  state.equipmentInstances.push(instance);
  return { state, instance };
}

describe('derived stats', () => {
  it('aggregates base stats and affixes', () => {
    const { state } = equip('weapon', 'captain_cutlass', 'epic', 4);
    const stats = deriveStats(state);
    expect(stats.attack).toBeGreaterThan(0);
    expect(stats.energyMax).toBe(100);
  });

  it('ignores gear at zero durability', () => {
    const { state, instance } = equip('boots', 'captain_boots', 'legendary', 2);
    expect(deriveStats(state).moveMul).toBeGreaterThan(1.2);
    instance.durability = 0;
    expect(deriveStats(state).moveMul).toBe(1);
  });

  it('maps legendary traits', () => {
    const { state } = equip('boots', 'wading_shoes', 'legendary', 5);
    const stats = deriveStats(state);
    expect(stats.shallowImmune).toBe(true);
    expect(stats.waveWalk).toBe(true);
  });

  it('wears boots every 2000px', () => {
    const { state, instance } = equip('boots', 'straw_shoes', 'common');
    const before = instance.durability;
    tickBootWear(state, 1999);
    expect(instance.durability).toBe(before);
    tickBootWear(state, 1);
    expect(instance.durability).toBe(before - 1);
  });

  it('prices repairs per 20 durability and charges cloth for legendaries', () => {
    const { instance } = equip('weapon', 'club', 'legendary');
    instance.durability = instance.maxDurability - 41;
    expect(repairCost(instance)).toMatchObject({ wood: 3, vine: 3, cloth: 1 });
  });

  it('repairs at a workbench when materials are available', () => {
    const { state, instance } = equip('weapon', 'club', 'common');
    instance.durability = 1;
    addItem(state, 'wood', 5);
    addItem(state, 'vine', 5);
    expect(repairEquipped(state, instance.instanceId, false)).toBe(false);
    expect(repairEquipped(state, instance.instanceId, true)).toBe(true);
    expect(instance.durability).toBe(instance.maxDurability);
  });
});
