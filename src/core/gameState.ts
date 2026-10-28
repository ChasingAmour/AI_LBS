export interface ItemStack {
  baseId: string;
  count: number;
  instanceId?: string;
  durability?: number;
}

export interface EquipInstance {
  instanceId: string;
  baseId: string;
  slot: 'weapon' | 'armor' | 'boots';
  rarity: 'common' | 'fine' | 'rare' | 'epic' | 'legendary';
  affixes: { id: string; value: number }[];
  uniqueTraitId?: string;
  durability: number;
  maxDurability: number;
}

export interface BuildingInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  storage?: ItemStack[];
}

export interface LaborerState {
  id: string;
  name: string;
  x: number;
  y: number;
  loyalty: 0 | 1 | 2 | 3;
  task: { nodeType: string; x: number; y: number } | null;
  carrying: number;
  carryingType: string | null;
}

export interface ResourceNodeState {
  remaining: number;
  respawnDay: number;
}

export interface GameState {
  version: 1;
  savedAt: number;
  playtimeSec: number;
  rngState: number;
  scene: 'island' | 'dungeon';
  dungeonFloor: 1 | 2 | 3 | null;
  time: { day: number; clockMin: number; phase: 'day' | 'night' };
  player: {
    x: number;
    y: number;
    hp: number;
    hunger: number;
    thirst: number;
    energy: number;
    facing: 'up' | 'down' | 'left' | 'right';
    dead?: boolean;
    healing?: { timeLeft: number; perSecond: number } | null;
  };
  inventory: ItemStack[];
  hotbar: (string | null)[];
  equipment: { weapon: string | null; armor: string | null; boots: string | null };
  equipmentInstances: EquipInstance[];
  world: {
    nodeStates: Record<string, ResourceNodeState>;
    nodes: Record<string, { x: number; y: number; type: string }>;
    uniqueLoot: string[];
    wreckSpawn: { x: number; y: number };
    groundLoot: ItemStack[];
  };
  camp: { level: 0 | 1 | 2 | 3; center: { x: number; y: number } };
  buildings: BuildingInstance[];
  laborers: LaborerState[];
  dungeon: {
    openedChestsThisWeek: string[];
    clearedThisWeek: boolean;
    firstClearDone: boolean;
    resetDay: number;
  };
  flags: { tutorialStep: number; raidWarnedDay: number; firstRaidDone: boolean };
  raid: { active: boolean; day: number } | null;
}

export function createNewGame(seed: number = Date.now()): GameState {
  const wreckSpawn = { x: 12 * 16, y: 48 * 16 };
  return {
    version: 1,
    savedAt: Date.now(),
    playtimeSec: 0,
    rngState: seed,
    scene: 'island',
    dungeonFloor: null,
    time: { day: 1, clockMin: 360, phase: 'day' },
    player: {
      x: wreckSpawn.x,
      y: wreckSpawn.y,
      hp: 100,
      hunger: 100,
      thirst: 100,
      energy: 100,
      facing: 'down',
    },
    inventory: [],
    hotbar: Array.from({ length: 8 }, () => null),
    equipment: { weapon: null, armor: null, boots: null },
    equipmentInstances: [],
    world: {
      nodeStates: {},
      nodes: {},
      uniqueLoot: [],
      wreckSpawn,
      groundLoot: [],
    },
    camp: { level: 0, center: { x: 48, y: 48 } },
    buildings: [],
    laborers: [],
    dungeon: {
      openedChestsThisWeek: [],
      clearedThisWeek: false,
      firstClearDone: false,
      resetDay: 1,
    },
    flags: { tutorialStep: 0, raidWarnedDay: 0, firstRaidDone: false },
    raid: null,
  };
}
