import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { SAVE_VERSION } from '../../src/core/saveVersion';
import { serializeSave, validateSave } from '../../src/systems/saveSystem';
import { createRng } from '../../src/core/rng';
import { rollEquipment } from '../../src/systems/equipmentSystem';

describe('save v5', () => {
  it('creates the music and touch defaults', () => {
    const state = createNewGame(7);
    expect(SAVE_VERSION).toBe(5);
    expect(state.version).toBe(5);
    expect(state.settings).toEqual({
      muted: false,
      sfxVolume: 0.7,
      musicMuted: false,
      musicVolume: 0.45,
      hudCompact: false,
      touchControls: true,
    });
  });

  it('round-trips a v5 save', () => {
    const state = createNewGame(11);
    state.settings.musicMuted = true;
    state.settings.musicVolume = 0.2;
    state.settings.touchControls = false;
    expect(validateSave(JSON.parse(serializeSave(state)))).toEqual(state);
  });

  it('migrates v4 settings and keeps equipment', () => {
    const old = JSON.parse(serializeSave(createNewGame(5))) as Record<string, unknown>;
    old.version = 4;
    const settings = old.settings as Record<string, unknown>;
    delete settings.musicMuted;
    delete settings.musicVolume;
    delete settings.touchControls;
    const item = rollEquipment(createRng(1), 'club', 'rare', 'eq_keep')!;
    (old.equipmentInstances as unknown[]).push(item);
    (old.equipment as Record<string, unknown>).weapon = 'eq_keep';
    old.animals = [];
    (old.buildings as unknown[]).push({ id: 'b_keep', type: 'storage', x: 44, y: 44, hp: 80, storage: [] });

    const migrated = validateSave(old);
    expect(migrated.version).toBe(5);
    expect(migrated.settings.musicMuted).toBe(false);
    expect(migrated.settings.musicVolume).toBeCloseTo(0.45);
    expect(migrated.settings.touchControls).toBe(true);
    expect(migrated.equipment.weapon).toBe('eq_keep');
    expect(migrated.equipmentInstances.some((gear) => gear.instanceId === 'eq_keep')).toBe(true);
    expect(migrated.buildings.some((building) => building.id === 'b_keep')).toBe(true);
    expect(Array.isArray(migrated.animals)).toBe(true);
  });

  it('migrates a v1 save all the way to v5', () => {
    const old = JSON.parse(serializeSave(createNewGame(9))) as Record<string, unknown>;
    old.version = 1;
    delete (old.world as Record<string, unknown>).seed;
    const migrated = validateSave(old);
    expect(migrated.version).toBe(5);
    expect(migrated.settings.musicVolume).toBeCloseTo(0.45);
  });

  it('keeps a planted farm crop across a round trip', () => {
    const state = createNewGame(4);
    state.buildings.push({
      id: 'b_farm',
      type: 'farm_plot',
      x: 40,
      y: 40,
      hp: 40,
      crop: { seedId: 'berries', growth: 2, wateredDay: 1, plantedDay: 1 },
    });
    const restored = validateSave(JSON.parse(serializeSave(state)));
    expect(restored.buildings.find((b) => b.id === 'b_farm')?.crop).toEqual({
      seedId: 'berries',
      growth: 2,
      wateredDay: 1,
      plantedDay: 1,
    });
  });

  it('rejects out-of-range music volume and non-boolean touch flag', () => {
    const loud = JSON.parse(serializeSave(createNewGame(3))) as Record<string, unknown>;
    (loud.settings as Record<string, unknown>).musicVolume = 2;
    expect(() => validateSave(loud)).toThrow();

    const badTouch = JSON.parse(serializeSave(createNewGame(3))) as Record<string, unknown>;
    (badTouch.settings as Record<string, unknown>).touchControls = 'yes';
    expect(() => validateSave(badTouch)).toThrow();
  });
});
