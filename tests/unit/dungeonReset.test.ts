import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { tickWeekReset } from '../../src/systems/dungeonReset';

describe('dungeon weekly reset', () => {
  it('clears chests and clear flags on Monday', () => {
    const state = createNewGame(1);
    state.dungeon.openedChestsThisWeek = ['d1_chest_0'];
    state.dungeon.clearedThisWeek = true;
    state.time.day = 8;
    tickWeekReset(state, false);
    expect(state.dungeon.openedChestsThisWeek).toEqual([]);
    expect(state.dungeon.clearedThisWeek).toBe(false);
    expect(state.dungeon.resetDay).toBe(8);
  });

  it('does not reset twice in the same week', () => {
    const state = createNewGame(1);
    state.time.day = 8;
    tickWeekReset(state, false);
    state.dungeon.openedChestsThisWeek = ['d2_chest_0'];
    state.time.day = 9;
    tickWeekReset(state, false);
    expect(state.dungeon.openedChestsThisWeek).toEqual(['d2_chest_0']);
  });

  it('defers the reset while inside the dungeon', () => {
    const state = createNewGame(1);
    state.time.day = 8;
    state.dungeon.openedChestsThisWeek = ['d3_chest_0'];
    tickWeekReset(state, true);
    expect(state.dungeon.pendingReset).toBe(true);
    expect(state.dungeon.openedChestsThisWeek).toEqual(['d3_chest_0']);
  });

  it('never resets the first-clear flag', () => {
    const state = createNewGame(1);
    state.dungeon.firstClearDone = true;
    state.time.day = 15;
    tickWeekReset(state, false);
    expect(state.dungeon.firstClearDone).toBe(true);
  });
});
