import type { GameState } from '../core/gameState';
import { createNewGame } from '../core/gameState';
import { createRng } from '../core/rng';
import { decodeExplored } from '../core/explored';
import { SAVE_VERSION } from '../core/saveVersion';
import { generateIsland } from '../world/generate';
import { rollEquipment } from './equipmentSystem';
import { SaveError } from './saveError';

export { SAVE_VERSION };
export { SaveError };
export const SAVE_KEY = 'robinson.save.v1';
export const BACKUP_KEY = 'robinson.save.v1.bak';

function fail(message: string): never {
  throw new SaveError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNumber(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail(`${name} 超出范围`);
  }
  return value;
}

function requireArray(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) fail(`${name} 必须是数组`);
  return value;
}

function requireObject(value: unknown, name: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`${name} 必须是对象`);
  return value;
}

function optionalNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Rebuilds a far larger world around a v1 save: keeps the character, time,
 * inventory and camp level, drops world-space data that no longer has a place
 * (node states) and pulls buildings/labourers within 320px of the new camp.
 */
export function migrateV1(old: unknown): GameState {
  const data = requireObject(old, '存档');
  if (data.version !== 1) fail('不是 v1 存档');

  const oldWorld = isRecord(data.world) ? data.world : {};
  const seed = optionalNumber(oldWorld.seed, optionalNumber(data.rngState, Date.now()));
  const island = generateIsland(seed);
  const state = createNewGame(seed);

  state.savedAt = optionalNumber(data.savedAt, Date.now());
  state.playtimeSec = optionalNumber(data.playtimeSec, 0);
  state.rngState = optionalNumber(data.rngState, seed);
  state.scene = data.scene === 'dungeon' ? 'dungeon' : 'island';
  state.dungeonFloor =
    data.dungeonFloor === 1 || data.dungeonFloor === 2 || data.dungeonFloor === 3
      ? data.dungeonFloor
      : null;

  if (isRecord(data.time)) {
    state.time = {
      day: Math.max(1, Math.floor(optionalNumber(data.time.day, 1))),
      clockMin: clampNumber(optionalNumber(data.time.clockMin, 360), 0, 1440),
      phase: data.time.phase === 'night' ? 'night' : 'day',
    };
  }

  if (isRecord(data.player)) {
    const player = data.player;
    const facing = player.facing;
    state.player = {
      ...state.player,
      x: island.spawn.x,
      y: island.spawn.y,
      hp: clampNumber(optionalNumber(player.hp, 100), 0, 100),
      hunger: clampNumber(optionalNumber(player.hunger, 100), 0, 100),
      thirst: clampNumber(optionalNumber(player.thirst, 100), 0, 100),
      energy: clampNumber(optionalNumber(player.energy, 100), 0, 100),
      facing:
        facing === 'up' || facing === 'down' || facing === 'left' || facing === 'right'
          ? facing
          : 'down',
      dead: player.dead === true,
      healing: null,
    };
  }

  if (Array.isArray(data.inventory)) {
    state.inventory = data.inventory.filter(
      (item): item is GameState['inventory'][number] =>
        isRecord(item) && typeof item.baseId === 'string' && optionalNumber(item.count, 0) > 0,
    );
  }
  if (Array.isArray(data.hotbar) && data.hotbar.length === 8) {
    state.hotbar = data.hotbar.map((entry) =>
      typeof entry === 'string' ? entry : null,
    );
  }
  if (isRecord(data.equipment)) {
    state.equipment = {
      weapon: typeof data.equipment.weapon === 'string' ? data.equipment.weapon : null,
      armor: typeof data.equipment.armor === 'string' ? data.equipment.armor : null,
      boots: typeof data.equipment.boots === 'string' ? data.equipment.boots : null,
    };
  }
  if (Array.isArray(data.equipmentInstances)) {
    state.equipmentInstances = data.equipmentInstances.filter(
      (item): item is GameState['equipmentInstances'][number] =>
        isRecord(item) && typeof item.instanceId === 'string',
    );
  }
  const instanceIds = new Set(state.equipmentInstances.map((item) => item.instanceId));
  for (const slot of ['weapon', 'armor', 'boots'] as const) {
    if (state.equipment[slot] && !instanceIds.has(state.equipment[slot]!)) {
      state.equipment[slot] = null;
    }
  }

  state.world.hash = island.hash;
  state.world.seed = seed;
  state.world.wreckSpawn = { x: island.spawn.x, y: island.spawn.y };
  state.world.nodeStates = {};
  state.world.nodes = {};
  state.world.groundLoot = Array.isArray(oldWorld.groundLoot)
    ? oldWorld.groundLoot.filter(
        (item): item is GameState['world']['groundLoot'][number] =>
          isRecord(item) && typeof item.baseId === 'string' && optionalNumber(item.count, 0) > 0,
      )
    : [];
  state.world.uniqueLoot = Array.isArray(oldWorld.uniqueLoot)
    ? oldWorld.uniqueLoot.filter((id): id is string => typeof id === 'string')
    : [];

  const campCenter = {
    x: Math.floor(island.campCenter.x / 16),
    y: Math.floor(island.campCenter.y / 16),
  };
  const oldCamp = isRecord(data.camp) && isRecord(data.camp.center) ? data.camp.center : null;
  state.camp = {
    level: clampNumber(Math.floor(optionalNumber(isRecord(data.camp) ? data.camp.level : 0, 0)), 0, 3) as
      | 0
      | 1
      | 2
      | 3,
    center: campCenter,
  };

  if (Array.isArray(data.buildings)) {
    for (const raw of data.buildings) {
      if (!isRecord(raw) || typeof raw.type !== 'string') continue;
      const oldX = optionalNumber(raw.x, campCenter.x);
      const oldY = optionalNumber(raw.y, campCenter.y);
      const relX = clampNumber(oldX - optionalNumber(oldCamp?.x, campCenter.x), -8, 8);
      const relY = clampNumber(oldY - optionalNumber(oldCamp?.y, campCenter.y), -8, 8);
      state.buildings.push({
        ...(raw as unknown as GameState['buildings'][number]),
        id: typeof raw.id === 'string' ? raw.id : `migrated_building_${state.buildings.length}`,
        x: campCenter.x + Math.round(relX),
        y: campCenter.y + Math.round(relY),
        hp: clampNumber(optionalNumber(raw.hp, 100), 0, 1000),
      });
    }
  }

  if (Array.isArray(data.laborers)) {
    const campPx = { x: campCenter.x * 16 + 8, y: campCenter.y * 16 + 16 };
    for (const raw of data.laborers) {
      if (!isRecord(raw)) continue;
      const relX = clampNumber(optionalNumber(raw.x, campPx.x) - campPx.x, -320, 320);
      const relY = clampNumber(optionalNumber(raw.y, campPx.y) - campPx.y, -320, 320);
      state.laborers.push({
        ...(raw as unknown as GameState['laborers'][number]),
        id: typeof raw.id === 'string' ? raw.id : `migrated_laborer_${state.laborers.length}`,
        name: typeof raw.name === 'string' ? raw.name : '劳工',
        x: campPx.x + relX,
        y: campPx.y + relY,
        loyalty: clampNumber(Math.floor(optionalNumber(raw.loyalty, 1)), 0, 3) as 0 | 1 | 2 | 3,
        task: null,
        carrying: 0,
        carryingType: null,
      });
    }
  }

  if (isRecord(data.dungeon)) {
    state.dungeon = {
      ...state.dungeon,
      ...(data.dungeon as unknown as GameState['dungeon']),
    };
  }
  if (isRecord(data.flags)) {
    state.flags = { ...state.flags, ...(data.flags as unknown as GameState['flags']) };
  }

  return state;
}

