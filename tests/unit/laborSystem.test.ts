import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { assignLaborer, settleLaborRations, tickLabor } from '../../src/systems/laborSystem';

function laborer(loyalty: 1 | 2 | 3 = 1) {
  return {
    id: 'l1',
    name: '星期五',
    x: 0,
    y: 0,
    loyalty,
    task: null,
    carrying: 0,
    carryingType: null,
  };
}

describe('labor system', () => {
  it('consumes food in priority order', () => {
    const s = createNewGame(1);
    s.laborers.push(laborer(1));
    s.buildings.push({
      id: 'box',
      type: 'storage',
      x: 0,
      y: 0,
      hp: 80,
      storage: [
        { baseId: 'berries', count: 2 },
        { baseId: 'dried_fish', count: 1 },
        { baseId: 'cooked_fish', count: 1 },
      ],
    });
    const result = settleLaborRations(s);
    const box = s.buildings[0].storage!;
    expect(result.fed).toEqual(['l1']);
    expect(box.find((i) => i.baseId === 'dried_fish')).toBeUndefined();
    expect(box.find((i) => i.baseId === 'cooked_fish')?.count).toBe(1);
    expect(box.find((i) => i.baseId === 'berries')?.count).toBe(2);
    expect(s.laborers[0].loyalty).toBe(2);
  });

  it('laborer with loyalty 1 flees after the first unfed dawn', () => {
    const s = createNewGame(1);
    s.laborers.push(laborer(1));
    const result = settleLaborRations(s);
    expect(result.fled).toEqual(['l1']);
    expect(s.laborers).toHaveLength(0);
  });

  it('no storage means no ration', () => {
    const s = createNewGame(1);
    s.laborers.push(laborer(3));
    settleLaborRations(s);
    expect(s.laborers[0].loyalty).toBe(2);
  });

  it('a fed laborer at max loyalty stays at three', () => {
    const s = createNewGame(1);
    s.laborers.push(laborer(3));
    s.buildings.push({
      id: 'box',
      type: 'storage',
      x: 0,
      y: 0,
      hp: 80,
      storage: [{ baseId: 'cooked_fish', count: 2 }],
    });
    settleLaborRations(s);
    expect(s.laborers[0].loyalty).toBe(3);
  });

  it('tickLabor gathers one item per four seconds and unloads to storage', () => {
    const s = createNewGame(1);
    const worker = laborer(1);
    s.laborers.push(worker);
    assignLaborer(s, 'l1', 'tree', 10, 10);
    s.buildings.push({ id: 'box', type: 'storage', x: 0, y: 0, hp: 80, storage: [] });
    tickLabor(s, 4);
    expect(worker.carrying).toBe(1);
    tickLabor(s, 36);
    const box = s.buildings[0].storage!;
    expect(box.find((i) => i.baseId === 'wood')?.count).toBe(10);
    expect(worker.carrying).toBe(0);
  });

  it('unloads to ground loot when there is no storage', () => {
    const s = createNewGame(1);
    const worker = laborer(1);
    s.laborers.push(worker);
    assignLaborer(s, 'l1', 'berry', 10, 10);
    tickLabor(s, 40);
    expect(s.world.groundLoot.some((item) => item.baseId === 'berries')).toBe(true);
  });
});
