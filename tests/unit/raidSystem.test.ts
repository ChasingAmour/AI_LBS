import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { resolveRaidDawn, resolveRaidDawnWith, spawnRaid } from '../../src/systems/raidSystem';

describe('raid system', () => {
  it('spawns two savages at lv0 and lv1', () => {
    const s = createNewGame(1);
    expect(spawnRaid(s)).toHaveLength(2);
    s.camp.level = 1;
    expect(spawnRaid(s)).toHaveLength(2);
  });

  it('spawns three at lv2 and four at lv3', () => {
    const s = createNewGame(1);
    s.camp.level = 2;
    expect(spawnRaid(s)).toHaveLength(3);
    s.camp.level = 3;
    expect(spawnRaid(s)).toHaveLength(4);
  });

  it('marks the raid active and stores savages on the state', () => {
    const s = createNewGame(1);
    const spawned = spawnRaid(s);
    expect(s.raid?.active).toBe(true);
    expect(s.savages).toHaveLength(spawned.length);
  });

  it('dawn takes five food per survivor and damages a building when food is short', () => {
    const s = createNewGame(1);
    const box = {
      id: 'box',
      type: 'storage',
      x: 0,
      y: 0,
      hp: 80,
      storage: [{ baseId: 'cooked_fish', count: 3 }],
    };
    s.buildings.push(box);
    const result = resolveRaidDawnWith(s, 1);
    expect(result.foodLost).toBe(3);
    expect(result.damagedBuildingId).toBe('box');
    expect(box.storage).toEqual([]);
  });

  it('dawn feeds survivors in priority order', () => {
    const s = createNewGame(1);
    const box = {
      id: 'box',
      type: 'storage',
      x: 0,
      y: 0,
      hp: 80,
      storage: [
        { baseId: 'berries', count: 4 },
        { baseId: 'cooked_fish', count: 3 },
      ],
    };
    s.buildings.push(box);
    const result = resolveRaidDawnWith(s, 1);
    expect(result.foodLost).toBe(5);
    expect(result.damagedBuildingId).toBeUndefined();
    expect(box.storage).toEqual([{ baseId: 'berries', count: 2 }]);
  });

  it('dawn with no storage still damages a building', () => {
    const s = createNewGame(1);
    s.buildings.push({ id: 'f1', type: 'fence', x: 0, y: 0, hp: 60 });
    const result = resolveRaidDawnWith(s, 2);
    expect(result.foodLost).toBe(0);
    expect(result.damagedBuildingId).toBe('f1');
  });

  it('resolveRaidDawn clears the raid and keeps survivors alive', () => {
    const s = createNewGame(1);
    spawnRaid(s);
    const result = resolveRaidDawn(s);
    expect(result.foodLost).toBe(0);
    expect(s.raid).toBeNull();
  });
});
