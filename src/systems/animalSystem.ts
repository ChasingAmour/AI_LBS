import type { GameState } from '../core/gameState';
import type { Rng } from '../core/rng';
import type { AnimalState } from '../entities/animal';
import { createAnimal } from '../entities/animal';
import { ANIMALS, ANIMAL_SPAWN } from '../data/animals';
import type { WeaponDef } from '../data/weapons';
import type { CombatMods } from './combatSystem';
import { addItem } from './inventorySystem';
import { applyDamage } from './needsSystem';

export interface AnimalWorld {
  tileAt(tileX: number, tileY: number): number;
}

const BITE_RANGE = 20;
const TILE = 16;

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function aliveCount(state: GameState, size: 'small' | 'large'): number {
  return state.animals.filter((a) => a.mode !== 'dead' && ANIMALS[a.type]?.size === size).length;
}

function pickSpecies(size: 'small' | 'large', roll: number): string {
  const ids = Object.keys(ANIMALS).filter((id) => ANIMALS[id].size === size);
  return ids[Math.min(ids.length - 1, Math.floor(roll * ids.length))];
}

/** Tops the local population back up to the caps, spawning in a ring around the player. */
export function spawnAnimals(state: GameState, world: AnimalWorld, rng: Rng): AnimalState[] {
  const spawned: AnimalState[] = [];
  const day = state.time.day;
  const groups: Array<{ size: 'small' | 'large'; cap: number }> = [
    { size: 'small', cap: ANIMAL_SPAWN.smallCap },
    { size: 'large', cap: ANIMAL_SPAWN.largeCap },
  ];
  for (const group of groups) {
    let missing = group.cap - aliveCount(state, group.size);
    let attempt = 0;
    while (missing > 0 && attempt < 40) {
      attempt += 1;
      const angle = rng.next() * Math.PI * 2;
      const dist = ANIMAL_SPAWN.minDist + rng.next() * (ANIMAL_SPAWN.maxDist - ANIMAL_SPAWN.minDist);
      const x = state.player.x + Math.cos(angle) * dist;
      const y = state.player.y + Math.sin(angle) * dist;
      const species = pickSpecies(group.size, rng.next());
      const def = ANIMALS[species];
      if (!def.habitat.includes(world.tileAt(Math.floor(x / TILE), Math.floor(y / TILE)))) continue;
      const animal = createAnimal(`animal_${species}_${day}_${state.animals.length}`, species, x, y);
      state.animals.push(animal);
      spawned.push(animal);
      missing -= 1;
    }
  }
  return spawned;
}

/** Wander, or chase and bite the player once provoked. Never attacks unprovoked. */
export function updateAnimalAi(
  state: GameState,
  animal: AnimalState,
  dtSec: number,
  world: AnimalWorld,
): void {
  if (animal.mode === 'dead') return;
  const def = ANIMALS[animal.type];
  if (!def) return;

  if (animal.mode === 'wander') {
    animal.wanderTimer -= dtSec;
    if (animal.wanderTimer <= 0) {
      animal.wanderDir = (animal.wanderDir + 1.9 + (animal.x % 7) / 7) % (Math.PI * 2);
      animal.wanderTimer = 2 + (animal.y % 3);
    }
    const nx = animal.x + Math.cos(animal.wanderDir) * def.wanderSpeed * dtSec;
    const ny = animal.y + Math.sin(animal.wanderDir) * def.wanderSpeed * dtSec;
    if (def.habitat.includes(world.tileAt(Math.floor(nx / TILE), Math.floor(ny / TILE)))) {
      animal.x = nx;
      animal.y = ny;
    } else {
      animal.wanderDir = (animal.wanderDir + Math.PI) % (Math.PI * 2);
    }
    return;
  }

  const dx = state.player.x - animal.x;
  const dy = state.player.y - animal.y;
  const dist = distance(animal.x, animal.y, state.player.x, state.player.y) || 1;

  if (dist > def.leashRange) {
    animal.disengageTimer += dtSec;
    if (animal.disengageTimer >= def.disengageSec) {
      animal.mode = 'wander';
      animal.disengageTimer = 0;
      animal.wanderTimer = 0;
    }
    return;
  }

  animal.disengageTimer = 0;
  if (dist > BITE_RANGE) {
    animal.x += (dx / dist) * def.chaseSpeed * dtSec;
    animal.y += (dy / dist) * def.chaseSpeed * dtSec;
    return;
  }

  animal.cooldown -= dtSec;
  if (animal.cooldown <= 0) {
    applyDamage(state, def.damage, { kind: 'savage', id: animal.id });
    animal.cooldown = def.attackCooldownSec;
  }
}

/** Night clears the island; animals far from the player wander off. */
export function pruneAnimals(state: GameState, nowClockMin: number): void {
  if (nowClockMin >= 1200 || nowClockMin < 360) {
    state.animals = [];
    return;
  }
  state.animals = state.animals.filter(
    (animal) =>
      distance(animal.x, animal.y, state.player.x, state.player.y) <= ANIMAL_SPAWN.despawnDist,
  );
}

/** Player hit routing: provoke on the first hit, drop meat on the last. */
export function applyHitToAnimal(
  state: GameState,
  animal: AnimalState,
  weapon: WeaponDef,
  rng: Rng,
  mods: CombatMods = {},
): 'hit' | 'dead' {
  if (animal.mode === 'dead') return 'dead';
  const def = ANIMALS[animal.type];
  const raw = (weapon.damage + (mods.attack ?? 0)) * (mods.savageMul ?? 1);
  animal.hp -= Math.max(1, Math.round(raw));
  animal.disengageTimer = 0;
  animal.mode = 'retaliate';
  if (animal.hp > 0) return 'hit';

  animal.hp = 0;
  animal.mode = 'dead';
  if (!def) return 'dead';
  for (const drop of def.drops) {
    const count = rng.int(drop.min, drop.max);
    if (count <= 0) continue;
    const { leftover } = addItem(state, drop.baseId, count);
    if (leftover > 0) {
      state.world.groundLoot.push({ baseId: drop.baseId, count: leftover, x: animal.x, y: animal.y });
    }
  }
  return 'dead';
}
