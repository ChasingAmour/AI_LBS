import type { GameState } from '../core/gameState';
import { BUILDINGS } from '../data/buildings';
import { ITEMS } from '../data/items';
import type { Panel, PanelRow } from './panel';

export function buildRows(state: GameState, onSelect: (type: string) => void): PanelRow[] {
  return Object.values(BUILDINGS).map((def) => {
    const locked = state.camp.level < def.unlockLevel;
    const cost = def.cost
      .map((item) => `${ITEMS[item.baseId]?.name ?? item.baseId}×${item.count}`)
      .join(' + ');
    return {
      label: def.name,
      detail: locked ? `营地 Lv${def.unlockLevel} 解锁` : `${cost} · 耐久 ${def.hp}`,
      disabled: locked,
      onClick: locked ? undefined : () => onSelect(def.id),
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
