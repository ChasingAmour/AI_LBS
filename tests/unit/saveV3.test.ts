import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { addItem } from '../../src/systems/inventorySystem';
import { craft } from '../../src/systems/craftingSystem';
import { SAVE_VERSION, serializeSave, validateSave } from '../../src/systems/saveSystem';

describe('save v3', () => {
  it('creates v3 defaults', () => {
    const state = createNewGame(7);
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.settings).toEqual({ muted: false, sfxVolume: 0.7, hudCompact: false });
    expect(state.lootSeed).toBe(7);
    expect(state.lootRolls).toBe(0);
    expect(state.bootWear).toBe(0);
    expect(state.dungeon.pendingReset).toBe(false);
  });

  it('round-trips a v3 save', () => {
    const state = createNewGame(11);
    state.settings.muted = true;
    state.settings.sfxVolume = 0.3;
    expect(validateSave(JSON.parse(serializeSave(state)))).toEqual(state);
  });

  it('migrates v2 and converts legacy club/spear stacks', () => {
    const old = JSON.parse(serializeSave(createNewGame(5))) as Record<string, unknown>;
    old.version = 2;
    delete old.settings;
    delete old.lootSeed;
    delete old.lootRolls;
    delete old.bootWear;
    (old.dungeon as Record<string, unknown>).pendingReset = undefined;
    old.inventory = [{ baseId: 'club', count: 2, durability: 12 }];
    (old.hotbar as (string | null)[])[0] = 'club';

    const migrated = validateSave(old);
    expect(migrated.version).toBe(3);
    expect(migrated.inventory).toHaveLength(0);
    expect(migrated.equipmentInstances.filter((item) => item.baseId === 'club')).toHaveLength(2);
    expect(migrated.equipmentInstances[0].durability).toBe(12);
    expect(migrated.hotbar[0]).toBeNull();
    expect(migrated.settings.sfxVolume).toBeCloseTo(0.7);
    expect(migrated.lootSeed).toBeTypeOf('number');
  });

  it('migrates v1 all the way to v3', () => {
    const old = JSON.parse(serializeSave(createNewGame(9))) as Record<string, unknown>;
    old.version = 1;
    delete (old.world as Record<string, unknown>).seed;
    const migrated = validateSave(old);
    expect(migrated.version).toBe(3);
    expect(migrated.world.seed).toBeTypeOf('number');
  });

  it('crafts a common equipment instance instead of a stack', () => {
    const state = createNewGame(1);
    state.camp.level = 1;
    addItem(state, 'wood', 10);
    addItem(state, 'rope', 5);
    expect(craft(state, 'club', true)).toBe(true);
    expect(state.inventory.some((item) => item.baseId === 'club')).toBe(false);
    const club = state.equipmentInstances.find((item) => item.baseId === 'club');
    expect(club?.rarity).toBe('common');
  });
});
