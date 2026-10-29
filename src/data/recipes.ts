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
  waterskin: {
    id: 'waterskin',
    output: 'waterskin',
    count: 1,
    station: 'workbench',
    unlockLevel: 0,
    durationSec: 3,
    inputs: [
      { baseId: 'cloth', count: 2 },
      { baseId: 'vine', count: 1 },
    ],
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
  fishing_rod: {
    id: 'fishing_rod',
    output: 'fishing_rod',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 3,
    inputs: [
      { baseId: 'wood', count: 3 },
      { baseId: 'rope', count: 2 },
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
  copper_ingot: {
    id: 'copper_ingot',
    output: 'copper_ingot',
    count: 1,
    station: 'campfire',
    unlockLevel: 1,
    durationSec: 4,
    inputs: [
      { baseId: 'copper_ore', count: 2 },
      { baseId: 'coal', count: 1 },
    ],
  },
  iron_ingot: {
    id: 'iron_ingot',
    output: 'iron_ingot',
    count: 1,
    station: 'campfire',
    unlockLevel: 1,
    durationSec: 6,
    inputs: [
      { baseId: 'iron_ore', count: 2 },
      { baseId: 'coal', count: 1 },
    ],
  },
  iron_spear: {
    id: 'iron_spear',
    output: 'iron_spear',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 8,
    inputs: [
      { baseId: 'iron_ingot', count: 2 },
      { baseId: 'wood', count: 2 },
      { baseId: 'rope', count: 1 },
    ],
  },
  cloth: {
    id: 'cloth',
    output: 'cloth',
    count: 1,
    station: 'workbench',
    unlockLevel: 0,
    durationSec: 3,
    inputs: [{ baseId: 'vine', count: 3 }],
  },
  iron_axe: {
    id: 'iron_axe',
    output: 'iron_axe',
    count: 1,
    station: 'workbench',
    unlockLevel: 2,
    durationSec: 6,
    inputs: [
      { baseId: 'iron_ingot', count: 2 },
      { baseId: 'wood', count: 2 },
    ],
  },
  copper_spear: {
    id: 'copper_spear',
    output: 'copper_spear',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 6,
    inputs: [
      { baseId: 'copper_ingot', count: 2 },
      { baseId: 'wood', count: 2 },
      { baseId: 'rope', count: 1 },
    ],
  },
  copper_armor: {
    id: 'copper_armor',
    output: 'copper_armor',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 7,
    inputs: [
      { baseId: 'copper_ingot', count: 3 },
      { baseId: 'cloth', count: 2 },
    ],
  },
  lantern: {
    id: 'lantern',
    output: 'lantern',
    count: 1,
    station: 'workbench',
    unlockLevel: 2,
    durationSec: 5,
    inputs: [
      { baseId: 'iron_ingot', count: 1 },
      { baseId: 'torch', count: 1 },
      { baseId: 'cloth', count: 1 },
    ],
  },
  fish_stew: {
    id: 'fish_stew',
    output: 'fish_stew',
    count: 1,
    station: 'campfire',
    unlockLevel: 1,
    durationSec: 3,
    inputs: [
      { baseId: 'raw_fish', count: 1 },
      { baseId: 'coconut', count: 1 },
      { baseId: 'seaweed', count: 1 },
    ],
  },
  meat_stew: {
    id: 'meat_stew',
    output: 'meat_stew',
    count: 1,
    station: 'campfire',
    unlockLevel: 1,
    durationSec: 3,
    inputs: [
      { baseId: 'raw_meat', count: 1 },
      { baseId: 'coconut', count: 1 },
      { baseId: 'seaweed', count: 1 },
    ],
  },
  roast_coconut: {
    id: 'roast_coconut',
    output: 'roast_coconut',
    count: 1,
    station: 'campfire',
    unlockLevel: 0,
    durationSec: 2,
    inputs: [{ baseId: 'coconut', count: 1 }],
  },
  herbal_poultice: {
    id: 'herbal_poultice',
    output: 'herbal_poultice',
    count: 1,
    station: 'hand',
    unlockLevel: 0,
    durationSec: 3,
    inputs: [
      { baseId: 'seaweed', count: 2 },
      { baseId: 'cloth', count: 1 },
    ],
  },
  copper_axe: {
    id: 'copper_axe',
    output: 'copper_axe',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 5,
    inputs: [
      { baseId: 'copper_ingot', count: 2 },
      { baseId: 'wood', count: 2 },
    ],
  },
  copper_pick: {
    id: 'copper_pick',
    output: 'copper_pick',
    count: 1,
    station: 'workbench',
    unlockLevel: 1,
    durationSec: 5,
    inputs: [
      { baseId: 'copper_ingot', count: 2 },
      { baseId: 'wood', count: 2 },
    ],
  },
  iron_pick: {
    id: 'iron_pick',
    output: 'iron_pick',
    count: 1,
    station: 'workbench',
    unlockLevel: 2,
    durationSec: 6,
    inputs: [
      { baseId: 'iron_ingot', count: 2 },
      { baseId: 'wood', count: 2 },
    ],
  },
  iron_armor: {
    id: 'iron_armor',
    output: 'iron_armor',
    count: 1,
    station: 'workbench',
    unlockLevel: 2,
    durationSec: 8,
    inputs: [
      { baseId: 'iron_ingot', count: 3 },
      { baseId: 'cloth', count: 2 },
    ],
  },
  seaweed_salad: {
    id: 'seaweed_salad',
    output: 'seaweed_salad',
    count: 1,
    station: 'hand',
    unlockLevel: 0,
    durationSec: 2,
    inputs: [
      { baseId: 'seaweed', count: 2 },
      { baseId: 'berries', count: 1 },
    ],
  },
  berry_jam: {
    id: 'berry_jam',
    output: 'berry_jam',
    count: 1,
    station: 'campfire',
    unlockLevel: 0,
    durationSec: 3,
    inputs: [
      { baseId: 'berries', count: 3 },
      { baseId: 'coconut', count: 1 },
    ],
  },
  coconut_milk: {
    id: 'coconut_milk',
    output: 'coconut_milk',
    count: 1,
    station: 'hand',
    unlockLevel: 0,
    durationSec: 1,
    inputs: [{ baseId: 'coconut', count: 1 }],
  },
  shell_soup: {
    id: 'shell_soup',
    output: 'shell_soup',
    count: 1,
    station: 'campfire',
    unlockLevel: 1,
    durationSec: 3,
    inputs: [
      { baseId: 'shell', count: 2 },
      { baseId: 'seaweed', count: 1 },
      { baseId: 'coconut', count: 1 },
    ],
  },
  coconut_salve: {
    id: 'coconut_salve',
    output: 'coconut_salve',
    count: 1,
    station: 'hand',
    unlockLevel: 0,
    durationSec: 2,
    inputs: [
      { baseId: 'coconut', count: 1 },
      { baseId: 'seaweed', count: 1 },
    ],
  },
};

export type RecipeCategory =
  | 'material'
  | 'tool'
  | 'weapon'
  | 'armor'
  | 'food'
  | 'medicine'
  | 'smelting';

export const CATEGORY_ORDER: RecipeCategory[] = [
  'material',
  'tool',
  'weapon',
  'armor',
  'food',
  'medicine',
  'smelting',
];

export const CATEGORY_NAMES: Record<RecipeCategory, string> = {
  material: '加工材料',
  tool: '工具',
  weapon: '武器',
  armor: '防具',
  food: '食物',
  medicine: '药品',
  smelting: '冶炼',
};

export const CATEGORY_BY_RECIPE: Record<string, RecipeCategory> = {
  stick: 'material',
  rope: 'material',
  cloth: 'material',
  torch: 'tool',
  waterskin: 'tool',
  stone_axe: 'tool',
  iron_axe: 'tool',
  copper_axe: 'tool',
  stone_pick: 'tool',
  copper_pick: 'tool',
  iron_pick: 'tool',
  fishing_rod: 'tool',
  lantern: 'tool',
  club: 'weapon',
  spear: 'weapon',
  iron_spear: 'weapon',
  copper_spear: 'weapon',
  straw_shoes: 'armor',
  vine_armor: 'armor',
  wading_shoes: 'armor',
  shell_armor: 'armor',
  canvas_boots: 'armor',
  canvas_armor: 'armor',
  copper_armor: 'armor',
  iron_armor: 'armor',
  cooked_fish: 'food',
  dried_fish: 'food',
  cooked_meat: 'food',
  dried_meat: 'food',
  fish_stew: 'food',
  meat_stew: 'food',
  roast_coconut: 'food',
  seaweed_salad: 'food',
  berry_jam: 'food',
  coconut_milk: 'food',
  shell_soup: 'food',
  bandage: 'medicine',
  herbal_poultice: 'medicine',
  coconut_salve: 'medicine',
  copper_ingot: 'smelting',
  iron_ingot: 'smelting',
};

export function recipeCategory(recipeId: string): RecipeCategory {
  return CATEGORY_BY_RECIPE[recipeId] ?? 'material';
}

export const STATION_NAMES: Record<Station, string> = {
  hand: '手工',
  workbench: '工作台',
  campfire: '营火',
  dryingRack: '晾肉架',
};
