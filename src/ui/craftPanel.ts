import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';
import { ITEMS } from '../data/items';
import {
  CATEGORY_NAMES,
  CATEGORY_ORDER,
  RECIPES,
  STATION_NAMES,
  recipeCategory,
  type Recipe,
} from '../data/recipes';
import { canCraft, craft } from '../systems/craftingSystem';
import type { Panel, PanelRow } from './panel';

function costText(recipe: Recipe): string {
  return recipe.inputs
    .map((input) => `${ITEMS[input.baseId]?.name ?? input.baseId}×${input.count}`)
    .join(' + ');
}

function statusText(state: GameState, recipe: Recipe, nearStation: boolean): string {
  const stationOk = recipe.station === 'hand' || nearStation;
  const check = canCraft(state, recipe.id, stationOk);
  if (check.ok) return '点击合成';
  if (state.camp.level < recipe.unlockLevel) return `营地 Lv${recipe.unlockLevel} 解锁`;
  if (recipe.station !== 'hand' && !nearStation) return `靠近${STATION_NAMES[recipe.station]}`;
  return check.reason ?? '暂时无法合成';
}

export function craftRows(
  state: GameState,
  nearStation: boolean,
  refresh: () => void,
  bus?: EventBus,
): PanelRow[] {
  const rows: PanelRow[] = [];
  for (const category of CATEGORY_ORDER) {
    const recipes = Object.values(RECIPES).filter(
      (recipe) => recipeCategory(recipe.id) === category,
    );
    if (recipes.length === 0) continue;
    rows.push({ label: `— ${CATEGORY_NAMES[category]} —`, disabled: true });
    for (const recipe of recipes) {
      const stationOk = recipe.station === 'hand' || nearStation;
      const check = canCraft(state, recipe.id, stationOk);
      const outputName = ITEMS[recipe.output]?.name ?? recipe.output;
      rows.push({
        label: outputName,
        detail: `${STATION_NAMES[recipe.station]} · ${costText(recipe)} · ${statusText(
          state,
          recipe,
          nearStation,
        )}`,
        disabled: !check.ok,
        onClick: () => {
          if (craft(state, recipe.id, stationOk, bus)) refresh();
        },
      });
    }
  }
  return rows;
}

export function openCraftPanel(
  panel: Panel,
  state: GameState,
  nearStation: boolean,
  bus?: EventBus,
): void {
  if (panel.isOpen) {
    panel.close();
    return;
  }
  const refresh = () => panel.open('合成 (C)', craftRows(state, nearStation, refresh, bus));
  panel.open('合成 (C)', craftRows(state, nearStation, refresh, bus));
}
