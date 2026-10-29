import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/core/eventBus';
import { createNewGame } from '../../src/core/gameState';
import {
  MAX_LEVEL,
  grantXp,
  playerBaseStats,
  xpToNext,
} from '../../src/systems/levelSystem';

describe('level system', () => {
  it('grows the four base attributes per level', () => {
    expect(playerBaseStats(1)).toEqual({ attack: 4, defense: 0, armor: 0, moveMul: 1 });
    const lv5 = playerBaseStats(5);
    expect(lv5.attack).toBe(12);
    expect(lv5.defense).toBe(4);
    expect(lv5.armor).toBe(8);
    expect(lv5.moveMul).toBeCloseTo(1.04);
  });

  it('uses the designed xp curve', () => {
    expect(xpToNext(1)).toBe(65);
    expect(xpToNext(2)).toBe(90);
    expect(xpToNext(19)).toBe(515);
  });

  it('carries leftover xp and emits one event per level', () => {
    const state = createNewGame(1);
    const bus = new EventBus();
    const levels: number[] = [];
    bus.on('player:levelUp', (payload: { level: number }) => levels.push(payload.level));
    expect(grantXp(state, 70, bus)).toBe(1);
    expect(state.player.level).toBe(2);
    expect(state.player.xp).toBe(5);
    expect(levels).toEqual([2]);
  });

  it('caps at level 20 and ignores further xp', () => {
    const state = createNewGame(1);
    grantXp(state, 1_000_000);
    expect(state.player.level).toBe(MAX_LEVEL);
    expect(state.player.xp).toBe(0);
    expect(grantXp(state, 100)).toBe(0);
  });
});
