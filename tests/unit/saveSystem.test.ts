import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { addItem } from '../../src/systems/inventorySystem';
import {
  SaveError,
  canManualSave,
  loadGame,
  saveGame,
  serializeSave,
  validateSave,
} from '../../src/systems/saveSystem';

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

const memory = () => new MemoryStorage() as unknown as Storage;

describe('save system', () => {
  it('round-trips a populated state without losing fields', () => {
    const s = createNewGame(9);
    addItem(s, 'wood', 12);
    s.laborers.push({
      id: 'l1',
      name: '星期五',
      x: 1,
      y: 2,
      loyalty: 2,
      task: null,
      carrying: 0,
      carryingType: null,
    });
    const restored = validateSave(JSON.parse(serializeSave(s)));
    expect(restored).toEqual(s);
  });

  it('rejects corrupt save and falls back to backup', () => {
    const store = memory();
    store.setItem('robinson.save.v1', '{bad json');
    store.setItem('robinson.save.v1.bak', serializeSave(createNewGame(3)));
    const loaded = loadGame(store);
    expect(loaded).not.toBeNull();
    expect(loaded!.time.day).toBe(1);
  });

  it('returns null when both save slots are corrupt', () => {
    const store = memory();
    store.setItem('robinson.save.v1', '{bad json');
    store.setItem('robinson.save.v1.bak', '{also bad');
    expect(loadGame(store)).toBeNull();
  });

  it('returns null when there is no save', () => {
    expect(loadGame(memory())).toBeNull();
  });

  it('rejects unknown save version', () => {
    expect(() => validateSave({ version: 99 })).toThrow(SaveError);
  });

  it('rejects out-of-range needs', () => {
    const s = createNewGame(1);
    s.player.hp = 500;
    expect(() => validateSave(JSON.parse(serializeSave(s)))).toThrow(SaveError);
  });

  it('rejects dangling equipment references', () => {
    const s = createNewGame(1);
    s.equipment.weapon = 'missing';
    expect(() => validateSave(JSON.parse(serializeSave(s)))).toThrow(SaveError);
  });

  it('writes the previous main slot to backup', () => {
    const store = memory();
    const first = createNewGame(1);
    first.time.day = 4;
    saveGame(first, store);
    const second = createNewGame(2);
    second.time.day = 6;
    saveGame(second, store);
    const backup = JSON.parse(store.getItem('robinson.save.v1.bak')!);
    expect(backup.time.day).toBe(4);
    expect(JSON.parse(store.getItem('robinson.save.v1')!).time.day).toBe(6);
  });

  it('blocks manual save during raid', () => {
    const s = createNewGame(1);
    s.raid = { active: true, day: 5 };
    expect(canManualSave(s)).toBe(false);
    s.raid = null;
    expect(canManualSave(s)).toBe(true);
  });
});
