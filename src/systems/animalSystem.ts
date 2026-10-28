import type { GameState } from '../core/gameState';
import type { Rng } from '../core/rng';
import type { AnimalState } from '../entities/animal';
import { createAnimal } from '../entities/animal';
import { ANIMALS, ANIMAL_SPAWN } from '../data/animals';
import type { WeaponDef } from '../data/weapons';
import type { CombatMods } from './combatSystem';
import { addItem } from './inventorySystem';
import { applyDamage } from './needsSystem';
import { hash2D } from '../core/noise';

export interface AnimalWorld {
  tileAt(tileX: number, tileY: number): number;
}

const BITE_RANGE = 20;
const TILE = 16;

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function pickSpecies(size: 'small' | 'large', roll: number): string {
  const ids = Object.keys(ANIMALS).filter((id) => ANIMALS[id].size === size);
  return ids[Math.min(ids.length - 1, Math.floor(roll * ids.length))];
}

/** Slot-stable spawn point: same day, slot and seed always give the same spot. */
function slotSpawn(
  state: GameState,
  size: 'small' | 'large',
  slot: number,
): { id: string; species: string; x: number; y: number } {
  const seed = state.world.seed;
  const day = state.time.day;
  const angle = hash2D(day, slot, seed + 1201) * Math.PI * 2;
  const spread = ANIMAL_SPAWN.minDist + hash2D(day, slot, seed + 1202) * (ANIMAL_SPAWN.maxDist - ANIMAL_SPAWN.minDist);
  const species = pickSpecies(size, hash2D(day, slot, seed + 1203));
  return {
    id: `animal_${species}_${day}_s${slot}`,
    species,
    x: state.player.x + Math.cos(angle) * spread,
    y: state.player.y + Math.sin(angle) * spread,
  };
}

/** Tops the local population back up to the caps using stable per-slot positions. */
export function spawnAnimals(state: GameState, world: AnimalWorld, rng: Rng): AnimalState[] {
  void rng;
  const spawned: AnimalState[] = [];
  const dayTag = `_${state.time.day}_s`;
  // Yesterday's wildlife leaves at dawn instead of piling up.
  state.animals = state.animals.filter((animal) => animal.id.includes(dayTag));
  const occupied = new Set(state.animals.map((a) => a.id));
  const groups: Array<{ size: 'small' | 'large'; cap: number; offset: number }> = [
    { size: 'small', cap: ANIMAL_SPAWN.smallCap, offset: 0 },
    { size: 'large', cap: ANIMAL_SPAWN.largeCap, offset: 100 },
  ];
  for (const group of groups) {
    for (let i = 0; i < group.cap; i++) {
      const slot = group.offset + i;
      const spot = slotSpawn(state, group.size, slot);
      if (occupied.has(spot.id)) continue;
      const def = ANIMALS[spot.species];
      if (!def.habitat.includes(world.tileAt(Math.floor(spot.x / TILE), Math.floor(spot.y / TILE)))) {
        continue;
      }
      const animal = createAnimal(spot.id, spot.species, spot.x, spot.y);
      state.animals.push(animal);
      occupied.add(spot.id);
      spawned.push(animal);
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
  paused = false,
): void {
  if (animal.mode === 'dead' || paused) return;
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
