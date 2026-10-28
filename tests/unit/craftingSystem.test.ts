import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { addItem, countItem } from '../../src/systems/inventorySystem';
import { canCraft, craft, craftDurationSec, RECIPES } from '../../src/systems/craftingSystem';

describe('crafting system', () => {
  it('crafts a stone axe and consumes exact materials', () => {
    const s = createNewGame(1);
    s.camp.level = 1;
    addItem(s, 'wood', 2);
    addItem(s, 'stone', 3);
    expect(craft(s, 'stone_axe', true)).toBe(true);
    expect(countItem(s, 'wood')).toBe(0);
    expect(countItem(s, 'stone')).toBe(0);
    expect(countItem(s, 'stone_axe')).toBe(1);
  });

  it('rejects recipe locked above camp level', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 10);
    expect(canCraft(s, 'stone_axe', true).ok).toBe(false);
  });

  it('rejects workbench recipe when not near station', () => {
    const s = createNewGame(1);
    s.camp.level = 1;
    addItem(s, 'wood', 2);
    addItem(s, 'stone', 3);
    expect(canCraft(s, 'stone_axe', false).ok).toBe(false);
  });

  it('rejects crafting when materials are missing and does not partially consume', () => {
    const s = createNewGame(1);
    s.camp.level = 1;
    addItem(s, 'wood', 2);
    expect(craft(s, 'stone_axe', true)).toBe(false);
    expect(countItem(s, 'wood')).toBe(2);
  });

  it('crafts rope from two vines at any camp level', () => {
    const s = createNewGame(1);
    addItem(s, 'vine', 2);
    expect(craft(s, 'rope', false)).toBe(true);
    expect(countItem(s, 'vine')).toBe(0);
    expect(countItem(s, 'rope')).toBe(1);
  });

  it('crafts a torch with full fuel', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 1);
    addItem(s, 'vine', 1);
    expect(craft(s, 'torch', false)).toBe(true);
    const torch = s.inventory.find((i) => i.baseId === 'torch');
    expect(torch?.durability).toBe(180);
  });

  it('cooked fish needs a campfire station', () => {
    const s = createNewGame(1);
    addItem(s, 'raw_fish', 1);
    expect(canCraft(s, 'cooked_fish', false).ok).toBe(false);
    expect(canCraft(s, 'cooked_fish', true).ok).toBe(true);
  });

  it('dried fish takes a game day on the drying rack', () => {
    expect(RECIPES.dried_fish.station).toBe('dryingRack');
    expect(craftDurationSec('dried_fish')).toBe(900);
  });
});
