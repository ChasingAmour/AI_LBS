import { describe, it, expect } from 'vitest';
import { validateGameData } from '../../src/systems/dataValidation';
import { ANIMALS } from '../../src/data/animals';
import { ITEMS } from '../../src/data/items';

describe('game data integrity', () => {
  it('all data references are valid', () => {
    expect(validateGameData()).toEqual([]);
  });

  it('动物数值与掉落合法', () => {
    expect(Object.keys(ANIMALS).length).toBeGreaterThanOrEqual(15);
    for (const id of ['boar', 'chicken', 'fish', 'rabbit']) {
      expect(ANIMALS[id]).toBeDefined();
    }
    for (const def of Object.values(ANIMALS)) {
      expect(def.hp).toBeGreaterThan(0);
      expect(def.habitat.length).toBeGreaterThan(0);
      for (const drop of def.drops) expect(ITEMS[drop.baseId]).toBeDefined();
    }
    expect(ANIMALS.boar.size).toBe('large');
    expect(ANIMALS.chicken.size).toBe('small');
    expect(ANIMALS.fish.aquatic).toBe(true);
    expect(ANIMALS.fish.flees).toBe(true);
    expect(ANIMALS.boar.aggressive).toBe(true);
    expect(ANIMALS.tiger.aggressive).toBe(true);
  });
});
