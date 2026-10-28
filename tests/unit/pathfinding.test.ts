import { describe, it, expect } from 'vitest';
import { findPath } from '../../src/world/pathfinding';

describe('pathfinding', () => {
  it('finds a path around a wall', () => {
    const grid = [
      [0, 0, 0],
      [1, 1, 0],
      [0, 0, 0],
    ];
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(path.at(-1)).toEqual({ x: 2, y: 0 });
    expect(path.length).toBeGreaterThan(3);
    expect(path.every((step) => grid[step.x]?.[step.y] === 0)).toBe(true);
  });

  it('returns an empty path when the target is unreachable', () => {
    const grid = [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ];
    expect(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual([]);
  });

  it('returns the single tile when start equals end', () => {
    const grid = [[0]];
    expect(findPath(grid, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([{ x: 0, y: 0 }]);
  });
});
