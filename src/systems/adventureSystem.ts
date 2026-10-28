import type { GameState } from '../core/gameState';
import { decodeExplored } from '../core/explored';
import { EQUIPMENT, RARITY } from '../data/equipment';
import { deriveStats } from './statsSystem';

export interface AdventureInfo {
  rank: number;
  score: number;
  exploration: number;
  discovered: number;
  gearScore: number;
  days: number;
  cleared: boolean;
  firstClear: boolean;
}

/** Adventure rank derived from exploration, landmarks, gear and dungeon clears. */
export function adventureInfo(state: GameState): AdventureInfo {
  const exploration = decodeExplored(state.world.explored).size;
  const discovered = state.world.discovered.length;
  const gearScore = (['weapon', 'armor', 'boots'] as const).reduce((sum, slot) => {
    const id = state.equipment[slot];
    const instance = id
      ? state.equipmentInstances.find((item) => item.instanceId === id)
      : null;
    if (!instance || instance.durability <= 0) return sum;
    const base = EQUIPMENT[instance.baseId];
    return sum + (base ? RARITY[instance.rarity].tier * 8 : 0);
  }, 0);
  const score =
    exploration * 2 +
    discovered * 25 +
    gearScore +
    (state.dungeon.firstClearDone ? 40 : 0) +
    (state.dungeon.clearedThisWeek ? 20 : 0) +
    Math.min(30, state.time.day);
  return {
    rank: 1 + Math.floor(score / 60),
    score,
    exploration,
    discovered,
    gearScore,
    days: state.time.day,
    cleared: state.dungeon.clearedThisWeek,
    firstClear: state.dungeon.firstClearDone,
  };
}

/** Small helper used by tests and the panel: atk/def of the current gear. */
export function gearSummary(state: GameState): string {
  const stats = deriveStats(state);
  return `攻 ${stats.attack} / 防 ${stats.defense}`;
}
