export interface BuildingCost {
  baseId: string;
  count: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  cost: BuildingCost[];
  hp: number;
  unlockLevel: 0 | 1 | 2 | 3 | 4 | 5;
  /** blocks savage movement */
  blocks: boolean;
  /** only one may exist; placing it founds the camp */
  unique?: boolean;
  /** cannot be demolished or destroyed */
  indestructible?: boolean;
}

export const BUILDINGS: Record<string, BuildingDef> = {
  flag: {
    id: 'flag',
    name: '据点旗',
    cost: [{ baseId: 'wood', count: 1 }],
    hp: 999,
    unlockLevel: 0,
    blocks: false,
    unique: true,
    indestructible: true,
  },
  campfire: {
    id: 'campfire',
    name: '营火',
    cost: [
      { baseId: 'wood', count: 10 },
      { baseId: 'stone', count: 8 },
    ],
    hp: 100,
    unlockLevel: 0,
    blocks: false,
  },
  workbench: {
    id: 'workbench',
    name: '工作台',
    cost: [{ baseId: 'wood', count: 15 }],
    hp: 80,
    unlockLevel: 0,
    blocks: true,
  },
  cage: {
    id: 'cage',
    name: '囚笼',
    cost: [
      { baseId: 'wood', count: 20 },
      { baseId: 'vine', count: 10 },
    ],
    hp: 120,
    unlockLevel: 0,
    blocks: true,
  },
  tent: {
    id: 'tent',
    name: '帐篷',
    cost: [
      { baseId: 'wood', count: 20 },
      { baseId: 'cloth', count: 4 },
    ],
    hp: 80,
    unlockLevel: 1,
    blocks: true,
  },
  storage: {
    id: 'storage',
    name: '储物箱',
    cost: [
      { baseId: 'wood', count: 15 },
      { baseId: 'vine', count: 4 },
    ],
    hp: 80,
    unlockLevel: 0,
    blocks: true,
  },
  fence: {
    id: 'fence',
    name: '木栅栏',
    cost: [{ baseId: 'wood', count: 3 }],
    hp: 60,
    unlockLevel: 0,
    blocks: true,
  },
  stone_wall: {
    id: 'stone_wall',
    name: '石墙',
    cost: [{ baseId: 'stone', count: 2 }],
    hp: 200,
    unlockLevel: 2,
    blocks: true,
  },
  drying_rack: {
    id: 'drying_rack',
    name: '晾肉架',
    cost: [
      { baseId: 'wood', count: 10 },
      { baseId: 'vine', count: 4 },
    ],
    hp: 60,
    unlockLevel: 2,
    blocks: true,
  },
  farm_plot: {
    id: 'farm_plot',
    name: '农田',
    cost: [
      { baseId: 'wood', count: 4 },
      { baseId: 'vine', count: 2 },
    ],
    hp: 40,
    unlockLevel: 1,
    blocks: false,
  },
  stone_house: {
    id: 'stone_house',
    name: '石屋',
    cost: [
      { baseId: 'stone', count: 30 },
      { baseId: 'wood', count: 20 },
      { baseId: 'cloth', count: 6 },
    ],
    hp: 300,
    unlockLevel: 3,
    blocks: true,
  },
  watchtower: {
    id: 'watchtower',
    name: '瞭望塔',
    cost: [
      { baseId: 'wood', count: 25 },
      { baseId: 'stone', count: 15 },
      { baseId: 'rope', count: 4 },
    ],
    hp: 150,
    unlockLevel: 3,
    blocks: true,
  },
  furnace: {
    id: 'furnace',
    name: '熔炉',
    cost: [
      { baseId: 'stone', count: 30 },
      { baseId: 'clay', count: 15 },
      { baseId: 'iron_ingot', count: 2 },
    ],
    hp: 250,
    unlockLevel: 3,
    blocks: true,
  },
  dock: {
    id: 'dock',
    name: '码头',
    cost: [
      { baseId: 'wood', count: 40 },
      { baseId: 'rope', count: 8 },
      { baseId: 'stone', count: 10 },
    ],
    hp: 200,
    unlockLevel: 4,
    blocks: true,
  },
  warehouse: {
    id: 'warehouse',
    name: '仓库',
    cost: [
      { baseId: 'stone', count: 40 },
      { baseId: 'wood', count: 30 },
      { baseId: 'iron_ingot', count: 5 },
    ],
    hp: 400,
    unlockLevel: 4,
    blocks: true,
  },
  lighthouse: {
    id: 'lighthouse',
    name: '灯塔',
    cost: [
      { baseId: 'stone', count: 60 },
      { baseId: 'iron_ingot', count: 10 },
      { baseId: 'torch', count: 6 },
    ],
    hp: 500,
    unlockLevel: 4,
    blocks: true,
  },
};
