export type ItemKind = 'material' | 'food' | 'tool' | 'weapon' | 'consumable';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  maxDurability?: number;
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
  coconut: { id: 'coconut', name: '椰子', kind: 'food' },
  berries: { id: 'berries', name: '浆果', kind: 'food' },
  cooked_fish: { id: 'cooked_fish', name: '烤鱼', kind: 'food' },
  dried_fish: { id: 'dried_fish', name: '鱼干', kind: 'food' },
  bandage: { id: 'bandage', name: '绷带', kind: 'consumable' },
  torch: { id: 'torch', name: '火把', kind: 'tool', maxDurability: 180 },
  stone_axe: { id: 'stone_axe', name: '石斧', kind: 'tool', maxDurability: 60 },
  stone_pick: { id: 'stone_pick', name: '石镐', kind: 'tool', maxDurability: 60 },
  club: { id: 'club', name: '木棒', kind: 'weapon', maxDurability: 40 },
  spear: { id: 'spear', name: '石矛', kind: 'weapon', maxDurability: 50 },
};
