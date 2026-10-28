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
  straw_shoes: {
    id: 'straw_shoes',
    output: 'straw_shoes',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 3,
    inputs: [{ baseId: 'vine', count: 3 }],
  },
  vine_armor: {
    id: 'vine_armor',
    output: 'vine_armor',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 5,
    inputs: [
      { baseId: 'vine', count: 8 },
      { baseId: 'cloth', count: 2 },
    ],
  },
  wading_shoes: {
    id: 'wading_shoes',
    output: 'wading_shoes',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 4,
    inputs: [
      { baseId: 'vine', count: 6 },
      { baseId: 'cloth', count: 1 },
    ],
  },
  shell_armor: {
    id: 'shell_armor',
    output: 'shell_armor',
    count: 1,
    station: 'workbench',
    unlockLevel: 2,
    durationSec: 6,
    inputs: [
      { baseId: 'shell', count: 6 },
      { baseId: 'vine', count: 2 },
    ],
  },
  canvas_boots: {
    id: 'canvas_boots',
    output: 'canvas_boots',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 4,
    inputs: [
      { baseId: 'cloth', count: 2 },
      { baseId: 'vine', count: 2 },
    ],
  },
  canvas_armor: {
    id: 'canvas_armor',
    output: 'canvas_armor',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 5,
    inputs: [
      { baseId: 'cloth', count: 4 },
      { baseId: 'vine', count: 2 },
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
  cooked_meat: {
    id: 'cooked_meat',
    output: 'cooked_meat',
    count: 1,
    station: 'campfire',
    unlockLevel: 0,
    durationSec: 2,
    inputs: [{ baseId: 'raw_meat', count: 1 }],
  },
  dried_meat: {
    id: 'dried_meat',
    output: 'dried_meat',
    count: 1,
    station: 'dryingRack',
    unlockLevel: 2,
    durationSec: 900,
    inputs: [{ baseId: 'raw_meat', count: 1 }],
  },
};
