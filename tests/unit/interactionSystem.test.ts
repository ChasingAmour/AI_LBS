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
});
