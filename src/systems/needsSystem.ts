import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';

interface FoodEffect {
  hunger?: number;
  thirst?: number;
  healOverSec?: number;
  heal?: number;
}

export const FOOD_EFFECTS: Record<string, FoodEffect> = {
  coconut: { hunger: 10, thirst: 15 },
  berries: { hunger: 8 },
  cooked_fish: { hunger: 35 },
  dried_fish: { hunger: 25 },
  bandage: { healOverSec: 8, heal: 30 },
};

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function tickNeeds(state: GameState, dtSec: number): void {
  if (dtSec <= 0 || state.player.dead) return;
  const p = state.player;
  p.hunger = clamp100(p.hunger - 0.05 * dtSec);
  p.thirst = clamp100(p.thirst - 0.08 * dtSec);
  if (p.hunger <= 0 || p.thirst <= 0) {
    p.hp = clamp100(p.hp - 0.5 * dtSec);
  }
  if (p.healing) {
    const used = Math.min(dtSec, p.healing.timeLeft);
    p.hp = clamp100(p.hp + p.healing.perSecond * used);
    p.healing.timeLeft -= used;
    if (p.healing.timeLeft <= 0) p.healing = null;
  }
  if (p.hp <= 0) p.dead = true;
}

export function consumeFood(state: GameState, baseId: string): boolean {
  const effect = FOOD_EFFECTS[baseId];
  if (!effect) return false;
  const index = state.inventory.findIndex((i) => i.baseId === baseId && i.count > 0);
  if (index < 0) return false;
  const stack = state.inventory[index];
  stack.count -= 1;
  if (stack.count <= 0) state.inventory.splice(index, 1);
  const p = state.player;
  if (effect.hunger) p.hunger = clamp100(p.hunger + effect.hunger);
  if (effect.thirst) p.thirst = clamp100(p.thirst + effect.thirst);
  if (effect.healOverSec && effect.heal) {
    p.healing = { timeLeft: effect.healOverSec, perSecond: effect.heal / effect.healOverSec };
  }
  return true;
}

export function drinkFreshWater(state: GameState): void {
  state.player.thirst = clamp100(state.player.thirst + 40);
}

export function applyDamage(state: GameState, amount: number): void {
  state.player.hp = clamp100(state.player.hp - Math.max(0, amount));
  if (state.player.hp <= 0) state.player.dead = true;
}

export function spendEnergy(state: GameState, amount: number): boolean {
  if (state.player.energy < amount) return false;
  state.player.energy = clamp100(state.player.energy - amount);
  return true;
}

export function applySleepRecovery(state: GameState): void {
  state.player.energy = 100;
  state.player.hp = clamp100(state.player.hp + 20);
}

export function respawnAfterDeath(state: GameState, bus: EventBus): void {
  state.inventory = [];
  state.hotbar = state.hotbar.map(() => null);
  const p = state.player;
  p.hp = 50;
  p.hunger = 50;
  p.thirst = 50;
  p.energy = 100;
  p.dead = false;
  p.healing = null;
  const respawn = state.buildings.find((b) => b.type === 'tent')
    ?? state.buildings.find((b) => b.type === 'campfire');
  if (respawn) {
    p.x = respawn.x;
    p.y = respawn.y;
  } else {
    p.x = state.world.wreckSpawn.x;
    p.y = state.world.wreckSpawn.y;
  }
  state.time.day += 1;
  state.time.clockMin = 360;
  state.time.phase = 'day';
  bus.emit('time:dayChanged', { day: state.time.day });
  bus.emit('save:requested', { reason: 'death' });
}
