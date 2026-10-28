import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';
import { ITEMS } from '../data/items';
import { damageEquipped, deriveStats } from './statsSystem';

export interface DamageSource {
  kind: 'savage' | 'dungeon';
  id: string;
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function tickNeeds(state: GameState, dtSec: number): void {
  if (dtSec <= 0 || state.player.dead) return;
  const p = state.player;
  const stats = deriveStats(state);
  p.hunger = clamp100(p.hunger - 0.05 * stats.hungerMul * dtSec);
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
  const effect = ITEMS[baseId]?.food;
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

export function applyDamage(state: GameState, amount: number, attacker?: DamageSource): void {
  if (amount <= 0) return;
  const stats = deriveStats(state);
  const reduced = Math.max(1, amount - stats.defense);
  state.player.hp = clamp100(state.player.hp - reduced);
  damageEquipped(state, 'armor', 1);
  if (attacker?.kind === 'savage' && stats.thorns > 0) {
    const savage = state.savages.find((entry) => entry.id === attacker.id);
    if (savage && savage.mode !== 'dead') {
      savage.hp = Math.max(0, savage.hp - stats.thorns);
      if (savage.hp <= 0) savage.mode = 'dead';
    }
  }
  if (state.player.hp <= 0) state.player.dead = true;
}

export function spendEnergy(state: GameState, amount: number): boolean {
  if (state.player.energy < amount) return false;
  const max = deriveStats(state).energyMax;
  state.player.energy = Math.max(0, Math.min(max, state.player.energy - amount));
  return true;
}

/** Idle recovery: 1.5 energy per second while standing still. */
export const IDLE_ENERGY_PER_SEC = 1.5;

export function tickEnergyRegen(state: GameState, dtSec: number, idle: boolean): void {
  if (!idle || dtSec <= 0 || state.player.dead) return;
  const max = deriveStats(state).energyMax;
  state.player.energy = Math.max(0, Math.min(max, state.player.energy + IDLE_ENERGY_PER_SEC * dtSec));
}

export function applySleepRecovery(state: GameState): void {
  state.player.energy = deriveStats(state).energyMax;
  state.player.hp = clamp100(state.player.hp + 20);
}

export function respawnAfterDeath(state: GameState, bus: EventBus): void {
  state.inventory = [];
  state.hotbar = state.hotbar.map(() => null);
  // Death always returns the player to the island, even when it happens in the wreck.
  state.scene = 'island';
  state.dungeonFloor = null;
  const p = state.player;
  p.hp = 50;
  p.hunger = 50;
  p.thirst = 50;
  p.energy = deriveStats(state).energyMax;
  p.dead = false;
  p.healing = null;
  const respawn = state.buildings.find((b) => b.type === 'tent')
    ?? state.buildings.find((b) => b.type === 'campfire');
  if (respawn) {
    p.x = respawn.x * 16 + 8;
    p.y = respawn.y * 16 + 16;
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
