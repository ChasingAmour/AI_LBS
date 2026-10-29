import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';
import { EQUIPMENT } from '../data/equipment';
import { ITEMS } from '../data/items';
import {
  CATEGORY_ORDER,
  RECIPES,
  STATION_NAMES,
  recipeCategory,
  type Recipe,
  type RecipeCategory,
  type Station,
} from '../data/recipes';
import { canCraft, craft } from '../systems/craftingSystem';
import { gearPreviewText } from '../systems/equipmentSystem';
import type { Panel, PanelRow, PanelTab } from './panel';

const TAB_NAMES: Record<RecipeCategory, string> = {
  material: '材料',
  tool: '工具',
  weapon: '武器',
  armor: '防具',
  food: '食物',
  medicine: '药品',
  smelting: '冶炼',
};

function costText(recipe: Recipe): string {
  return recipe.inputs
    .map((input) => `${ITEMS[input.baseId]?.name ?? input.baseId}×${input.count}`)
    .join(' + ');
}

/** Only unlocked recipes for the station the player is actually using. */
export function stationRecipes(state: GameState, station: Station): Recipe[] {
  return Object.values(RECIPES).filter(
    (recipe) => recipe.station === station && recipe.unlockLevel <= state.camp.level,
  );
}

function recipeRow(
  state: GameState,
  recipe: Recipe,
  refresh: () => void,
  bus?: EventBus,
): PanelRow {
  const check = canCraft(state, recipe.id, true);
  const outputName =
    ITEMS[recipe.output]?.name ?? EQUIPMENT[recipe.output]?.name ?? recipe.output;
  return {
    label: outputName,
    detail: `${costText(recipe)} · ${check.ok ? '点击合成' : (check.reason ?? '材料不足')}`,
    sub: EQUIPMENT[recipe.output] ? gearPreviewText(recipe.output) : undefined,
    disabled: !check.ok,
    onClick: () => {
      if (craft(state, recipe.id, true, bus)) refresh();
    },
  };
}

export function craftTabs(
  state: GameState,
  station: Station,
  refresh: () => void,
  bus?: EventBus,
): PanelTab[] {
  const tabs: PanelTab[] = [];
  for (const category of CATEGORY_ORDER) {
    const recipes = stationRecipes(state, station).filter(
      (recipe) => recipeCategory(recipe.id) === category,
    );
    if (recipes.length === 0) continue;
    tabs.push({
      label: `${TAB_NAMES[category]} ${recipes.length}`,
      rows: recipes.map((recipe) => recipeRow(state, recipe, refresh, bus)),
    });
  }
  return tabs;
}

/** Kept for callers/tests that just want a flat row list. */
export function craftRows(
  state: GameState,
  station: Station,
  refresh: () => void,
  bus?: EventBus,
): PanelRow[] {
  return craftTabs(state, station, refresh, bus).flatMap((tab) => tab.rows);
}

export function openCraftPanel(
  panel: Panel,
  state: GameState,
  station: Station,
  bus?: EventBus,
): void {
  if (panel.isOpen) {
    panel.close();
    return;
  }
  const refresh = () => panel.updateTabs(craftTabs(state, station, refresh, bus));
  const tabs = craftTabs(state, station, refresh, bus);
  const total = tabs.reduce((sum, tab) => sum + tab.rows.length, 0);
  const title =
    total > 0
      ? `${STATION_NAMES[station]}配方 · 共 ${total} 个`
      : `${STATION_NAMES[station]}配方`;
  if (tabs.length === 0) {
    panel.openTabs(
      title,
      [{ label: '暂无', rows: [{ label: '暂无可制作的配方', disabled: true }] }],
      'craft',
    );
    return;
  }
  panel.openTabs(title, tabs, 'craft');
}
