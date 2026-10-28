import type { GameState } from '../core/gameState';
import { ITEMS } from '../data/items';
import { consumeFood } from '../systems/needsSystem';
import type { Panel, PanelRow } from './panel';

const EDIBLE = new Set(['coconut', 'berries', 'cooked_fish', 'dried_fish', 'bandage']);

export function inventoryRows(state: GameState): PanelRow[] {
  if (state.inventory.length === 0) {
    return [{ label: '背包空空如也', disabled: true }];
  }
  return state.inventory.map((item) => {
    const name = ITEMS[item.baseId]?.name ?? item.baseId;
    const edible = EDIBLE.has(item.baseId);
    return {
      label: `${name} ×${item.count}`,
      detail: item.durability !== undefined
        ? `耐久 ${item.durability}`
        : edible
          ? '点击食用'
          : '',
      disabled: !edible,
      onClick: edible ? () => consumeFood(state, item.baseId) : undefined,
    };
  });
}

export function openInventoryPanel(panel: Panel, state: GameState): void {
  panel.toggle('背包 (I)', inventoryRows(state));
}
