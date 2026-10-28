export interface CampRequirement {
  type: string;
  count: number;
}

export interface CampLevelDef {
  level: 1 | 2 | 3;
  captiveCap: number;
  requires: CampRequirement[];
}

export const CAMP_LEVELS: CampLevelDef[] = [
  {
    level: 1,
    captiveCap: 1,
    requires: [
      { type: 'campfire', count: 1 },
      { type: 'workbench', count: 1 },
      { type: 'cage', count: 1 },
    ],
  },
  {
    level: 2,
    captiveCap: 3,
    requires: [
      { type: 'tent', count: 1 },
      { type: 'storage', count: 1 },
      { type: 'fence', count: 8 },
    ],
  },
  {
    level: 3,
    captiveCap: 6,
    requires: [
      { type: 'stone_wall', count: 12 },
      { type: 'drying_rack', count: 1 },
    ],
  },
];

export const CAMP_MAX_LEVEL = 3;
