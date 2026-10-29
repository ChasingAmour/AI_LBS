import type { BuildingInstance, GameState, ItemStack } from '../core/gameState';
import type { Rng } from '../core/rng';
import { cropDef } from '../data/farming';
import { countItem, removeItem } from './inventorySystem';

type Crop = NonNullable<BuildingInstance['crop']>;

const WATERSKIN = 'waterskin';

function farm(state: GameState, buildingId: string): BuildingInstance | null {
  return state.buildings.find((b) => b.id === buildingId && b.type === 'farm_plot') ?? null;
}

export function plantCrop(state: GameState, buildingId: string, seedId: string): boolean {
  const plot = farm(state, buildingId);
  const def = cropDef(seedId);
  if (!plot || plot.crop || !def) return false;
  if (countItem(state, seedId) <= 0) return false;
  removeItem(state, seedId, 1);
  plot.crop = {
    seedId,
    growth: 0,
    wateredDay: -1,
    plantedDay: state.time.day,
  };
  return true;
}

export function cropStage(crop: Crop): 0 | 1 | 2 | 3 {
  const def = cropDef(crop.seedId);
  if (!def) return 1;
  if (crop.growth >= def.growPoints) return 3;
  if (crop.growth >= def.growPoints / 2) return 2;
  return 1;
}

export function waterCrop(state: GameState, buildingId: string): boolean {
  const plot = farm(state, buildingId);
  if (!plot?.crop) return false;
  if (plot.crop.wateredDay === state.time.day) return false;
  const skin = state.inventory.find(
    (item) => item.baseId === WATERSKIN && (item.durability ?? 0) > 0,
  );
  if (!skin) return false;
  skin.durability = Math.max(0, (skin.durability ?? 0) - 1);
  plot.crop.wateredDay = state.time.day;
  return true;
}

/** Called on every day change: watered crops gain 2, dry crops gain 1. */
export function tickFarms(state: GameState, previousDay: number): void {
  for (const building of state.buildings) {
    if (building.type !== 'farm_plot' || !building.crop) continue;
    const def = cropDef(building.crop.seedId);
    if (!def || building.crop.growth >= def.growPoints) continue;
    const watered = building.crop.wateredDay === previousDay;
    building.crop.growth = Math.min(def.growPoints, building.crop.growth + (watered ? 2 : 1));
  }
}

export function harvestCrop(state: GameState, buildingId: string, rng: Rng): ItemStack[] | null {
  const plot = farm(state, buildingId);
  if (!plot?.crop) return null;
  const def = cropDef(plot.crop.seedId);
  if (!def || cropStage(plot.crop) < 3) return null;
  plot.crop = undefined;
  return [{ baseId: def.yield.baseId, count: rng.int(def.yield.min, def.yield.max) }];
}

/** Refills the first waterskin that is not full. */
export function fillWaterskin(state: GameState): boolean {
  const skin = state.inventory.find(
    (item) => item.baseId === WATERSKIN && (item.durability ?? 0) < 3,
  );
  if (!skin) return false;
  skin.durability = 3;
  return true;
}
