import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { EventBus } from '../../src/core/eventBus';
import { advanceTime, canSleep, getWeekday, isRaidLock, sleep } from '../../src/systems/timeSystem';

describe('time system', () => {
  it('maps day 1 to Monday and day 5 to Friday', () => {
    expect(getWeekday(1)).toBe(1);
    expect(getWeekday(5)).toBe(5);
    expect(getWeekday(8)).toBe(1);
  });

  it('rejects sleep after Friday 17:00', () => {
    const s = createNewGame(1);
    s.buildings.push({ id: 'tent', type: 'tent', x: 0, y: 0, hp: 80 });
    s.time = { day: 5, clockMin: 17 * 60, phase: 'day' };
    expect(canSleep(s).ok).toBe(false);
    expect(isRaidLock(s)).toBe(true);
  });

  it('rejects sleep without a tent', () => {
    const s = createNewGame(1);
    expect(canSleep(s).ok).toBe(false);
  });

  it('emits raid:started when dt crosses 18:00', () => {
    const s = createNewGame(1);
    s.time = { day: 5, clockMin: 17 * 60 + 59, phase: 'day' };
    const bus = new EventBus();
    const seen: string[] = [];
    bus.on('raid:started', () => seen.push('raid'));
    advanceTime(s, 120, bus);
    expect(seen).toContain('raid');
    expect(s.raid?.active).toBe(true);
  });

  it('warns at 17:00 on Friday', () => {
    const s = createNewGame(1);
    s.time = { day: 5, clockMin: 16 * 60 + 59, phase: 'day' };
    const bus = new EventBus();
    let warned = 0;
    bus.on('raid:warning', () => warned++);
    advanceTime(s, 120, bus);
    expect(warned).toBe(1);
  });

  it('sleep advances to next day 06:00 and emits dayChanged', () => {
    const s = createNewGame(1);
    s.buildings.push({ id: 'tent', type: 'tent', x: 0, y: 0, hp: 80 });
    const bus = new EventBus();
    let days = 0;
    bus.on('time:dayChanged', () => days++);
    sleep(s, bus);
    expect(s.time).toEqual({ day: 2, clockMin: 360, phase: 'day' });
    expect(days).toBe(1);
  });

  it('600 real seconds moves 06:00 to 18:00 and switches to night', () => {
    const s = createNewGame(1);
    advanceTime(s, 600, new EventBus());
    expect(s.time.clockMin).toBe(18 * 60);
    expect(s.time.phase).toBe('night');
    expect(s.time.day).toBe(1);
  });

  it('a full 900 second day rolls to next day 06:00', () => {
    const s = createNewGame(1);
    advanceTime(s, 900, new EventBus());
    expect(s.time.day).toBe(2);
    expect(s.time.clockMin).toBe(360);
    expect(s.time.phase).toBe('day');
  });

  it('emits dungeon:weekReset on Monday 06:00', () => {
    const s = createNewGame(1);
    s.time = { day: 7, clockMin: 5 * 60 + 59, phase: 'night' };
    const bus = new EventBus();
    let reset = 0;
    bus.on('dungeon:weekReset', () => reset++);
    advanceTime(s, 60, bus);
    expect(reset).toBe(1);
    expect(s.time.day).toBe(8);
  });
});
