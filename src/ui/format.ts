import type { GameState } from '../core/gameState';
import { ITEMS } from '../data/items';

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function formatClock(clockMin: number): string {
  const total = ((Math.floor(clockMin) % 1440) + 1440) % 1440;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatDay(day: number): string {
  const index = ((day - 1) % 7 + 7) % 7;
  return `第 ${day} 天 · ${WEEKDAYS[index]}`;
}

export function formatPhase(phase: 'day' | 'night'): string {
  return phase === 'day' ? '白天' : '夜晚';
}

/** Tooltip lines describing what a food or consumable restores. */
export function foodEffectLines(baseId: string): string[] {
  const effect = ITEMS[baseId]?.food;
  if (!effect) return [];
  const lines: string[] = [];
  if (effect.hunger) lines.push(`饱食 +${effect.hunger}`);
  if (effect.thirst) lines.push(`口渴 +${effect.thirst}`);
  if (effect.heal) {
    lines.push(
      effect.healOverSec
        ? `回复 ${effect.heal} 生命（${effect.healOverSec} 秒）`
        : `回复 ${effect.heal} 生命`,
    );
  }
  return lines;
}

export function getInteractPrompt(state: GameState): string | null {
  if (state.player.dead) return null;
  if (state.raid?.active) {
    return '左键击晕野人，靠近后按 E 用藤蔓捆绑';
  }
  return null;
}
