import { describe, expect, it } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { upgradeToV4, validateSave } from '../../src/systems/saveSystem';

describe('v3 → v4 迁移', () => {
  it('清空节点状态、补旗、教程前进一步、补动物数组', () => {
    const state = createNewGame(5);
    state.version = 3;
    state.world.nodeStates = { tree_0_0_0: { remaining: 0, respawnDay: 9 } };
    state.flags.tutorialStep = 2;
    state.buildings = [{ id: 'b_1', type: 'campfire', x: 50, y: 50, hp: 100 }];
    state.animals = undefined as unknown as typeof state.animals;

    const next = upgradeToV4(state);

    expect(next.version).toBe(4);
    expect(next.world.nodeStates).toEqual({});
    expect(next.flags.tutorialStep).toBe(3);
    expect(next.animals).toEqual([]);
    expect(next.settings.hudCompact).toBe(false);
    expect(next.buildings.some((b) => b.type === 'flag')).toBe(true);
  });

  it('已有旗子的旧档不重复补旗', () => {
    const state = createNewGame(5);
    state.version = 3;
    state.buildings = [{ id: 'b_1', type: 'flag', x: 50, y: 50, hp: 999 }];
    expect(upgradeToV4(state).buildings.filter((b) => b.type === 'flag')).toHaveLength(1);
  });

  it('hudCompact 能写进存档再读回来', () => {
    const state = createNewGame(5);
    state.settings.hudCompact = true;
    const restored = validateSave(JSON.parse(JSON.stringify(state)));
    expect(restored.settings.hudCompact).toBe(true);
  });
});
