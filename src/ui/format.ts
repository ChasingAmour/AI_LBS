import type { GameState } from '../core/gameState';

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

export function getInteractPrompt(state: GameState): string | null {
  if (state.player.dead) return null;
  if (state.raid?.active) {
    return '左键击晕野人，靠近后按 E 用藤蔓捆绑';
  }
  return null;
}
