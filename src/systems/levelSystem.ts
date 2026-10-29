import type { EventBus } from '../core/eventBus';
import type { GameState } from '../core/gameState';

export const MAX_LEVEL = 20;

export interface BaseAttributes {
  attack: number;
  defense: number;
  /** percentage damage reduction, 0..70 */
  armor: number;
  /** multiplier on the base movement speed */
  moveMul: number;
}

export function xpToNext(level: number): number {
  return 40 + 25 * level;
}

export function playerBaseStats(level: number): BaseAttributes {
  const safe = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return {
    attack: 4 + 2 * (safe - 1),
    defense: safe - 1,
    armor: Math.min(70, 2 * (safe - 1)),
    moveMul: Math.min(1.2, 1 + 0.01 * (safe - 1)),
  };
}

/** Adds XP, carries the remainder, caps at MAX_LEVEL and emits level-ups. */
export function grantXp(state: GameState, amount: number, bus?: EventBus): number {
  state.player.level = state.player.level ?? 1;
  state.player.xp = state.player.xp ?? 0;
  if (amount <= 0 || state.player.level >= MAX_LEVEL) return 0;
  state.player.xp += amount;
  let gained = 0;
  while (state.player.level < MAX_LEVEL && state.player.xp >= xpToNext(state.player.level)) {
    state.player.xp -= xpToNext(state.player.level);
    state.player.level += 1;
    gained += 1;
    bus?.emit('player:levelUp', { level: state.player.level });
  }
  if (state.player.level >= MAX_LEVEL) state.player.xp = 0;
  return gained;
}
