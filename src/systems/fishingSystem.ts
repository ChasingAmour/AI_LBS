import type { Rng } from '../core/rng';
import type { ItemStack } from '../core/gameState';

export const FISHING_ROD_ID = 'fishing_rod';

export interface FishingLootEntry {
  baseId: string;
  weight: number;
}

export const FISH_LOOT: FishingLootEntry[] = [
  { baseId: 'raw_fish', weight: 62 },
  { baseId: 'tropical_fish', weight: 18 },
  { baseId: 'seaweed', weight: 12 },
  { baseId: 'flint', weight: 4 },
  { baseId: 'cloth', weight: 4 },
];

export type FishingPhase = 'casting' | 'waiting' | 'bite' | 'reeling' | 'done' | 'failed';

export interface FishingSession {
  phase: FishingPhase;
  /** seconds left in the current phase */
  timer: number;
  /** reel taps landed */
  taps: number;
  /** reel taps required */
  needed: number;
  /** randomized bite delay, kept so tick() needs no RNG */
  wait: number;
  result: 'success' | 'fail' | null;
}

const CAST_SEC = 0.6;
const BITE_SEC = 1.2;
const REEL_SEC = 2.5;
const REEL_TAPS = 3;

export function startFishing(rng: Rng): FishingSession {
  return {
    phase: 'casting',
    timer: CAST_SEC,
    taps: 0,
    needed: REEL_TAPS,
    wait: 1.2 + rng.next() * 1.8,
    result: null,
  };
}

export function tickFishing(session: FishingSession, dt: number): void {
  if (session.phase === 'done' || session.phase === 'failed') return;
  session.timer -= dt;

  switch (session.phase) {
    case 'casting':
      if (session.timer <= 0) {
        session.phase = 'waiting';
        session.timer = session.wait;
      }
      break;
    case 'waiting':
      if (session.timer <= 0) {
        session.phase = 'bite';
        session.timer = BITE_SEC;
      }
      break;
    case 'bite':
      if (session.timer <= 0) {
        session.phase = 'failed';
        session.result = 'fail';
      }
      break;
    case 'reeling':
      if (session.timer <= 0) {
        session.phase = 'failed';
        session.result = 'fail';
      }
      break;
  }
}

export function tapFishing(session: FishingSession): void {
  if (session.phase === 'bite') {
    session.phase = 'reeling';
    session.timer = REEL_SEC;
    session.taps = 0;
    return;
  }
  if (session.phase !== 'reeling') return;
  session.taps += 1;
  if (session.taps >= session.needed) {
    session.phase = 'done';
    session.result = 'success';
  }
}

export function rollCatch(rng: Rng): ItemStack[] {
  const total = FISH_LOOT.reduce((sum, entry) => sum + entry.weight, 0);
  const pick = (): string => {
    let roll = rng.next() * total;
    for (const entry of FISH_LOOT) {
      roll -= entry.weight;
      if (roll <= 0) return entry.baseId;
    }
    return FISH_LOOT[0].baseId;
  };
  const items: ItemStack[] = [{ baseId: pick(), count: 1 }];
  if (rng.next() < 0.2) items.push({ baseId: pick(), count: 1 });
  return items;
}
