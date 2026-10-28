import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { addItem, addTool, countItem, damageTool, removeItem } from '../../src/systems/inventorySystem';

describe('inventory system', () => {
  it('stacks up to 99 then opens a new slot', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 120);
    expect(s.inventory.filter((i) => i.baseId === 'wood').map((i) => i.count)).toEqual([99, 21]);
  });

  it('refuses pickup when all 24 slots are full', () => {
    const s = createNewGame(1);
    for (let i = 0; i < 24; i++) addTool(s, 'stone_axe');
    expect(s.inventory).toHaveLength(24);
    expect(addItem(s, 'wood', 1)).toEqual({ added: 0, leftover: 1 });
  });

  it('removeItem is atomic when there is not enough', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 3);
    expect(removeItem(s, 'wood', 4)).toBe(false);
    expect(countItem(s, 'wood')).toBe(3);
    expect(removeItem(s, 'wood', 2)).toBe(true);
    expect(countItem(s, 'wood')).toBe(1);
  });

  it('tool loses durability and disappears at zero', () => {
    const s = createNewGame(1);
    addTool(s, 'stone_axe');
    damageTool(s, 'stone_axe', 59);
    expect(countItem(s, 'stone_axe')).toBe(1);
    damageTool(s, 'stone_axe', 1);
    expect(countItem(s, 'stone_axe')).toBe(0);
  });

  it('rejects unknown item ids', () => {
    const s = createNewGame(1);
    expect(() => addItem(s, 'not_an_item', 1)).toThrow();
  });
});
