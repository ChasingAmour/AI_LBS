export type ItemKind = 'material' | 'food' | 'tool' | 'weapon' | 'consumable';

export interface FoodEffect {
  hunger?: number;
  thirst?: number;
  heal?: number;
  healOverSec?: number;
}

export interface LightSpec {
  radius: number;
  brightness: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  maxDurability?: number;
  /** Restores applied when eaten. Only items with an effect can be eaten. */
  food?: FoodEffect;
  /** Radius in pixels and alpha 0..1 of the light this item casts. */
  light?: LightSpec;
}

export const ITEMS: Record<string, ItemDef> = {
  wood: { id: 'wood', name: '木头', kind: 'material' },
  stone: { id: 'stone', name: '石头', kind: 'material' },
  flint: { id: 'flint', name: '燧石', kind: 'material' },
  vine: { id: 'vine', name: '藤蔓', kind: 'material' },
  clay: { id: 'clay', name: '黏土', kind: 'material' },
  cloth: { id: 'cloth', name: '布', kind: 'material' },
  shell: { id: 'shell', name: '贝壳', kind: 'material' },
  raw_fish: { id: 'raw_fish', name: '生鱼', kind: 'material' },
  stick: { id: 'stick', name: '木棍', kind: 'material' },
  rope: { id: 'rope', name: '绳子', kind: 'material' },
  raw_meat: { id: 'raw_meat', name: '生肉', kind: 'material' },
  copper_ore: { id: 'copper_ore', name: '铜矿石', kind: 'material' },
  iron_ore: { id: 'iron_ore', name: '铁矿石', kind: 'material' },
  coal: { id: 'coal', name: '煤', kind: 'material' },
  copper_ingot: { id: 'copper_ingot', name: '铜锭', kind: 'material' },
  iron_ingot: { id: 'iron_ingot', name: '铁锭', kind: 'material' },
  coconut: { id: 'coconut', name: '椰子', kind: 'food', food: { hunger: 10, thirst: 15 } },
  berries: { id: 'berries', name: '浆果', kind: 'food', food: { hunger: 8 } },
  cooked_fish: { id: 'cooked_fish', name: '烤鱼', kind: 'food', food: { hunger: 35 } },
  dried_fish: { id: 'dried_fish', name: '鱼干', kind: 'food', food: { hunger: 25 } },
  cooked_meat: { id: 'cooked_meat', name: '烤肉', kind: 'food', food: { hunger: 40 } },
  dried_meat: { id: 'dried_meat', name: '肉干', kind: 'food', food: { hunger: 30 } },
  bandage: { id: 'bandage', name: '绷带', kind: 'consumable', food: { heal: 30, healOverSec: 8 } },
  torch: {
    id: 'torch',
    name: '火把',
    kind: 'tool',
    maxDurability: 180,
    light: { radius: 64, brightness: 0.85 },
  },
  stone_axe: { id: 'stone_axe', name: '石斧', kind: 'tool', maxDurability: 60 },
  stone_pick: { id: 'stone_pick', name: '石镐', kind: 'tool', maxDurability: 60 },
  club: { id: 'club', name: '木棒', kind: 'weapon', maxDurability: 40 },
  spear: { id: 'spear', name: '石矛', kind: 'weapon', maxDurability: 50 },
};

/** Anything with a food effect can be eaten from the inventory. */
export function isEdible(baseId: string): boolean {
  return Boolean(ITEMS[baseId]?.food);
}
