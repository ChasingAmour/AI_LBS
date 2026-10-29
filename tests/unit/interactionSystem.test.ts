import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { collectLoot, findInteractTarget, pickUpGroundLoot } from '../../src/systems/interactionSystem';

describe('interaction system', () => {
  it('prioritises a stunned savage over a nearby tree', () => {
    const s = createNewGame(1);
    s.world.nodes = { tree_1: { x: 100, y: 100, type: 'tree' } };
    s.savages.push({
      id: 's1',
      x: 104,
      y: 100,
      hp: 20,
      stun: 100,
      stunnedUntil: 8,
      lastHitAgo: 0,
      mode: 'stunned',
    });
    const target = findInteractTarget(s, 100, 100, { onWater: false });
    expect(target?.kind).toBe('savage');
    expect(target?.label).toBe('捆绑野人');
  });

  it('ignores savages that are not stunned', () => {
    const s = createNewGame(1);
    s.savages.push({
      id: 's1',
      x: 104,
      y: 100,
      hp: 60,
      stun: 0,
      stunnedUntil: null,
      lastHitAgo: 0,
      mode: 'attack',
    });
    expect(findInteractTarget(s, 100, 100, { onWater: false })).toBeNull();
  });

  it('uses a longer channel without the matching tool', () => {
    const s = createNewGame(1);
    s.world.nodes = { tree_1: { x: 100, y: 100, type: 'tree' } };
    expect(findInteractTarget(s, 100, 100, { onWater: false })?.durationSec).toBe(4.5);
  });

  it('offers water only when standing on it', () => {
    const s = createNewGame(1);
    expect(findInteractTarget(s, 0, 0, { onWater: false })).toBeNull();
    expect(findInteractTarget(s, 0, 0, { onWater: true })?.kind).toBe('water');
  });

  it('fishes over a resource node when a rod is selected near water', () => {
    const s = createNewGame(1);
    s.world.nodes = { tree_1: { x: 100, y: 100, type: 'tree' } };
    const target = findInteractTarget(s, 100, 100, {
      onWater: false,
      nearWater: true,
      hasRod: true,
    });
    expect(target?.kind).toBe('fishing');
    expect(target?.label).toBe('钓鱼');
  });

  it('lets ground loot win over fishing', () => {
    const s = createNewGame(1);
    s.world.groundLoot.push({ baseId: 'wood', count: 1, x: 104, y: 100 });
    const target = findInteractTarget(s, 100, 100, {
      onWater: false,
      nearWater: true,
      hasRod: true,
    });
    expect(target?.kind).toBe('groundLoot');
  });

  it('does not fish without a rod or water', () => {
    const s = createNewGame(1);
    s.world.nodes = { tree_1: { x: 100, y: 100, type: 'tree' } };
    expect(
      findInteractTarget(s, 100, 100, { onWater: false, nearWater: true, hasRod: false })?.kind,
    ).toBe('node');
    expect(
      findInteractTarget(s, 100, 100, { onWater: false, nearWater: false, hasRod: true })?.kind,
    ).toBe('node');
  });

  it('labels a depleted node and keeps chests interactable', () => {
    const s = createNewGame(1);
    s.world.nodes = {
      rock_1: { x: 100, y: 100, type: 'rock' },
      chest_wreck: { x: 100, y: 100, type: 'chest' },
    };
    s.world.nodeStates.rock_1 = { remaining: 0, respawnDay: 3 };
    expect(findInteractTarget(s, 100, 100, { onWater: false })?.kind).toBe('chest');
    s.world.nodes = { rock_1: { x: 100, y: 100, type: 'rock' } };
    expect(findInteractTarget(s, 100, 100, { onWater: false })?.label).toContain('已采空');
  });

  it('spills overflow onto the ground and picks it back up', () => {
    const s = createNewGame(1);
    s.inventory = Array.from({ length: 24 }, (_, i) => ({
      baseId: 'wood',
      count: 99,
      instanceId: `filler_${i}`,
    }));
    const leftover = collectLoot(s, [{ baseId: 'stone', count: 3 }], 40, 50);
    expect(leftover).toBe(3);
    expect(s.world.groundLoot[0]).toMatchObject({ baseId: 'stone', count: 3, x: 40, y: 50 });
    s.inventory = [];
    expect(pickUpGroundLoot(s, 'stone')).toBe(true);
    expect(s.world.groundLoot).toHaveLength(0);
  });

  it('沉船入口不需要火把也能交互', () => {
    const s = createNewGame(1);
    s.world.wreckEntrance = { x: 100, y: 100 };
    s.player.x = 100;
    s.player.y = 100;
    const target = findInteractTarget(s, 100, 100, { onWater: false });
    expect(target?.kind).toBe('dungeon');
  });

  it('入口与宝箱重叠时优先提示进入沉船', () => {
    const s = createNewGame(1);
    s.world.nodes.chest_wreck = { x: 100, y: 100, type: 'chest' };
    s.world.wreckEntrance = { x: 124, y: 100 };
    s.player.x = 110;
    s.player.y = 100;
    const target = findInteractTarget(s, 110, 100, { onWater: false });
    expect(target?.kind).toBe('dungeon');
  });
});
