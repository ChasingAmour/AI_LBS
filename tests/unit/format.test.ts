import { describe, it, expect } from 'vitest';
import { formatClock, formatDay, getInteractPrompt } from '../../src/ui/format';
import { createNewGame } from '../../src/core/gameState';

describe('ui format', () => {
  it('formats clock and weekday in Chinese', () => {
    expect(formatClock(360)).toBe('06:00');
    expect(formatClock(18 * 60 + 5)).toBe('18:05');
    expect(formatDay(1)).toBe('第 1 天 · 周一');
    expect(formatDay(5)).toBe('第 5 天 · 周五');
  });

  it('wraps the clock at midnight', () => {
    expect(formatClock(1440)).toBe('00:00');
    expect(formatClock(-1)).toBe('23:59');
  });

  it('wraps weekdays after seven days', () => {
    expect(formatDay(8)).toBe('第 8 天 · 周一');
    expect(formatDay(6)).toBe('第 6 天 · 周六');
  });

  it('shows a raid prompt while a raid is active', () => {
    const s = createNewGame(1);
    expect(getInteractPrompt(s)).toBeNull();
    s.raid = { active: true, day: 5 };
    expect(getInteractPrompt(s)).toContain('藤蔓');
  });
});
