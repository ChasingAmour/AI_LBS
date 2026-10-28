import { describe, it, expect } from 'vitest';
import { createNewGame, type EquipInstance } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { createSavage } from '../../src/entities/savage';
import { rollEquipment } from '../../src/systems/equipmentSystem';
import { deriveStats } from '../../src/systems/statsSystem';
import { applyDamage, spendEnergy } from '../../src/systems/needsSystem';
import { findInteractTarget } from '../../src/systems/interactionSystem';
import { addItem } from '../../src/systems/inventorySystem';

function equip(state: ReturnType<typeof createNewGame>, slot: 'weapon' | 'armor' | 'boots', baseId: string, rarity: 'common' | 'fine' | 'rare' | 'epic' | 'legendary', seed = 1) {
  const instance = rollEquipment(createRng(seed), baseId, rarity, 'eq_x')!;
  state.equipment[slot] = instance.instanceId;
  state.equipmentInstances.push(instance);
  return instance;
}

describe('equipment integration', () => {
  it('reduces incoming damage by defense and reflects thorns', () => {
    const state = createNewGame(1);
    equip(state, 'armor', 'vine_armor', 'legendary', 2);
    const stats = deriveStats(state);
    const savage = createSavage('s1', 0, 0);
    state.savages = [savage];
    applyDamage(state, 10, { kind: 'savage', id: 's1' });
    expect(state.player.hp).toBe(100 - Math.max(1, 10 - stats.defense));
    expect(savage.hp).toBe(60 - stats.thorns);
  });

  it('honours the energy cap from gear', () => {
    const state = createNewGame(1);
    const instance: EquipInstance = {
      instanceId: 'eq_energy',
      baseId: 'canvas_armor',
      slot: 'armor',
      rarity: 'rare',
      affixes: [{ id: 'energy', value: 25 }],
      durability: 100,
      maxDurability: 100,
    };
    state.equipment.armor = instance.instanceId;
    state.equipmentInstances.push(instance);
    state.player.energy = 120;
    spendEnergy(state, 10);
    expect(state.player.energy).toBe(110);
  });

  it('shortens gather channels with a gather affix', () => {
    const state = createNewGame(1);
    const instance: EquipInstance = {
      instanceId: 'eq_gather',
      baseId: 'club',
      slot: 'weapon',
      rarity: 'rare',
      affixes: [{ id: 'gather', value: 0.25 }],
      durability: 40,
      maxDurability: 40,
    };
    state.equipment.weapon = instance.instanceId;
    state.equipmentInstances.push(instance);
    addItem(state, 'stone_axe', 1);
    state.world.nodes.tree_1 = { x: state.player.x + 8, y: state.player.y, type: 'tree' };
    const target = findInteractTarget(state, state.player.x, state.player.y, { onWater: false });
    expect(target?.durationSec).toBeCloseTo(1.5 / 1.25, 2);
  });
});
