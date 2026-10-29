import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';
import { createRng } from '../core/rng';
import { EQUIPMENT } from '../data/equipment';
import { ITEMS } from '../data/items';
import { RECIPES, type Recipe, type Station } from '../data/recipes';
import { rollEquipment } from './equipmentSystem';
import { addItem, countItem, removeItem } from './inventorySystem';
import { grantXp } from './levelSystem';

export { RECIPES } from '../data/recipes';

export interface CraftCheck {
  ok: boolean;
  reason?: string;
}

export function canCraft(state: GameState, recipeId: string, nearStation: boolean): CraftCheck {
  const recipe = RECIPES[recipeId];
  if (!recipe) return { ok: false, reason: '配方不存在' };
  if (state.camp.level < recipe.unlockLevel) {
    return { ok: false, reason: `需要营地等级 ${recipe.unlockLevel}` };
  }
  if (recipe.station !== 'hand' && !nearStation) {
    return { ok: false, reason: '需要靠近对应合成站' };
  }
  for (const input of recipe.inputs) {
    if (countItem(state, input.baseId) < input.count) {
      return { ok: false, reason: `材料不足：${ITEMS[input.baseId]?.name ?? input.baseId}` };
    }
  }
  return { ok: true };
}

export function craft(
  state: GameState,
  recipeId: string,
  nearStation: boolean,
  bus?: EventBus,
): boolean {
  if (!canCraft(state, recipeId, nearStation).ok) return false;
  const recipe = RECIPES[recipeId];

  for (const input of recipe.inputs) {
    removeItem(state, input.baseId, input.count);
  }
  grantXp(state, 3, bus);

  if (EQUIPMENT[recipe.output]) {
    state.lootRolls += 1;
    const instance = rollEquipment(
      createRng(state.lootSeed + state.lootRolls * 7919),
      recipe.output,
      'common',
      `eq_${state.lootRolls}`,
    );
    if (!instance) {
      for (const input of recipe.inputs) addItem(state, input.baseId, input.count);
      return false;
    }
    state.equipmentInstances.push(instance);
    return true;
  }

  const result = addItem(state, recipe.output, recipe.count);
  if (result.leftover > 0) {
    if (result.added > 0) removeItem(state, recipe.output, result.added);
    for (const input of recipe.inputs) {
      addItem(state, input.baseId, input.count);
    }
    return false;
  }
  return true;
}

export function craftDurationSec(recipeId: string): number {
  return RECIPES[recipeId]?.durationSec ?? 0;
}

export function recipesFor(station: Station, campLevel: number): Recipe[] {
  return Object.values(RECIPES).filter(
    (recipe) => recipe.station === station && recipe.unlockLevel <= campLevel,
  );
}

export function nextRecipeFor(station: Station, campLevel: number): Recipe | null {
  return (
    Object.values(RECIPES).find(
      (recipe) => recipe.station === station && recipe.unlockLevel > campLevel,
    ) ?? null
  );
}
