import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';
import { BUILDINGS } from '../data/buildings';
import {
  campLevelName,
  canUpgradeCamp,
  getCampChecklist,
  getNextCampLevel,
  isCampMaxed,
  upgradeCamp,
} from '../systems/campSystem';
import type { Panel, PanelRow } from './panel';

function campRows(state: GameState, refresh: () => void, bus?: EventBus): PanelRow[] {
  const rows: PanelRow[] = [];
  if (isCampMaxed(state)) {
    rows.push({ label: '营地已满级', detail: '失落方舟已经建成', disabled: true });
    return rows;
  }
  const next = getNextCampLevel(state);
  if (!next) return rows;
  const checklist = getCampChecklist(state);
  const ready = canUpgradeCamp(state);
  rows.push({
    label: `升级到 Lv${next.level}`,
    detail: ready ? '点击升级' : '先完成下面的建造要求',
    disabled: !ready,
    onClick: () => {
      if (bus && upgradeCamp(state, bus)) refresh();
    },
  });
  for (const item of checklist) {
    rows.push({
      label: item.label,
      detail: item.done ? '已完成' : `${item.have}/${item.need}`,
      disabled: true,
    });
  }
  const unlocks = Object.values(BUILDINGS).filter(
    (building) => building.unlockLevel === next.level,
  );
  if (unlocks.length > 0) {
    rows.push({
      label: `新建筑：${unlocks.map((building) => building.name).join('、')}`,
      disabled: true,
    });
  }
  return rows;
}

export function openCampPanel(panel: Panel, state: GameState, bus?: EventBus): void {
  if (panel.isOpen) {
    panel.close();
    return;
  }
  const refresh = () =>
    panel.open(
      `营地 Lv${state.camp.level} · ${campLevelName(state)}`,
      campRows(state, refresh, bus),
      'list',
    );
  panel.open(
    `营地 Lv${state.camp.level} · ${campLevelName(state)}`,
    campRows(state, refresh, bus),
    'list',
  );
}
