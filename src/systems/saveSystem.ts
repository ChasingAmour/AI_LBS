import type { GameState } from '../core/gameState';

export const SAVE_KEY = 'robinson.save.v1';
export const BACKUP_KEY = 'robinson.save.v1.bak';

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveError';
  }
}

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

export function serializeSave(state: GameState): string {
  return JSON.stringify(state);
}

export function validateSave(data: unknown): GameState {
  if (!isRecord(data)) fail('存档不是对象');
  if (data.version !== 1) fail('存档版本不兼容');

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
  requireNumber(player.energy, 'player.energy', 0, 100);

  requireArray(data.inventory, 'inventory');
  const hotbar = requireArray(data.hotbar, 'hotbar');
  if (hotbar.length !== 8) fail('hotbar 长度必须是 8');

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
  requireObject(world.nodeStates, 'world.nodeStates');
  requireObject(world.nodes, 'world.nodes');
  requireArray(world.uniqueLoot, 'world.uniqueLoot');
  requireObject(world.wreckSpawn, 'world.wreckSpawn');
  requireArray(world.groundLoot, 'world.groundLoot');

  const camp = requireObject(data.camp, 'camp');
  requireNumber(camp.level, 'camp.level', 0, 3);
  requireObject(camp.center, 'camp.center');

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
  return readSlot(storage, SAVE_KEY) ?? readSlot(storage, BACKUP_KEY);
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
