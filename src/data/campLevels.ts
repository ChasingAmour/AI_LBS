export interface CampRequirement {
  type: string;
  count: number;
}

export interface CampLevelDef {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  captiveCap: number;
  requires: CampRequirement[];
}

export const CAMP_LEVELS: CampLevelDef[] = [
  {
    level: 1,
    name: '简陋营地',
    captiveCap: 1,
    requires: [
      { type: 'campfire', count: 1 },
      { type: 'workbench', count: 1 },
      { type: 'cage', count: 1 },
    ],
  },
  {
    level: 2,
    name: '定居营地',
    captiveCap: 3,
    requires: [
      { type: 'tent', count: 1 },
      { type: 'storage', count: 1 },
      { type: 'fence', count: 8 },
    ],
  },
  {
    level: 3,
    name: '设防营地',
    captiveCap: 6,
    requires: [
      { type: 'stone_wall', count: 12 },
      { type: 'drying_rack', count: 1 },
      { type: 'farm_plot', count: 2 },
    ],
  },
  {
    level: 4,
    name: '工坊营地',
    captiveCap: 9,
    requires: [
      { type: 'stone_house', count: 1 },
      { type: 'watchtower', count: 1 },
      { type: 'furnace', count: 1 },
    ],
  },
  {
    level: 5,
    name: '现代营地',
    captiveCap: 12,
    requires: [
      { type: 'dock', count: 1 },
      { type: 'warehouse', count: 1 },
      { type: 'lighthouse', count: 1 },
    ],
  },
];

export const CAMP_MAX_LEVEL = 5;
