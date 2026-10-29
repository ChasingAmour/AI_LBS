import { describe, it, expect } from 'vitest';
import { pageLabel, pageWindow, visibleRows } from '../../src/ui/widgets/scrollList';

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

describe('pageLabel', () => {
  it('reports one page when everything fits', () => {
    expect(pageLabel(4, 0, 8)).toBe('1/1');
  });
  it('reports the current page of long lists', () => {
    expect(pageLabel(20, 0, 8)).toBe('1/3');
    expect(pageLabel(20, 8, 8)).toBe('2/3');
    expect(pageLabel(20, 999, 8)).toBe('3/3');
  });
  it('counts a partial last page as a page', () => {
    expect(pageLabel(10, 0, 8)).toBe('1/2');
    expect(pageLabel(10, 2, 8)).toBe('2/2');
  });
});

describe('pageWindow', () => {
  it('moves forward and back by a page', () => {
    expect(pageWindow(20, 0, 8, 8)).toBe(8);
    expect(pageWindow(20, 8, 8, -8)).toBe(0);
  });
  it('clamps at both ends', () => {
    expect(pageWindow(20, 12, 8, 8)).toBe(12);
    expect(pageWindow(20, 0, 8, -8)).toBe(0);
  });
});
