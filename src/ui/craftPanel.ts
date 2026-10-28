import type { GameState } from '../core/gameState';
import { ITEMS } from '../data/items';
import { RECIPES, type Station } from '../data/recipes';
import { canCraft, craft, recipesFor } from '../systems/craftingSystem';
import type { Panel, PanelRow } from './panel';

const STATIONS: { station: Station; label: string }[] = [
  { station: 'hand', label: '手工' },
  { station: 'workbench', label: '工作台' },
  { station: 'campfire', label: '营火' },
  { station: 'dryingRack', label: '晾肉架' },
];

function costText(recipeId: string): string {
  const recipe = RECIPES[recipeId];
  return recipe.inputs
    .map((input) => `${ITEMS[input.baseId]?.name ?? input.baseId}×${input.count}`)
    .join(' + ');
}

export function craftRows(state: GameState, nearStation: boolean, refresh: () => void): PanelRow[] {
  const rows: PanelRow[] = [];
  for (const { station, label } of STATIONS) {
    const recipes = recipesFor(station, state.camp.level);
    if (recipes.length === 0) continue;
    rows.push({ label: `— ${label} —`, disabled: true });
    for (const recipe of recipes) {
      const stationOk = station === 'hand' || nearStation;
      const check = canCraft(state, recipe.id, stationOk);
      const outputName = ITEMS[recipe.output]?.name ?? recipe.output;
      rows.push({
        label: outputName,
        detail: check.ok ? `${costText(recipe.id)} · 点击合成` : check.reason,
        disabled: !check.ok,
        onClick: () => {
          if (craft(state, recipe.id, stationOk)) refresh();
        },
      });
    }
  }
  return rows;
}

export function openCraftPanel(panel: Panel, state: GameState, nearStation: boolean): void {
  if (panel.isOpen) {
    panel.close();
    return;
  }
  const refresh = () => panel.open('合成 (C)', craftRows(state, nearStation, refresh));
  panel.open('合成 (C)', craftRows(state, nearStation, refresh));
}
