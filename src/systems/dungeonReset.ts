import type { GameState } from '../core/gameState';
import { getWeekday } from './timeSystem';

/** Floors cleared this week: cleared floors stay empty when re-entered. */
export function isFloorCleared(state: GameState, floor: number): boolean {
  return state.dungeon.clearedFloors.includes(floor);
}

export function markFloorCleared(state: GameState, floor: number): void {
  if (isFloorCleared(state, floor)) return;
  state.dungeon.clearedFloors.push(floor);
}

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
  state.dungeon.clearedFloors = [];
}