export function serializeSave(state: GameState): string {
  return JSON.stringify(state);
}

const LEGACY_WEAPONS = new Set(['club', 'spear']);

/** Fills v3 fields and turns old club/spear stacks into common equipment instances. */
export function upgradeToV3(state: GameState): GameState {
  state.version = SAVE_VERSION;
  if (!state.settings) state.settings = { muted: false, sfxVolume: 0.7, hudCompact: false };
  state.lootSeed = typeof state.lootSeed === 'number' ? state.lootSeed : (state.world?.seed ?? Date.now());
  state.lootRolls = typeof state.lootRolls === 'number' ? state.lootRolls : 0;
  state.bootWear = typeof state.bootWear === 'number' ? state.bootWear : 0;
  state.dungeon.pendingReset = state.dungeon.pendingReset === true;
  state.dungeon.resetDay = typeof state.dungeon.resetDay === 'number' ? state.dungeon.resetDay : 1;
  if (!state.world.wreckEntrance) {
    state.world.wreckEntrance = { ...state.world.wreckSpawn };
  }

  for (const stack of [...state.inventory]) {
    if (!LEGACY_WEAPONS.has(stack.baseId)) continue;
    for (let i = 0; i < stack.count; i++) {
      state.lootRolls += 1;
      const instance = rollEquipment(
        createRng(state.lootSeed + state.lootRolls * 7919),
        stack.baseId,
        'common',
        `eq_${state.lootRolls}`,
      );
      if (!instance) continue;
      if (stack.durability !== undefined) {
        instance.durability = Math.min(instance.maxDurability, stack.durability);
      }
      state.equipmentInstances.push(instance);
    }
    state.inventory = state.inventory.filter((item) => item !== stack);
  }
  state.hotbar = state.hotbar.map((id) =>
    id && LEGACY_WEAPONS.has(id) ? null : id,
  );
  return state;
}

