import type { ItemStack } from '../core/gameState';

export interface DropDef {
  baseId: string;
  min: number;
  max: number;
  /** 0..1, defaults to 1 */
  chance?: number;
}

export interface ResourceNodeDef {
  type: string;
  name: string;
  maxHits: number;
  respawnDays: number;
  /** tool that avoids the 3x gathering penalty */
  tool?: string;
  drops: DropDef[];
  depleteDrops?: DropDef[];
}

export const RESOURCE_NODES: Record<string, ResourceNodeDef> = {
      tree: {
    type: 'tree',
    name: '树',
    maxHits: 4,
    respawnDays: 1,
    tool: 'stone_axe',
    drops: [{ baseId: 'wood', min: 1, max: 1 }],
    depleteDrops: [{ baseId: 'wood', min: 1, max: 2 }],
  },
  rock: {
    type: 'rock',
    name: '岩石',
    maxHits: 4,
    respawnDays: 2,
    tool: 'stone_pick',
    drops: [{ baseId: 'stone', min: 1, max: 1 }],
    depleteDrops: [
      { baseId: 'stone', min: 1, max: 2 },
      { baseId: 'flint', min: 1, max: 1, chance: 0.3 },
    ],
  },
  vine: {
    type: 'vine',
    name: '藤蔓',
    maxHits: 2,
    respawnDays: 2,
    drops: [{ baseId: 'vine', min: 1, max: 1 }],
  },
  berry: {
    type: 'berry',
    name: '浆果灌木',
    maxHits: 2,
    respawnDays: 2,
    drops: [{ baseId: 'berries', min: 1, max: 1 }],
    depleteDrops: [{ baseId: 'berries', min: 1, max: 1, chance: 0.5 }],
  },
  palm: {
    type: 'palm',
    name: '椰子树',
    maxHits: 2,
    respawnDays: 2,
    drops: [{ baseId: 'coconut', min: 1, max: 1 }],
  },
  tide: {
    type: 'tide',
    name: '潮池',
    maxHits: 1,
    respawnDays: 1,
    drops: [
      { baseId: 'raw_fish', min: 1, max: 1 },
      { baseId: 'shell', min: 1, max: 1, chance: 0.5 },
    ],
  },
  clay: {
    type: 'clay',
    name: '黏土坑',
    maxHits: 3,
    respawnDays: 3,
    tool: 'stone_pick',
    drops: [],
    depleteDrops: [{ baseId: 'clay', min: 2, max: 2 }],
  },
  copper: {
    type: 'copper',
    name: '铜矿',
    maxHits: 4,
    respawnDays: 3,
    tool: 'stone_pick',
    drops: [{ baseId: 'copper_ore', min: 1, max: 1 }],
    depleteDrops: [
      { baseId: 'copper_ore', min: 1, max: 2 },
      { baseId: 'flint', min: 1, max: 1, chance: 0.25 },
    ],
  },
  iron: {
    type: 'iron',
    name: '铁矿',
    maxHits: 5,
    respawnDays: 4,
    tool: 'stone_pick',
    drops: [{ baseId: 'iron_ore', min: 1, max: 1 }],
    depleteDrops: [
      { baseId: 'iron_ore', min: 1, max: 2 },
      { baseId: 'coal', min: 1, max: 1, chance: 0.3 },
    ],
  },
  coal: {
    type: 'coal',
    name: '煤矿',
    maxHits: 3,
    respawnDays: 3,
    tool: 'stone_pick',
    drops: [{ baseId: 'coal', min: 1, max: 1 }],
    depleteDrops: [{ baseId: 'coal', min: 1, max: 2 }],
  },
};

export const NODE_TYPE_BY_PREFIX: Record<string, string> = {
  tree: 'tree',
  rock: 'rock',
  vine: 'vine',
  berry: 'berry',
  palm: 'palm',
  tide: 'tide',
  clay: 'clay',
  copper: 'copper',
  iron: 'iron',
  coal: 'coal',
};

export function nodeTypeFromId(nodeId: string): string | null {
  const prefix = nodeId.split('_')[0];
  return NODE_TYPE_BY_PREFIX[prefix] ?? null;
}

export function nodeDefForId(nodeId: string): ResourceNodeDef | null {
  const type = nodeTypeFromId(nodeId);
  return type ? RESOURCE_NODES[type] : null;
}

export interface UniqueChestDef {
  id: string;
  requiresTorch?: boolean;
  items: ItemStack[];
}

export const UNIQUE_CHESTS: Record<string, UniqueChestDef> = {
  chest_wreck: {
    id: 'chest_wreck',
    items: [
      { baseId: 'cloth', count: 4 },
      { baseId: 'bandage', count: 2 },
    ],
  },
  chest_cave: {
    id: 'chest_cave',
    requiresTorch: true,
    items: [
      { baseId: 'flint', count: 5 },
      { baseId: 'cloth', count: 2 },
    ],
  },
};
