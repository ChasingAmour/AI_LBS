import type { GameState } from '../core/gameState';
import { assignLaborer } from '../systems/laborSystem';
import type { Panel, PanelRow } from './panel';

const TASK_CYCLE = ['tree', 'rock', 'vine', 'berry', 'palm', 'tide', 'clay'];
const TASK_NAMES: Record<string, string> = {
  tree: '砍树',
  rock: '采石',
  vine: '采藤',
  berry: '采浆果',
  palm: '摘椰子',
  tide: '捕鱼',
  clay: '挖黏土',
};

export function laborRows(state: GameState, refresh: () => void): PanelRow[] {
  if (state.laborers.length === 0) {
    return [{ label: '还没有劳工。周五击晕野人后用藤蔓捆绑。', disabled: true }];
  }
  return state.laborers.map((laborer) => {
    const current = laborer.task?.nodeType ?? null;
    return {
      label: `${laborer.name} · 忠诚 ${laborer.loyalty}`,
      detail: current ? TASK_NAMES[current] ?? current : '空闲 · 点击指派',
      onClick: () => {
        const index = current ? TASK_CYCLE.indexOf(current) : -1;
        const next = TASK_CYCLE[(index + 1) % TASK_CYCLE.length];
        assignLaborer(state, laborer.id, next, laborer.x, laborer.y);
        refresh();
      },
    };
  });
}

export function openLaborPanel(panel: Panel, state: GameState): void {
  if (panel.isOpen) {
    panel.close();
    return;
  }
  const refresh = () => panel.open('劳工 (L)', laborRows(state, refresh));
  panel.open('劳工 (L)', laborRows(state, refresh));
}
