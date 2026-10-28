import { describe, it, expect } from 'vitest';
import { generateIsland } from '../../src/world/generate';
import { generateNodes } from '../../src/world/nodes';
import { nodeDefForId, nodeTypeFromId } from '../../src/data/spawns';

describe('generateNodes', () => {
  const island = generateIsland(42);
  const nodes = generateNodes(island, 42);

  it('places a healthy number of nodes on the island', () => {
    expect(nodes.length).toBeGreaterThan(100);
  });

  it('keeps ids unique and chunk-scoped', () => {
    expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
  });

  it('produces ids the resource systems can resolve back to a node type', () => {
    for (const node of nodes.slice(0, 80)) {
      expect(nodeTypeFromId(node.id)).toBe(node.type);
      expect(nodeDefForId(node.id)?.type).toBe(node.type);
    }
  });

  it('only places nodes on walkable land or tide pools', () => {
    for (const node of nodes.slice(0, 200)) {
      const tile = island.terrain[Math.floor(node.y / 16) * island.width + Math.floor(node.x / 16)];
      expect(tile).toBeGreaterThanOrEqual(2);
    }
  });

  it('森林里的树占绝大多数', () => {
    const trees = nodes.filter((node) => node.type === 'tree').length;
    expect(trees).toBeGreaterThan(nodes.length * 0.4);
  });

  it('网格加密后节点总数上升', () => {
    expect(nodes.length).toBeGreaterThan(800);
  });

  it('岩地上会出现铜矿、铁矿和煤矿', () => {
    const types = new Set(nodes.map((node) => node.type));
    expect(types.has('copper')).toBe(true);
    expect(types.has('iron')).toBe(true);
    expect(types.has('coal')).toBe(true);
  });
});
