import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';
import { BUILDINGS } from '../data/buildings';
import { CAMP_LEVELS, CAMP_MAX_LEVEL, type CampLevelDef } from '../data/campLevels';
import { hasCampFlag } from './buildingSystem';

export { CAMP_LEVELS } from '../data/campLevels';

export interface ChecklistRow {
  label: string;
  have: number;
  need: number;
  done: boolean;
}

function countBuilt(state: GameState, type: string): number {
  return state.buildings.filter((b) => b.type === type).length;
}

function meets(state: GameState, def: CampLevelDef): boolean {
  return def.requires.every((req) => countBuilt(state, req.type) >= req.count);
}

export function getCaptiveCap(state: GameState): number {
  if (state.camp.level === 0) return 0;
  return CAMP_LEVELS.find((l) => l.level === state.camp.level)?.captiveCap ?? 0;
}

export function getNextCampLevel(state: GameState): CampLevelDef | null {
  if (state.camp.level >= CAMP_MAX_LEVEL) return null;
  return CAMP_LEVELS.find((l) => l.level === state.camp.level + 1) ?? null;
}

export function checkCampUpgrade(state: GameState, bus: EventBus): 0 | 1 | 2 | 3 {
  if (!hasCampFlag(state)) return state.camp.level;
  let changed = false;
  for (const def of CAMP_LEVELS) {
    if (def.level <= state.camp.level) continue;
    if (def.level !== state.camp.level + 1) break;
    if (!meets(state, def)) break;
    state.camp.level = def.level;
    changed = true;
    bus.emit('camp:levelUp', { level: def.level, captiveCap: def.captiveCap });
  }
  if (changed) {
    bus.emit('save:requested', { reason: 'campLevel' });
  }
  return state.camp.level;
}

export function getCampChecklist(state: GameState): ChecklistRow[] {
  const next = getNextCampLevel(state);
  if (!next) {
    return [{ label: '营地已满级', have: 0, need: 0, done: true }];
  }
  return next.requires.map((req) => {
    const have = countBuilt(state, req.type);
    const name = BUILDINGS[req.type]?.name ?? req.type;
    return {
      label: `${name} ${have}/${req.count}`,
      have,
      need: req.count,
      done: have >= req.count,
    };
  });
}

export function isCampMaxed(state: GameState): boolean {
  return state.camp.level >= CAMP_MAX_LEVEL;
}
