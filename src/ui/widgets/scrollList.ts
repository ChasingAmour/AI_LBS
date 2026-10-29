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
  const pages = Math.ceil((total - perPage) / perPage) + 1;
  const page = Math.min(pages, 1 + Math.ceil(Math.max(0, scroll) / perPage));
  return `${page}/${pages}`;
}

/** Moves a scroll offset by a page step and clamps it to the data. */
export function pageWindow(total: number, scroll: number, perPage: number, delta: number): number {
  const maxStart = Math.max(0, total - perPage);
  return Math.min(maxStart, Math.max(0, Math.floor(scroll + delta)));
}
