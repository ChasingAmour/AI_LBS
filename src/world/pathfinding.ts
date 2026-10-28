export interface GridPoint {
  x: number;
  y: number;
}

interface Node {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: Node | null;
}

/**
 * A* over a 4-connected grid.
 * `grid[x][y]` is 0 for walkable and 1 for blocked.
 * Returns the path including start and end, or [] when unreachable.
 */
export function findPath(grid: number[][], start: GridPoint, end: GridPoint): GridPoint[] {
  const height = grid[0]?.length ?? 0;
  const width = grid.length;
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  const walkable = (x: number, y: number) => inBounds(x, y) && grid[x][y] === 0;

  if (!walkable(start.x, start.y) || !walkable(end.x, end.y)) return [];
  if (start.x === end.x && start.y === end.y) return [{ x: start.x, y: start.y }];

  const key = (x: number, y: number) => y * width + x;
  const heuristic = (x: number, y: number) => Math.abs(x - end.x) + Math.abs(y - end.y);

  const open: Node[] = [
    { x: start.x, y: start.y, g: 0, f: heuristic(start.x, start.y), parent: null },
  ];
  const bestG = new Map<number, number>([[key(start.x, start.y), 0]]);
  const closed = new Set<number>();

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const currentKey = key(current.x, current.y);
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    if (current.x === end.x && current.y === end.y) {
      const path: GridPoint[] = [];
      let node: Node | null = current;
      while (node) {
        path.push({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path.reverse();
    }

    const neighbours: GridPoint[] = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    for (const next of neighbours) {
      if (!walkable(next.x, next.y)) continue;
      const nextKey = key(next.x, next.y);
      if (closed.has(nextKey)) continue;
      const g = current.g + 1;
      if (g >= (bestG.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      bestG.set(nextKey, g);
      open.push({ x: next.x, y: next.y, g, f: g + heuristic(next.x, next.y), parent: current });
    }
  }

  return [];
}
