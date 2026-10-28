import { describe, expect, it } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { tickEnergyRegen } from '../../src/systems/needsSystem';
import { gatherChannelMs } from '../../src/systems/resourceSystem';

describe('精力回复', () => {
  it('静止每秒回 1.5', () => {
    const state = createNewGame(1);
    state.player.energy = 40;
    tickEnergyRegen(state, 2, true);
    expect(state.player.energy).toBe(43);
  });

  it('移动时不回', () => {
    const state = createNewGame(1);
    state.player.energy = 40;
    tickEnergyRegen(state, 2, false);
    expect(state.player.energy).toBe(40);
  });

  it('不超过上限', () => {
    const state = createNewGame(1);
    state.player.energy = 99.5;
    tickEnergyRegen(state, 5, true);
    expect(state.player.energy).toBe(100);
  });

  it('死亡时不回', () => {
    const state = createNewGame(1);
    state.player.energy = 10;
    state.player.dead = true;
    tickEnergyRegen(state, 5, true);
    expect(state.player.energy).toBe(10);
  });
});

describe('没精力时采集变慢', () => {
  it('有工具时慢一倍', () => {
    expect(gatherChannelMs(1500, true, true)).toBe(3000);
  });

  it('徒手且没精力时是六倍', () => {
    expect(gatherChannelMs(1500, false, true)).toBe(9000);
  });

  it('有精力时保持原值', () => {
    expect(gatherChannelMs(1500, true, false)).toBe(1500);
  });
});
