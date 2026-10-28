import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { addItem, countItem } from '../../src/systems/inventorySystem';
import {
  BUILDINGS,
  canPlace,
  damageBuilding,
  demolishBuilding,
  getStorage,
  placeBuilding,
} from '../../src/systems/buildingSystem';

describe('building system', () => {
  it('places campfire inside camp radius and spends materials', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 8);
    const b = placeBuilding(s, 'campfire', 48, 48);
    expect(b).not.toBeNull();
    expect(countItem(s, 'wood')).toBe(0);
    expect(countItem(s, 'stone')).toBe(0);
    expect(b?.hp).toBe(BUILDINGS.campfire.hp);
    expect(s.buildings).toHaveLength(1);
  });

  it('rejects placement outside camp radius', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 8);
    expect(canPlace(s, 'campfire', 5, 5).ok).toBe(false);
    expect(placeBuilding(s, 'campfire', 5, 5)).toBeNull();
  });

  it('rejects placement on an occupied tile', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 20);
    addItem(s, 'stone', 8);
    placeBuilding(s, 'campfire', 48, 48);
    expect(canPlace(s, 'campfire', 48, 48).ok).toBe(false);
  });

  it('rejects locked buildings above the current camp level', () => {
    const s = createNewGame(1);
    addItem(s, 'stone', 2);
    expect(canPlace(s, 'stone_wall', 48, 48).ok).toBe(false);
  });

  it('rejects placement on water or resource nodes', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 8);
    const world = {
      isWater: (x: number, y: number) => x === 40 && y === 40,
      hasNode: (x: number, y: number) => x === 41 && y === 41,
    };
    expect(canPlace(s, 'campfire', 40, 40, world).ok).toBe(false);
    expect(canPlace(s, 'campfire', 41, 41, world).ok).toBe(false);
    expect(canPlace(s, 'campfire', 42, 42, world).ok).toBe(true);
  });

  it('demolishing refunds half of the cost rounded up', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 8);
    const b = placeBuilding(s, 'campfire', 48, 48)!;
    demolishBuilding(s, b.id);
    expect(countItem(s, 'wood')).toBe(5);
    expect(countItem(s, 'stone')).toBe(4);
    expect(s.buildings).toHaveLength(0);
  });

  it('destroyed storage spills its contents', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 15);
    addItem(s, 'vine', 4);
    const box = placeBuilding(s, 'storage', 48, 48)!;
    expect(box).not.toBeNull();
    box.storage = [{ baseId: 'cooked_fish', count: 3 }];
    damageBuilding(s, box.id, 999);
    expect(s.buildings.find((b) => b.id === box.id)).toBeUndefined();
    expect(s.world.groundLoot.some((g) => g.baseId === 'cooked_fish')).toBe(true);
  });

  it('exposes the first storage box', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 15);
    addItem(s, 'vine', 4);
    expect(getStorage(s)).toBeNull();
    const box = placeBuilding(s, 'storage', 48, 48)!;
    expect(getStorage(s)?.id).toBe(box.id);
  });
});
