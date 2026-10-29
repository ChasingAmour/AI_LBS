import { describe, it, expect } from 'vitest';
import { createNewGame, type BuildingInstance } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { addItem, countItem } from '../../src/systems/inventorySystem';
import {
  cropStage,
  fillWaterskin,
  harvestCrop,
  plantCrop,
  tickFarms,
  waterCrop,
} from '../../src/systems/farmingSystem';
import { placeBuilding } from '../../src/systems/buildingSystem';
import { BUILDINGS } from '../../src/data/buildings';
import { ITEMS } from '../../src/data/items';
import { RECIPES } from '../../src/data/recipes';
import { itemIcon } from '../../src/ui/itemIcons';

function farmState(): { state: ReturnType<typeof createNewGame>; farm: BuildingInstance } {
  const state = createNewGame(3);
  const farm: BuildingInstance = { id: 'b_farm', type: 'farm_plot', x: 48, y: 48, hp: 40 };
  state.buildings.push(farm);
  addItem(state, 'berries', 3);
  addItem(state, 'waterskin', 1);
  return { state, farm };
}

function waterskin(state: ReturnType<typeof createNewGame>) {
  return state.inventory.find((item) => item.baseId === 'waterskin')!;
}

describe('farming', () => {
  it('plants a seed and consumes one item', () => {
    const { state, farm } = farmState();
    expect(plantCrop(state, farm.id, 'berries')).toBe(true);
    expect(countItem(state, 'berries')).toBe(2);
    expect(farm.crop?.growth).toBe(0);
    expect(farm.crop?.wateredDay).toBe(-1);
  });

  it('needs a seed and an empty farm plot', () => {
    const { state, farm } = farmState();
    expect(plantCrop(state, farm.id, 'coconut')).toBe(false);
    plantCrop(state, farm.id, 'berries');
    expect(plantCrop(state, farm.id, 'berries')).toBe(false);
    const rune: BuildingInstance = { id: 'b_other', type: 'campfire', x: 0, y: 0, hp: 1 };
    state.buildings.push(rune);
    expect(plantCrop(state, rune.id, 'berries')).toBe(false);
  });

  it('grows two points when watered and one when dry', () => {
    const { state, farm } = farmState();
    plantCrop(state, farm.id, 'berries');
    waterCrop(state, farm.id);
    tickFarms(state, state.time.day);
    expect(farm.crop?.growth).toBe(2);
    state.time.day += 1;
    tickFarms(state, state.time.day - 1);
    expect(farm.crop?.growth).toBe(4);
    expect(cropStage(farm.crop!)).toBe(3);
  });

  it('takes longer without water', () => {
    const { state, farm } = farmState();
    plantCrop(state, farm.id, 'berries');
    tickFarms(state, state.time.day);
    expect(farm.crop?.growth).toBe(1);
    state.time.day += 1;
    tickFarms(state, state.time.day - 1);
    expect(farm.crop?.growth).toBe(2);
  });

  it('harvests only ripe crops and clears the plot', () => {
    const { state, farm } = farmState();
    plantCrop(state, farm.id, 'berries');
    expect(harvestCrop(state, farm.id, createRng(1))).toBeNull();
    farm.crop!.growth = 4;
    const items = harvestCrop(state, farm.id, createRng(1));
    expect(items?.[0].baseId).toBe('berries');
    expect(items?.[0].count).toBeGreaterThanOrEqual(3);
    expect(farm.crop).toBeUndefined();
  });

  it('waters with a waterskin and refills it at fresh water', () => {
    const { state, farm } = farmState();
    plantCrop(state, farm.id, 'berries');
    expect(waterCrop(state, farm.id)).toBe(true);
    expect(waterskin(state).durability).toBe(2);
    expect(waterskin(state).durability).toBe(2);
    waterskin(state).durability = 0;
    expect(waterCrop(state, farm.id)).toBe(false);
    expect(fillWaterskin(state)).toBe(true);
    expect(waterskin(state).durability).toBe(3);
  });

  it('defines the farm building, waterskin and icons', () => {
    expect(BUILDINGS.farm_plot.cost).toEqual([
      { baseId: 'wood', count: 4 },
      { baseId: 'vine', count: 2 },
    ]);
    expect(BUILDINGS.farm_plot.blocks).toBe(false);
    expect(ITEMS.waterskin.maxDurability).toBe(3);
    expect(RECIPES.waterskin.output).toBe('waterskin');
    expect(itemIcon('waterskin')).not.toBeNull();
  });

  it('places a farm plot without a crop', () => {
    const state = createNewGame(3);
    state.camp.level = 1;
    state.buildings.push({ id: 'b_flag', type: 'flag', x: 40, y: 40, hp: 999 });
    addItem(state, 'wood', 4);
    addItem(state, 'vine', 2);
    const farm = placeBuilding(state, 'farm_plot', 41, 41);
    expect(farm).not.toBeNull();
    expect(farm?.crop).toBeUndefined();
    expect(countItem(state, 'wood')).toBe(0);
  });
});
