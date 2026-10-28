import type { BuildingInstance, GameState, LaborerState } from '../core/gameState';
import { getStorage } from './buildingSystem';

export const RATION_PRIORITY = ['dried_fish', 'cooked_fish', 'coconut', 'berries', 'raw_fish'];
export const GATHER_SECONDS = 4;
export const CARRY_CAP = 10;

const NODE_ITEM: Record<string, string> = {
  tree: 'wood',
  rock: 'stone',
  vine: 'vine',
  berry: 'berries',
  palm: 'coconut',
  tide: 'raw_fish',
  clay: 'clay',
};

export interface RationResult {
  fed: string[];
  fled: string[];
}

export function assignLaborer(
  state: GameState,
  laborerId: string,
  nodeType: string,
  x: number,
  y: number,
): void {
  const laborer = state.laborers.find((l) => l.id === laborerId);
  if (!laborer) return;
  laborer.task = { nodeType, x, y };
  laborer.progress = 0;
}

export function settleLaborRations(state: GameState): RationResult {
  const fed: string[] = [];
  const fled: string[] = [];
  const storage = getStorage(state);

  for (const laborer of state.laborers) {
    let ate = false;
    if (storage?.storage) {
      for (const baseId of RATION_PRIORITY) {
        const index = storage.storage.findIndex((item) => item.baseId === baseId && item.count > 0);
        if (index < 0) continue;
        const stack = storage.storage[index];
        stack.count -= 1;
        if (stack.count <= 0) storage.storage.splice(index, 1);
        ate = true;
        break;
      }
    }

    if (ate) {
      laborer.loyalty = Math.min(3, laborer.loyalty + 1) as LaborerState['loyalty'];
      fed.push(laborer.id);
    } else {
      laborer.loyalty = Math.max(0, laborer.loyalty - 1) as LaborerState['loyalty'];
      if (laborer.loyalty === 0) fled.push(laborer.id);
    }
  }

  if (fled.length > 0) {
    state.laborers = state.laborers.filter((laborer) => !fled.includes(laborer.id));
  }
  return { fed, fled };
}

function unload(state: GameState, laborer: LaborerState, storage: BuildingInstance | null): void {
  if (!laborer.carryingType || laborer.carrying <= 0) {
    laborer.carrying = 0;
    laborer.carryingType = null;
    return;
  }
  if (storage) {
    storage.storage ??= [];
    const existing = storage.storage.find((item) => item.baseId === laborer.carryingType);
    if (existing) {
      existing.count += laborer.carrying;
    } else {
      storage.storage.push({ baseId: laborer.carryingType, count: laborer.carrying });
    }
  } else {
    state.world.groundLoot.push({
      baseId: laborer.carryingType,
      count: laborer.carrying,
    });
  }
  laborer.carrying = 0;
  laborer.carryingType = null;
}

export function tickLabor(state: GameState, dtSec: number): void {
  if (dtSec <= 0) return;
  const storage = getStorage(state);

  for (const laborer of state.laborers) {
    if (!laborer.task) continue;

    if (laborer.carrying >= CARRY_CAP) {
      unload(state, laborer, storage);
      continue;
    }

    laborer.progress = (laborer.progress ?? 0) + dtSec;
    while (laborer.progress >= GATHER_SECONDS && laborer.carrying < CARRY_CAP) {
      laborer.progress -= GATHER_SECONDS;
      laborer.carrying += 1;
      laborer.carryingType = NODE_ITEM[laborer.task.nodeType] ?? 'wood';
    }

    if (laborer.carrying >= CARRY_CAP) {
      unload(state, laborer, storage);
    }
  }
}
