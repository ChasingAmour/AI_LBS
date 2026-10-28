import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { addTool, countItem } from '../../src/systems/inventorySystem';
import {
  gatherNode,
  openUniqueChest,
  respawnNodes,
  tickTorchFuel,
} from '../../src/systems/resourceSystem';

describe('resource system', () => {
  it('depletes a tree after four hits and respawns the next day', () => {
    const s = createNewGame(7);
    for (let i = 0; i < 4; i++) gatherNode(s, 'tree_001', createRng(7));
    expect(s.world.nodeStates['tree_001'].remaining).toBe(0);
    s.time.day = 8;
    respawnNodes(s);
    expect(s.world.nodeStates['tree_001'].remaining).toBe(4);
  });

  it('does not respawn before the respawn day', () => {
    const s = createNewGame(7);
    s.time.day = 7;
    for (let i = 0; i < 4; i++) gatherNode(s, 'tree_001', createRng(7));
    s.time.day = 7;
    respawnNodes(s);
    expect(s.world.nodeStates['tree_001'].remaining).toBe(0);
  });

  it('rocks take two days to come back', () => {
    const s = createNewGame(7);
    s.time.day = 7;
    for (let i = 0; i < 4; i++) gatherNode(s, 'rock_001', createRng(7));
    s.time.day = 8;
    respawnNodes(s);
    expect(s.world.nodeStates['rock_001'].remaining).toBe(0);
    s.time.day = 9;
    respawnNodes(s);
    expect(s.world.nodeStates['rock_001'].remaining).toBe(4);
  });

  it('unique chest can only be opened once', () => {
    const s = createNewGame(1);
    expect(openUniqueChest(s, 'chest_wreck')).not.toBeNull();
    expect(openUniqueChest(s, 'chest_wreck')).toBeNull();
  });

  it('cave chest needs a torch', () => {
    const s = createNewGame(1);
    expect(openUniqueChest(s, 'chest_cave')).toBeNull();
    addTool(s, 'torch');
    expect(openUniqueChest(s, 'chest_cave')).not.toBeNull();
  });

  it('tide pool can yield shell with seeded rng', () => {
    const s = createNewGame(1);
    const result = gatherNode(s, 'tide_001', createRng(3));
    expect(result.items.every((i) => ['raw_fish', 'shell'].includes(i.baseId))).toBe(true);
  });

  it('torch burns out after 180 seconds', () => {
    const s = createNewGame(1);
    addTool(s, 'torch');
    tickTorchFuel(s, 180);
    expect(countItem(s, 'torch')).toBe(0);
  });

  it('a tree gives wood on every hit, not only when it falls', () => {
    const s = createNewGame(7);
    for (let i = 0; i < 3; i++) {
      const hit = gatherNode(s, 'tree_001', createRng(7 + i));
      const wood = hit.items.filter((item) => item.baseId === 'wood');
      expect(wood.length).toBeGreaterThan(0);
      expect(wood[0].count).toBeGreaterThanOrEqual(1);
    }
  });

  it('a tree yields 5 to 6 wood across four hits', () => {
    const s = createNewGame(7);
    let total = 0;
    for (let i = 0; i < 4; i++) {
      total += gatherNode(s, 'tree_001', createRng(7)).items
        .filter((item) => item.baseId === 'wood')
        .reduce((sum, item) => sum + item.count, 0);
    }
    expect(total).toBeGreaterThanOrEqual(5);
    expect(total).toBeLessThanOrEqual(6);
  });
});
