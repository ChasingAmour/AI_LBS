export type Station = 'hand' | 'workbench' | 'campfire' | 'dryingRack';

export interface RecipeInput {
  baseId: string;
  count: number;
}

export interface Recipe {
  id: string;
  output: string;
  count: number;
  station: Station;
  unlockLevel: 0 | 1 | 2 | 3;
  durationSec: number;
  inputs: RecipeInput[];
}

export const RECIPES: Record<string, Recipe> = {
  stick: {
    id: 'stick',
    output: 'stick',
    count: 1,
    station: 'hand',
    unlockLevel: 0,
    durationSec: 1,
    inputs: [{ baseId: 'wood', count: 1 }],
  },
  rope: {
    id: 'rope',
    output: 'rope',
    count: 1,
    station: 'hand',
    unlockLevel: 0,
    durationSec: 2,
    inputs: [{ baseId: 'vine', count: 2 }],
  },
  torch: {
    id: 'torch',
    output: 'torch',
    count: 1,
    station: 'hand',
    unlockLevel: 0,
    durationSec: 1,
    inputs: [
      { baseId: 'wood', count: 1 },
      { baseId: 'vine', count: 1 },
    ],
  },
  bandage: {
    id: 'bandage',
    output: 'bandage',
    count: 1,
    station: 'hand',
    unlockLevel: 0,
    durationSec: 2,
    inputs: [{ baseId: 'cloth', count: 1 }],
  },
  club: {
    id: 'club',
    output: 'club',
    count: 1,
    station: 'hand',
    unlockLevel: 0,
    durationSec: 3,
    inputs: [
      { baseId: 'wood', count: 2 },
      { baseId: 'rope', count: 1 },
    ],
  },
  stone_axe: {
    id: 'stone_axe',
    output: 'stone_axe',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 4,
    inputs: [
      { baseId: 'wood', count: 2 },
      { baseId: 'stone', count: 3 },
    ],
  },
  stone_pick: {
    id: 'stone_pick',
    output: 'stone_pick',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 4,
    inputs: [
      { baseId: 'wood', count: 2 },
      { baseId: 'stone', count: 4 },
    ],
  },
  spear: {
    id: 'spear',
    output: 'spear',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 5,
    inputs: [
      { baseId: 'wood', count: 3 },
      { baseId: 'stone', count: 2 },
      { baseId: 'rope', count: 1 },
    ],
  },
  cooked_fish: {
    id: 'cooked_fish',
    output: 'cooked_fish',
    count: 1,
    station: 'campfire',
    unlockLevel: 0,
    durationSec: 2,
    inputs: [{ baseId: 'raw_fish', count: 1 }],
  },
  dried_fish: {
    id: 'dried_fish',
    output: 'dried_fish',
    count: 1,
    station: 'dryingRack',
    unlockLevel: 2,
    durationSec: 900,
    inputs: [{ baseId: 'raw_fish', count: 1 }],
  },
};