/**
 * v4: resource nodes are laid out on a denser grid, the tutorial starts with the
 * camp flag, and animals plus the HUD setting are new state.
 */
export function upgradeToV4(state: GameState): GameState {
  state.version = SAVE_VERSION;
  state.world.nodeStates = {};
  state.flags.tutorialStep = (state.flags.tutorialStep ?? 0) + 1;
  state.animals = Array.isArray(state.animals) ? state.animals : [];
  state.settings.hudCompact = state.settings.hudCompact === true;
  if (!state.buildings.some((b) => b.type === 'flag')) {
    state.buildings.push({
      id: 'b_flag_migrated',
      type: 'flag',
      x: state.camp.center.x,
      y: state.camp.center.y,
      hp: 999,
    });
  }
  return state;
}

export function validateSave(data: unknown): GameState {
  if (!isRecord(data)) fail('存档不是对象');
  if (data.version === 1) return upgradeToV4(upgradeToV3(migrateV1(data)));
  if (data.version === 2) return upgradeToV4(upgradeToV3(validateCore(data)));
  if (data.version === 3) return upgradeToV4(validateCore(data));
  if (data.version !== SAVE_VERSION) fail('存档版本不兼容');

  const state = validateCore(data);
  if (!Array.isArray(state.animals)) state.animals = [];
  const settings = requireObject(state.settings, 'settings');
  if (typeof settings.muted !== 'boolean') fail('settings.muted 必须是布尔值');
  requireNumber(settings.sfxVolume, 'settings.sfxVolume', 0, 1);
  if (settings.hudCompact === undefined) settings.hudCompact = false;
  if (typeof settings.hudCompact !== 'boolean') fail('settings.hudCompact 必须是布尔值');
  requireNumber(state.lootSeed, 'lootSeed', 0, Number.MAX_SAFE_INTEGER);
  requireNumber(state.lootRolls, 'lootRolls', 0, Number.MAX_SAFE_INTEGER);
  requireNumber(state.bootWear, 'bootWear', 0, 1_000_000);
  if (typeof state.dungeon.pendingReset !== 'boolean') fail('dungeon.pendingReset 必须是布尔值');
  return state;
}

