import type { GameState, LaborerState } from '../core/gameState';
import type { SavageState } from '../entities/savage';
import { getCaptiveCap } from './campSystem';
import { countItem, removeItem } from './inventorySystem';

export interface CaptureCheck {
  ok: boolean;
  reason?: string;
}

export function canCapture(state: GameState, savage: SavageState): CaptureCheck {
  if (savage.mode !== 'stunned' || savage.stunnedUntil === null || savage.hp <= 0) {
    return { ok: false, reason: '野人没有眩晕' };
  }
  if (state.laborers.length >= getCaptiveCap(state)) {
    return { ok: false, reason: '囚笼已满' };
  }
  if (countItem(state, 'vine') < 1) {
    return { ok: false, reason: '需要藤蔓' };
  }
  return { ok: true };
}

export function captureSavage(state: GameState, savageId: string): LaborerState | null {
  const index = state.savages.findIndex((savage) => savage.id === savageId);
  if (index < 0) return null;
  const savage = state.savages[index];
  if (!canCapture(state, savage).ok) return null;

  removeItem(state, 'vine', 1);
  state.savages.splice(index, 1);

  const number = state.laborers.length + 1;
  const laborer: LaborerState = {
    id: `laborer_${number}`,
    name: number === 1 ? '星期五' : `劳工${number}`,
    x: savage.x,
    y: savage.y,
    loyalty: 1,
    task: null,
    carrying: 0,
    carryingType: null,
    progress: 0,
  };
  state.laborers.push(laborer);
  return laborer;
}
