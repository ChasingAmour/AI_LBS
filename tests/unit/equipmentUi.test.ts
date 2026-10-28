import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { EQUIPMENT } from '../../src/data/equipment';
import { ITEMS } from '../../src/data/items';
import { addItem, sortInventory } from '../../src/systems/inventorySystem';
import { compareEquipment, equipInstance, rollEquipment } from '../../src/systems/equipmentSystem';
import { itemIcon } from '../../src/ui/itemIcons';

describe('equipment UI helpers', () => {
  it('merges stacks and sorts gear by rarity', () => {
    const state = createNewGame(1);
    addItem(state, 'wood', 60);
    addItem(state, 'wood', 50);
    addItem(state, 'berries', 2);
    state.equipmentInstances.push(
      rollEquipment(createRng(1), 'club', 'common', 'e1')!,
      rollEquipment(createRng(1), 'club', 'rare', 'e2')!,
    );
    sortInventory(state);
    expect(state.inventory.filter((item) => item.baseId === 'wood').map((item) => item.count)).toEqual([99, 11]);
    expect(state.equipmentInstances[0].rarity).toBe('rare');
  });

  it('equips and unequips an instance', () => {
    const state = createNewGame(1);
    const item = rollEquipment(createRng(1), 'captain_cutlass', 'rare', 'e3')!;
    state.equipmentInstances.push(item);
    expect(equipInstance(state, 'e3')).toBe(true);
    expect(state.equipment.weapon).toBe('e3');
    expect(compareEquipment(state, item).attack).toBe(0);
    expect(compareEquipment(state, { ...item, instanceId: 'e4' }).attack).toBe(0);
  });

  it('compares an upgrade against the equipped item', () => {
    const state = createNewGame(1);
    const common = rollEquipment(createRng(1), 'club', 'common', 'c1')!;
    const rare = rollEquipment(createRng(2), 'club', 'rare', 'c2')!;
    state.equipmentInstances.push(common, rare);
    state.equipment.weapon = common.instanceId;
    const delta = compareEquipment(state, rare);
    expect(delta.attack).toBeGreaterThanOrEqual(0);
    expect(delta.maxDurability).toBeGreaterThan(0);
  });

  it('maps every item and equipment base to an icon', () => {
    for (const id of Object.keys(ITEMS)) {
      expect(itemIcon(id), id).not.toBeNull();
    }
    for (const id of Object.keys(EQUIPMENT)) {
      expect(itemIcon(id), id).not.toBeNull();
    }
  });
});
