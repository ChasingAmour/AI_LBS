import type { GameState } from '../core/gameState';
import { BUILDINGS } from '../data/buildings';
import { ITEMS } from '../data/items';
import { countItem } from '../systems/inventorySystem';
import type { Panel, PanelRow } from './panel';

export function buildRows(state: GameState, onSelect: (type: string) => void): PanelRow[] {
  return Object.values(BUILDINGS).map((def) => {
    const locked = state.camp.level < def.unlockLevel;
    const missing = def.cost.filter((item) => countItem(state, item.baseId) < item.count);
    const cost = def.cost
      .map((item) => `${ITEMS[item.baseId]?.name ?? item.baseId}×${item.count}`)
      .join(' + ');
    const detail = locked
      ? `营地 Lv${def.unlockLevel} 解锁`
      : missing.length > 0
        ? `${cost} · 材料不足`
        : `${cost} · 耐久 ${def.hp}`;
    return {
      label: def.name,
      detail,
      disabled: locked || missing.length > 0,
      onClick: locked || missing.length > 0 ? undefined : () => onSelect(def.id),
    };
  });
}

export function openBuildMenu(
  panel: Panel,
  state: GameState,
  onSelect: (type: string) => void,
): void {
  panel.toggle('建造 (B)', buildRows(state, onSelect), 'build');
}
