import type { BuildingInstance, GameState } from '../core/gameState';
import { CONFIG } from '../core/config';
import { BUILDINGS, type BuildingDef } from '../data/buildings';
import { addItem, countItem, removeItem } from './inventorySystem';

export { BUILDINGS } from '../data/buildings';

export interface PlacementWorld {
  isWater(tileX: number, tileY: number): boolean;
  hasNode(tileX: number, tileY: number): boolean;
  hasEnemy?(tileX: number, tileY: number): boolean;
}

export interface PlacementCheck {
  ok: boolean;
  reason?: string;
}

function nextBuildingId(state: GameState): string {
  let max = 0;
  for (const building of state.buildings) {
    const match = /^b_(\d+)$/.exec(building.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `b_${max + 1}`;
}

export function canPlace(
  state: GameState,
  type: string,
  tileX: number,
  tileY: number,
  world?: PlacementWorld,
): PlacementCheck {
  const def = BUILDINGS[type];
  if (!def) return { ok: false, reason: '未知建筑' };
  if (state.camp.level < def.unlockLevel) {
    return { ok: false, reason: `需要营地等级 ${def.unlockLevel}` };
  }
  const dx = tileX - state.camp.center.x;
  const dy = tileY - state.camp.center.y;
  if (Math.hypot(dx, dy) > CONFIG.campRadiusTiles) {
    return { ok: false, reason: '超出营地范围' };
  }
  if (state.buildings.some((b) => b.x === tileX && b.y === tileY)) {
    return { ok: false, reason: '这里已有建筑' };
  }
  if (world?.isWater(tileX, tileY)) return { ok: false, reason: '不能建在水上' };
  if (world?.hasNode(tileX, tileY)) return { ok: false, reason: '需要先清理资源' };
  if (world?.hasEnemy?.(tileX, tileY)) return { ok: false, reason: '敌人占据了这个位置' };
  for (const cost of def.cost) {
    if (countItem(state, cost.baseId) < cost.count) {
      return { ok: false, reason: `材料不足：${cost.baseId}` };
    }
  }
  return { ok: true };
}

export function placeBuilding(
  state: GameState,
  type: string,
  tileX: number,
  tileY: number,
  world?: PlacementWorld,
): BuildingInstance | null {
  if (!canPlace(state, type, tileX, tileY, world).ok) return null;
  const def = BUILDINGS[type];
  for (const cost of def.cost) {
    removeItem(state, cost.baseId, cost.count);
  }
  const building: BuildingInstance = {
    id: nextBuildingId(state),
    type,
    x: tileX,
    y: tileY,
    hp: def.hp,
  };
  if (type === 'storage') building.storage = [];
  state.buildings.push(building);
  return building;
}

export function refundFor(type: string): { baseId: string; count: number }[] {
  const def = BUILDINGS[type];
  if (!def) return [];
  return def.cost.map((cost) => ({ baseId: cost.baseId, count: Math.ceil(cost.count / 2) }));
}

export function demolishBuilding(state: GameState, id: string): void {
  const index = state.buildings.findIndex((b) => b.id === id);
  if (index < 0) return;
  const building = state.buildings[index];
  for (const refund of refundFor(building.type)) {
    addItem(state, refund.baseId, refund.count);
  }
  state.buildings.splice(index, 1);
}

export function damageBuilding(state: GameState, id: string, amount: number): void {
  const index = state.buildings.findIndex((b) => b.id === id);
  if (index < 0) return;
  const building = state.buildings[index];
  building.hp -= Math.max(0, amount);
  if (building.hp > 0) return;
  if (building.storage?.length) {
    state.world.groundLoot.push(
      ...building.storage.map((item) => ({
        ...item,
        x: building.x * 16 + 8,
        y: building.y * 16 + 16,
      })),
    );
  }
  state.buildings.splice(index, 1);
}

export function getStorage(state: GameState): BuildingInstance | null {
  return state.buildings.find((b) => b.type === 'storage') ?? null;
}

export function getBuildingDef(type: string): BuildingDef | null {
  return BUILDINGS[type] ?? null;
}

export function buildingsAt(state: GameState, tileX: number, tileY: number): BuildingInstance[] {
  return state.buildings.filter((b) => b.x === tileX && b.y === tileY);
}
