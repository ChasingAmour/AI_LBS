import type { GameState } from '../core/gameState';
import { getWeekday } from './timeSystem';

/**
 * Monday 06:00 reset. Called on every day change; while the player is inside
 * the dungeon the reset is deferred until they leave.
 */
export function tickWeekReset(state: GameState, inDungeon: boolean): void {
  if (getWeekday(state.time.day) !== 1) return;
  if (state.dungeon.resetDay >= state.time.day) return;
  state.dungeon.resetDay = state.time.day;
  if (inDungeon) {
    state.dungeon.pendingReset = true;
    return;
  }
  state.dungeon.openedChestsThisWeek = [];
  state.dungeon.clearedThisWeek = false;
}
