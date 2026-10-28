import { describe, it, expect } from 'vitest';
import { visibleRows } from '../../src/ui/widgets/scrollList';

describe('visibleRows', () => {
  it('returns all rows when they fit', () => {
    expect(visibleRows(4, 0, 6)).toEqual({ start: 0, end: 4 });
  });
  it('windows long lists', () => {
    expect(visibleRows(20, 3, 6)).toEqual({ start: 3, end: 9 });
  });
  it('clamps overscroll', () => {
    expect(visibleRows(20, 99, 6)).toEqual({ start: 14, end: 20 });
  });
});
