import type { SavageState } from '../entities/savage';
import type { AnimalState } from '../entities/animal';
import { SAVE_VERSION } from './saveVersion';

export interface ItemStack {
  baseId: string;
  count: number;
  instanceId?: string;
  durability?: number;
  /** world position for loot lying on the ground */
  x?: number;
  y?: number;
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
  /** seconds accumulated toward the next gathered item */
  progress?: number;
}

export interface ResourceNodeState {
  remaining: number;
  respawnDay: number;
}

export interface GameState {
  version: number;
  settings: { muted: boolean; sfxVolume: number; hudCompact: boolean };
  lootSeed: number;
  lootRolls: number;
  /** pixels moved since the last boot durability tick */
  bootWear: number;
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
  hotbarIndex: number;
  equipment: { weapon: string | null; armor: string | null; boots: string | null };
  equipmentInstances: EquipInstance[];
  world: {
    /** Seed of the generated island; terrain is rebuilt from it on load. */
    seed: number;
    /** FNV-1a checksum of the generated terrain (0 until first generation). */
    hash: number;
    /** Base64 bitmap of explored 32×32 chunks (see core/explored). */
    explored: string;
    /** Landmark ids the player has discovered, for the map panel. */
    discovered: string[];
    /** Player-placed map waypoint in world pixels. */
    waypoint: { x: number; y: number } | null;
    nodeStates: Record<string, ResourceNodeState>;
    nodes: Record<string, { x: number; y: number; type: string }>;
    uniqueLoot: string[];
    wreckSpawn: { x: number; y: number };
    /** Shipwreck dungeon entrance (world px), beside the wreck chest. */
    wreckEntrance: { x: number; y: number };
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
    pendingReset: boolean;
  };
  flags: { tutorialStep: number; raidWarnedDay: number; firstRaidDone: boolean };
  raid: { active: boolean; day: number } | null;
  savages: SavageState[];
  animals: AnimalState[];
}

export function createNewGame(seed: number = Date.now()): GameState {
  const wreckSpawn = { x: 12 * 16, y: 48 * 16 };
  return {
    version: SAVE_VERSION,
    settings: { muted: false, sfxVolume: 0.7, hudCompact: false },
    lootSeed: seed,
    lootRolls: 0,
    bootWear: 0,
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
    hotbarIndex: 0,
    equipment: { weapon: null, armor: null, boots: null },
    equipmentInstances: [],
    world: {
      seed,
      hash: 0,
      explored: '',
      discovered: [],
      waypoint: null,
      nodeStates: {},
      nodes: {},
      uniqueLoot: [],
      wreckSpawn,
      wreckEntrance: { x: 0, y: 0 },
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
      pendingReset: false,
    },
    flags: { tutorialStep: 0, raidWarnedDay: 0, firstRaidDone: false },
    raid: null,
    savages: [],
    animals: [],
  };
}
