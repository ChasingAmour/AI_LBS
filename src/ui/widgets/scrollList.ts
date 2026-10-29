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

/** "2/3" page indicator for long card panels (1-based, clamped). */
export function pageLabel(total: number, scroll: number, perPage: number): string {
  if (perPage <= 0 || total <= perPage) return '1/1';
  const pages = Math.ceil(total / perPage);
  const page = Math.min(pages, Math.floor(Math.max(0, scroll) / perPage) + 1);
  return `${page}/${pages}`;
}
