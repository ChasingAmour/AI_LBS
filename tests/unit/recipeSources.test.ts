import { describe, it, expect } from 'vitest';
import { ANIMALS } from '../../src/data/animals';
import { ITEMS } from '../../src/data/items';
import {
  CATEGORY_BY_RECIPE,
  CATEGORY_NAMES,
  CATEGORY_ORDER,
  RECIPES,
  recipeCategory,
} from '../../src/data/recipes';
import { RESOURCE_NODES, UNIQUE_CHESTS } from '../../src/data/spawns';
import { FISH_LOOT } from '../../src/systems/fishingSystem';

/** Everything the island hands out without crafting. */
function directSources(): Set<string> {
  const sources = new Set<string>();
  for (const node of Object.values(RESOURCE_NODES)) {
    for (const drop of [...node.drops, ...(node.depleteDrops ?? [])]) sources.add(drop.baseId);
  }
  for (const chest of Object.values(UNIQUE_CHESTS)) {
    for (const item of chest.items) sources.add(item.baseId);
  }
  for (const animal of Object.values(ANIMALS)) {
    for (const drop of animal.drops) sources.add(drop.baseId);
  }
  for (const entry of FISH_LOOT) sources.add(entry.baseId);
  return sources;
}

/** Matches every recipe output once all of its inputs can be obtained. */
function obtainable(): Set<string> {
  const known = directSources();
  let changed = true;
  while (changed) {
    changed = false;
    for (const recipe of Object.values(RECIPES)) {
      if (known.has(recipe.output)) continue;
      if (recipe.inputs.every((input) => known.has(input.baseId))) {
        known.add(recipe.output);
        changed = true;
      }
    }
  }
  return known;
}

describe('recipe material sources', () => {
  it('every recipe input can be gathered or crafted', () => {
    const known = obtainable();
    const missing: string[] = [];
    for (const recipe of Object.values(RECIPES)) {
      for (const input of recipe.inputs) {
        if (!known.has(input.baseId)) missing.push(`${recipe.id} <- ${input.baseId}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every material input exists as an item', () => {
    for (const recipe of Object.values(RECIPES)) {
      for (const input of recipe.inputs) expect(ITEMS[input.baseId]).toBeDefined();
    }
  });

  it('assigns every recipe to one of the displayed categories', () => {
    expect(Object.keys(CATEGORY_BY_RECIPE).sort()).toEqual(Object.keys(RECIPES).sort());
    expect(recipeCategory('iron_axe')).toBe('tool');
    expect(recipeCategory('copper_spear')).toBe('weapon');
    expect(recipeCategory('copper_armor')).toBe('armor');
    expect(recipeCategory('herbal_poultice')).toBe('medicine');
    expect(recipeCategory('iron_ingot')).toBe('smelting');
    for (const recipe of Object.values(RECIPES)) {
      expect(CATEGORY_ORDER).toContain(recipeCategory(recipe.id));
    }
    for (const category of CATEGORY_ORDER) {
      expect(CATEGORY_NAMES[category]).toBeTruthy();
      expect(
        Object.values(RECIPES).some((recipe) => recipeCategory(recipe.id) === category),
      ).toBe(true);
    }
  });

  it('offers a broad recipe book', () => {
    expect(Object.keys(RECIPES).length).toBe(49);
  });
});
