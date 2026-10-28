/** Window of rows that fit in a scrollable list, clamped to the data. */
export function visibleRows(
  total: number,
  scroll: number,
  rows: number,
): { start: number; end: number } {
  const maxStart = Math.max(0, total - rows);
  const start = Math.min(Math.max(0, Math.floor(scroll)), maxStart);
  return { start, end: Math.min(total, start + rows) };
}