function validateCore(data: Record<string, unknown>): GameState {
  requireNumber(data.savedAt, 'savedAt', 0, Number.MAX_SAFE_INTEGER);
  requireNumber(data.playtimeSec, 'playtimeSec', 0, Number.MAX_SAFE_INTEGER);
  requireNumber(data.rngState, 'rngState', 0, Number.MAX_SAFE_INTEGER);
  if (data.scene !== 'island' && data.scene !== 'dungeon') fail('scene 无效');

  const time = requireObject(data.time, 'time');
  requireNumber(time.day, 'time.day', 1, Number.MAX_SAFE_INTEGER);
  requireNumber(time.clockMin, 'time.clockMin', 0, 1440);
  if (time.phase !== 'day' && time.phase !== 'night') fail('time.phase 无效');

  const player = requireObject(data.player, 'player');
  requireNumber(player.x, 'player.x', 0, 1_000_000);
  requireNumber(player.y, 'player.y', 0, 1_000_000);
  requireNumber(player.hp, 'player.hp', 0, 100);
  requireNumber(player.hunger, 'player.hunger', 0, 100);
  requireNumber(player.thirst, 'player.thirst', 0, 100);
  requireNumber(player.energy, 'player.energy', 0, 1000);

  requireArray(data.inventory, 'inventory');
  const hotbar = requireArray(data.hotbar, 'hotbar');
  if (hotbar.length !== 8) fail('hotbar 长度必须是 8');
  requireNumber(data.hotbarIndex, 'hotbarIndex', 0, 7);

  const equipment = requireObject(data.equipment, 'equipment');
  const instances = requireArray(data.equipmentInstances, 'equipmentInstances');
  const instanceIds = new Set<string>();
  for (const instance of instances) {
    const record = requireObject(instance, 'equipmentInstances[]');
    if (typeof record.instanceId !== 'string') fail('装备缺少 instanceId');
    instanceIds.add(record.instanceId);
  }
  for (const slot of ['weapon', 'armor', 'boots'] as const) {
    const value = equipment[slot];
    if (value === null) continue;
    if (typeof value !== 'string' || !instanceIds.has(value)) {
      fail(`装备槽 ${slot} 引用了不存在的实例`);
    }
  }

  const world = requireObject(data.world, 'world');
  requireNumber(world.seed, 'world.seed', 0, Number.MAX_SAFE_INTEGER);
  requireNumber(world.hash, 'world.hash', 0, Number.MAX_SAFE_INTEGER);
  if (typeof world.explored !== 'string') fail('world.explored 必须是字符串');
  try {
    decodeExplored(world.explored);
  } catch {
    fail('world.explored 数据损坏');
  }
  requireArray(world.discovered, 'world.discovered');
  if (world.waypoint !== null) {
    const waypoint = requireObject(world.waypoint, 'world.waypoint');
    requireNumber(waypoint.x, 'world.waypoint.x', 0, 1_000_000);
    requireNumber(waypoint.y, 'world.waypoint.y', 0, 1_000_000);
  }
  requireObject(world.nodeStates, 'world.nodeStates');
  requireObject(world.nodes, 'world.nodes');
  requireArray(world.uniqueLoot, 'world.uniqueLoot');
  requireObject(world.wreckSpawn, 'world.wreckSpawn');
  requireObject(world.wreckEntrance, 'world.wreckEntrance');
  requireArray(world.groundLoot, 'world.groundLoot');

  const camp = requireObject(data.camp, 'camp');
  requireNumber(camp.level, 'camp.level', 0, 3);
  const campCenter = requireObject(camp.center, 'camp.center');
  requireNumber(campCenter.x, 'camp.center.x', 0, 10_000);
  requireNumber(campCenter.y, 'camp.center.y', 0, 10_000);

  requireArray(data.buildings, 'buildings');
  requireArray(data.laborers, 'laborers');
  requireArray(data.savages, 'savages');
  requireObject(data.dungeon, 'dungeon');
  requireObject(data.flags, 'flags');

  if (data.raid !== null) {
    const raid = requireObject(data.raid, 'raid');
    requireNumber(raid.day, 'raid.day', 1, Number.MAX_SAFE_INTEGER);
  }

  return data as unknown as GameState;
}

function readSlot(storage: Storage, key: string): GameState | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return validateSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, storage: Storage = localStorage): void {
  const existing = storage.getItem(SAVE_KEY);
  if (existing) {
    storage.setItem(BACKUP_KEY, existing);
  }
  const snapshot: GameState = { ...state, savedAt: Date.now() };
  storage.setItem(SAVE_KEY, serializeSave(snapshot));
  state.savedAt = snapshot.savedAt;
}

export function loadGame(storage: Storage = localStorage): GameState | null {
  return loadGameResult(storage).state;
}

export interface LoadResult {
  state: GameState | null;
  source: 'main' | 'backup' | 'none';
}

export function loadGameResult(storage: Storage = localStorage): LoadResult {
  const main = readSlot(storage, SAVE_KEY);
  if (main) return { state: main, source: 'main' };
  const backup = readSlot(storage, BACKUP_KEY);
  if (backup) return { state: backup, source: 'backup' };
  return { state: null, source: 'none' };
}

export function exportSaveJson(state: GameState): string {
  return serializeSave(state);
}

export function importSave(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    fail('存档不是合法 JSON');
  }
  return validateSave(parsed);
}

export function exportSave(state: GameState): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([exportSaveJson(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `robinson-save-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function canManualSave(state: GameState): boolean {
  return !state.raid?.active;
}
