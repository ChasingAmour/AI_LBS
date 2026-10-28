export interface BuildingCost {
  baseId: string;
  count: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  cost: BuildingCost[];
  hp: number;
  unlockLevel: 0 | 1 | 2 | 3;
  /** blocks savage movement */
  blocks: boolean;
}

export const BUILDINGS: Record<string, BuildingDef> = {
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
};
