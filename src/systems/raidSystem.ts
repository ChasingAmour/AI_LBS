import type { GameState } from '../core/gameState';
import { WORLD } from '../core/config';
import { createSavage, type SavageState } from '../entities/savage';
import { damageBuilding, getStorage } from './buildingSystem';
import { applyDamage } from './needsSystem';

export interface RaidDawnResult {
  foodLost: number;
  damagedBuildingId?: string;
}

const SAVAGE_COUNT_BY_LEVEL = [2, 2, 3, 4];
const FOOD_PRIORITY = ['dried_fish', 'cooked_fish', 'coconut', 'berries', 'raw_fish'];
const DESTRUCTIBLE = ['fence', 'stone_wall', 'storage', 'drying_rack'];

/** Raiders come ashore 10 tiles east and 6 south of the camp, inside the world. */
function raidLanding(state: GameState): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(WORLD.widthPx - 1, state.camp.center.x * 16 + 8 + 160)),
    y: Math.max(0, Math.min(WORLD.heightPx - 1, state.camp.center.y * 16 + 16 + 96)),
  };
}

export function savageCountForLevel(level: number): number {
  return SAVAGE_COUNT_BY_LEVEL[level] ?? 2;
}

export function spawnRaid(state: GameState): SavageState[] {
  const count = savageCountForLevel(state.camp.level);
  const landing = raidLanding(state);
  state.savages = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    state.savages.push(
      createSavage(
        `savage_${state.time.day}_${i + 1}`,
        landing.x + Math.cos(angle) * 28,
        landing.y + Math.sin(angle) * 28,
      ),
    );
  }
  state.raid = { active: true, day: state.time.day };
  return state.savages;
}

export function updateSavageAi(state: GameState, savage: SavageState, dtSec: number): void {
  if (savage.mode === 'dead' || savage.mode === 'stunned') return;

  const wall = state.buildings.find(
    (b) =>
      (b.type === 'fence' || b.type === 'stone_wall') &&
      Math.hypot(b.x * 16 + 8 - savage.x, b.y * 16 + 8 - savage.y) < 20,
  );
  if (wall) {
    savage.attackCooldown = (savage.attackCooldown ?? 0) - dtSec;
    if (savage.attackCooldown <= 0) {
      damageBuilding(state, wall.id, 20);
      savage.attackCooldown = 1;
    }
    return;
  }

  const dx = state.player.x - savage.x;
  const dy = state.player.y - savage.y;
  const distance = Math.hypot(dx, dy) || 1;
  if (distance > 20) {
    const speed = 40;
    savage.x += (dx / distance) * speed * dtSec;
    savage.y += (dy / distance) * speed * dtSec;
    return;
  }

  savage.attackCooldown = (savage.attackCooldown ?? 0) - dtSec;
  if (savage.attackCooldown <= 0) {
    applyDamage(state, 8, { kind: 'savage', id: savage.id });
    savage.attackCooldown = 1;
  }
}

export function resolveRaidDawnWith(state: GameState, survivorCount: number): RaidDawnResult {
  let needed = survivorCount * 5;
  let foodLost = 0;
  const storage = getStorage(state);

  if (storage?.storage) {
    for (const baseId of FOOD_PRIORITY) {
      while (needed > 0) {
        const index = storage.storage.findIndex((item) => item.baseId === baseId && item.count > 0);
        if (index < 0) break;
        const stack = storage.storage[index];
        const taken = Math.min(stack.count, needed);
        stack.count -= taken;
        needed -= taken;
        foodLost += taken;
        if (stack.count <= 0) storage.storage.splice(index, 1);
      }
    }
  }

  let damagedBuildingId: string | undefined;
  if (needed > 0) {
    const target = state.buildings.find((b) => DESTRUCTIBLE.includes(b.type));
    if (target) {
      damageBuilding(state, target.id, 30);
      damagedBuildingId = target.id;
    }
  }

  return { foodLost, damagedBuildingId };
}

export function resolveRaidDawn(state: GameState): RaidDawnResult {
  const survivors = state.savages.filter((savage) => savage.mode !== 'dead').length;
  const result = resolveRaidDawnWith(state, survivors);
  state.savages = [];
  state.raid = null;
  state.flags.firstRaidDone = true;
  return result;
}
