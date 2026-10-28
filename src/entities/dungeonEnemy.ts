import type { DungeonEnemyType, DungeonHazard } from '../world/dungeonGen';

export interface DungeonEnemy {
  id: string;
  type: DungeonEnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  defense: number;
  dead: boolean;
  attackCooldown: number;
  shellUntil: number;
  nextShellAt: number;
  lungeUntil: number;
  retreatUntil: number;
  nextLungeAt: number;
  slowUntil: number;
  poisonStacks: number;
  poisonUntil: number;
}

const DEFS: Record<DungeonEnemyType, { hp: number; damage: number; speed: number; defense: number }> = {
  crab: { hp: 15, damage: 5, speed: 45, defense: 0 },
  hermit: { hp: 80, damage: 12, speed: 30, defense: 2 },
  snake: { hp: 40, damage: 10, speed: 80, defense: 1 },
};

export function createDungeonEnemy(type: DungeonEnemyType, x: number, y: number, id: string): DungeonEnemy {
  const def = DEFS[type];
  return {
    id,
    type,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    damage: def.damage,
    speed: def.speed,
    defense: def.defense,
    dead: false,
    attackCooldown: 0,
    shellUntil: 0,
    nextShellAt: 6,
    lungeUntil: 0,
    retreatUntil: 0,
    nextLungeAt: 2,
    slowUntil: 0,
    poisonStacks: 0,
    poisonUntil: 0,
  };
}

export function isShelled(enemy: DungeonEnemy, now: number): boolean {
  return now < enemy.shellUntil;
}

export function enemySpeed(enemy: DungeonEnemy, now: number): number {
  if (enemy.dead) return 0;
  let speed = enemy.speed;
  if (now < enemy.slowUntil) speed *= 0.6;
  if (enemy.type === 'snake' && now < enemy.lungeUntil) speed *= 2;
  if (enemy.type === 'snake' && now < enemy.retreatUntil) speed *= 0.6;
  return speed;
}

/** Moves the enemy toward the player and updates shell/lunge state. */
export function tickDungeonEnemy(
  enemy: DungeonEnemy,
  player: { x: number; y: number },
  dtSec: number,
  now: number,
): void {
  if (enemy.dead) return;

  if (enemy.type === 'hermit' && now >= enemy.nextShellAt && !isShelled(enemy, now)) {
    enemy.shellUntil = now + 2;
    enemy.nextShellAt = now + 6;
  }

  if (
    enemy.type === 'snake' &&
    now >= enemy.nextLungeAt &&
    Math.hypot(player.x - enemy.x, player.y - enemy.y) < 60
  ) {
    enemy.lungeUntil = now + 0.3;
    enemy.retreatUntil = now + 0.9;
    enemy.nextLungeAt = now + 2;
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  // Cool down every frame, including while pressed against the player.
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dtSec);
  if (distance <= 16) return;

  const dir = now < enemy.retreatUntil ? -1 : 1;
  const speed = enemySpeed(enemy, now);
  enemy.x += (dx / distance) * speed * dir * dtSec;
  enemy.y += (dy / distance) * speed * dir * dtSec;
}

export function enemyAttack(enemy: DungeonEnemy, distance: number): number {
  if (enemy.dead || enemy.attackCooldown > 0 || distance > 20) return 0;
  enemy.attackCooldown = 1;
  return enemy.damage;
}

/** Returns the damage after shell reduction; marks the enemy dead at 0 HP. */
export function damageDungeonEnemy(
  enemy: DungeonEnemy,
  amount: number,
  now: number,
  armorPierce = false,
): 'hit' | 'dead' {
  if (enemy.dead) return 'dead';
  const shelled = isShelled(enemy, now);
  const defense = armorPierce ? 0 : enemy.defense;
  let damage = Math.max(1, amount - defense);
  if (shelled) damage = Math.max(1, Math.ceil(damage / 2));
  enemy.hp -= damage;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.dead = true;
    return 'dead';
  }
  return 'hit';
}

export function applySlow(enemy: DungeonEnemy, now: number, seconds = 2): void {
  enemy.slowUntil = Math.max(enemy.slowUntil, now + seconds);
}

export function applyPoison(enemy: DungeonEnemy, now: number, stacks: number): void {
  enemy.poisonStacks = Math.min(stacks, enemy.poisonStacks + 1);
  enemy.poisonUntil = now + 4;
}

/** Poison ticks once per second; returns damage dealt this tick. */
export function tickPoison(enemy: DungeonEnemy, now: number, dtSec: number): number {
  if (enemy.poisonStacks <= 0 || now >= enemy.poisonUntil) {
    if (now >= enemy.poisonUntil) enemy.poisonStacks = 0;
    return 0;
  }
  const damage = enemy.poisonStacks * 3 * dtSec;
  enemy.hp -= damage;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.dead = true;
  }
  return damage;
}

export interface HazardEffect {
  damage: number;
  energyPerSec: number;
  slow: boolean;
}

/** Per-second effect of standing on a hazard tile. */
export function hazardEffect(hazard: DungeonHazard): HazardEffect {
  switch (hazard.kind) {
    case 'flooded':
      return { damage: 0, energyPerSec: 1, slow: true };
    case 'loose':
      return { damage: 15, energyPerSec: 0, slow: false };
    case 'collapse':
      return { damage: 20, energyPerSec: 0, slow: false };
  }
}
