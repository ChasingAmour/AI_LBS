import type { GameState } from '../core/gameState';
import { decodeExplored } from '../core/explored';
import { EQUIPMENT, RARITY } from '../data/equipment';
import { deriveStats } from './statsSystem';
import { xpToNext } from './levelSystem';

export interface AdventureInfo {
  rank: number;
  score: number;
  exploration: number;
  discovered: number;
  gearScore: number;
  days: number;
  cleared: boolean;
  firstClear: boolean;
  level: number;
  xp: number;
  xpNext: number;
  attack: number;
  defense: number;
  armor: number;
  movePct: number;
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
  const stats = deriveStats(state);
  return {
    rank: 1 + Math.floor(score / 60),
    score,
    exploration,
    discovered,
    gearScore,
    days: state.time.day,
    cleared: state.dungeon.clearedThisWeek,
    firstClear: state.dungeon.firstClearDone,
    level: state.player.level,
    xp: state.player.xp,
    xpNext: xpToNext(state.player.level),
    attack: stats.attack,
    defense: stats.defense,
    armor: Math.round(stats.armor),
    movePct: Math.round((stats.moveMul - 1) * 100),
  };
}

/** Small helper used by tests and the panel: atk/def of the current gear. */
export function gearSummary(state: GameState): string {
  const stats = deriveStats(state);
  return `攻 ${stats.attack} / 防 ${stats.defense}`;
}
