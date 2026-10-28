import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const DAY_START = 360; // 06:00
const WARN = 17 * 60;
const RAID = 18 * 60;
const DAY_MINUTES = 1440;

export function getWeekday(day: number): Weekday {
  return (((day - 1) % 7) + 1) as Weekday;
}

function phaseFor(clockMin: number): 'day' | 'night' {
  return clockMin >= DAY_START && clockMin < RAID ? 'day' : 'night';
}

function minutesPerSecond(phase: 'day' | 'night'): number {
  return phase === 'day' ? 720 / 600 : 720 / 300;
}

export function isRaidLock(state: GameState): boolean {
  const wd = getWeekday(state.time.day);
  return (wd === 5 && state.time.clockMin >= WARN) || (wd === 6 && state.time.clockMin < DAY_START);
}

export function canSleep(state: GameState): { ok: boolean; reason?: string } {
  if (!state.buildings.some((b) => b.type === 'tent')) {
    return { ok: false, reason: '需要帐篷才能睡觉' };
  }
  if (state.raid?.active) {
    return { ok: false, reason: '入侵进行中，不能睡觉' };
  }
  if (isRaidLock(state)) {
    return { ok: false, reason: '野人就要来了，不能睡觉' };
  }
  return { ok: true };
}

function dawn(state: GameState, bus: EventBus): void {
  state.time.day += 1;
  if (state.raid?.active) {
    bus.emit('raid:dawn', { day: state.time.day });
  }
  bus.emit('time:dayChanged', { day: state.time.day });
  if (getWeekday(state.time.day) === 1) {
    bus.emit('dungeon:weekReset', { day: state.time.day });
  }
  bus.emit('save:requested', { reason: 'dawn' });
}

function stepMinutes(state: GameState, minutes: number, bus: EventBus): void {
  const prevClock = state.time.clockMin;
  const prevDay = state.time.day;
  let next = prevClock + minutes;
  let wrapped = false;
  if (Math.abs(next - DAY_MINUTES) < 1e-6) next = DAY_MINUTES;
  while (next >= DAY_MINUTES) {
    next -= DAY_MINUTES;
    wrapped = true;
  }
  for (const boundary of [0, DAY_START, WARN, RAID]) {
    if (Math.abs(next - boundary) < 1e-6) next = boundary;
  }
  state.time.clockMin = next;

  if (!wrapped && getWeekday(prevDay) === 5) {
    if (prevClock < WARN && next >= WARN) {
      state.flags.raidWarnedDay = prevDay;
      bus.emit('raid:warning', { day: prevDay });
    }
    if (prevClock < RAID && next >= RAID) {
      state.raid = { active: true, day: prevDay };
      bus.emit('raid:started', { day: prevDay });
    }
  }

  const crossedDawn = (!wrapped && prevClock < DAY_START && next >= DAY_START) || (wrapped && next >= DAY_START);
  if (crossedDawn) {
    dawn(state, bus);
  }
  state.time.phase = phaseFor(state.time.clockMin);
}

export function advanceTime(state: GameState, dtSec: number, bus: EventBus): void {
  if (dtSec <= 0) return;
  state.playtimeSec += dtSec;
  let remaining = dtSec;
  let guard = 0;
  while (remaining > 1e-9 && guard < 100000) {
    guard += 1;
    const rate = minutesPerSecond(phaseFor(state.time.clockMin));
    const secStep = Math.min(remaining, 1 / rate);
    stepMinutes(state, secStep * rate, bus);
    remaining -= secStep;
  }
}

export function sleep(state: GameState, bus: EventBus): void {
  if (!canSleep(state).ok) return;
  state.time.clockMin = DAY_START;
  state.time.phase = 'day';
  bus.emit('player:slept', {});
  dawn(state, bus);
}
