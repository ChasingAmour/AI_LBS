import type { DungeonEnemyRank, DungeonEnemyType, DungeonHazard } from '../world/dungeonGen';

export type EnemySpecial = 'slam' | 'summon' | 'volley' | 'charge' | 'sweep' | 'teleport';

export interface PendingAttack {
  kind: EnemySpecial;
  x: number;
  y: number;
  radius: number;
  damage: number;
}

export interface DungeonEnemy {
  id: string;
  type: DungeonEnemyType;
  rank: DungeonEnemyRank;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  defense: number;
  armor: number;
  level: number;
  dead: boolean;
  attackCooldown: number;
  /** how far it can spot the player, in pixels */
  sightRange: number;
  /** false until the player walks into view or hits it */
  alerted: boolean;
  /** seconds the player has been out of sight while alerted */
  lostSightSec: number;
  /** elite/boss signature move */
  special: EnemySpecial | null;
  specialCooldown: number;
  /** seconds left of the telegraph before the special lands */
  windup: number;
  pending: PendingAttack | null;
  shellUntil: number;
  nextShellAt: number;
  lungeUntil: number;
  retreatUntil: number;
  nextLungeAt: number;
  slowUntil: number;
  poisonStacks: number;
  poisonUntil: number;
}

const DEFS: Record<
  DungeonEnemyType,
  { hp: number; damage: number; speed: number; defense: number; armor: number; level: number; sight: number }
> = {
  crab: { hp: 15, damage: 5, speed: 45, defense: 0, armor: 0, level: 1, sight: 96 },
  hermit: { hp: 80, damage: 12, speed: 30, defense: 2, armor: 10, level: 2, sight: 112 },
  snake: { hp: 40, damage: 10, speed: 80, defense: 1, armor: 5, level: 2, sight: 150 },
  rat: { hp: 10, damage: 3, speed: 62, defense: 0, armor: 0, level: 1, sight: 110 },
  ghost: { hp: 30, damage: 7, speed: 34, defense: 0, armor: 15, level: 2, sight: 132 },
};

export function createDungeonEnemy(
  type: DungeonEnemyType,
  x: number,
  y: number,
  id: string,
  rank: DungeonEnemyRank = 'normal',
): DungeonEnemy {
  const def = DEFS[type];
  const scale = rank === 'boss' ? 10 : rank === 'elite' ? 3 : 1;
  const damageScale = rank === 'boss' ? 2 : rank === 'elite' ? 1.5 : 1;
  const hp = Math.round(def.hp * scale);
  const special: EnemySpecial | null =
    rank === 'normal'
      ? null
      : rank === 'boss'
        ? type === 'ghost'
          ? 'volley'
          : type === 'hermit'
            ? 'sweep'
            : 'slam'
        : type === 'ghost'
          ? 'summon'
          : 'slam';
  return {
    id,
    type,
    rank,
    x,
    y,
    hp,
    maxHp: hp,
    damage: Math.round(def.damage * damageScale),
    speed: def.speed * (rank === 'boss' ? 0.7 : 1),
    defense: def.defense + (rank === 'boss' ? 3 : rank === 'elite' ? 1 : 0),
    armor: Math.min(60, def.armor + (rank === 'boss' ? 10 : rank === 'elite' ? 5 : 0)),
    level: def.level + (rank === 'boss' ? 4 : rank === 'elite' ? 2 : 0),
    dead: false,
    attackCooldown: 0,
    sightRange: def.sight + (rank === 'boss' ? 40 : rank === 'elite' ? 20 : 0),
    alerted: false,
    lostSightSec: 0,
    special,
    specialCooldown: rank === 'boss' ? 4 : 6,
    windup: 0,
    pending: null,
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

/** Pulls the telegraphed special once its wind-up finishes. */
export function consumePendingAttack(enemy: DungeonEnemy): PendingAttack | null {
  if (!enemy.pending || enemy.windup > 0) return null;
  const attack = enemy.pending;
  enemy.pending = null;
  return attack;
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
  walkable?: (tileX: number, tileY: number) => boolean,
  canSee?: (fromX: number, fromY: number, toX: number, toY: number) => boolean,
): void {
  if (enemy.dead) return;

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  // Cool down every frame, including while pressed against the player.
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dtSec);

  const inSight =
    distance <= enemy.sightRange &&
    (!canSee || canSee(enemy.x, enemy.y, player.x, player.y));

  if (!enemy.alerted) {
    if (!inSight) return;
    enemy.alerted = true;
    enemy.lostSightSec = 0;
  }

  if (inSight) {
    enemy.lostSightSec = 0;
  } else {
    enemy.lostSightSec += dtSec;
    if (enemy.lostSightSec > 3) {
      enemy.alerted = false;
      enemy.lostSightSec = 0;
      return;
    }
  }

  if (enemy.special && enemy.alerted) {
    enemy.specialCooldown = Math.max(0, enemy.specialCooldown - dtSec);
    if (enemy.windup > 0) {
      enemy.windup -= dtSec;
      return;
    }
    if (enemy.specialCooldown <= 0 && distance < 170) {
      enemy.windup = enemy.rank === 'boss' ? 0.9 : 0.7;
      enemy.specialCooldown = enemy.rank === 'boss' ? 4.5 : 6.5;
      enemy.pending = {
        kind: enemy.special,
        x: player.x,
        y: player.y,
        radius: enemy.special === 'slam' ? 58 : enemy.special === 'sweep' ? 72 : 90,
        damage: Math.round(enemy.damage * 1.4),
      };
      return;
    }
  }

  if (enemy.type === 'hermit' && now >= enemy.nextShellAt && !isShelled(enemy, now)) {
    enemy.shellUntil = now + 2;
    enemy.nextShellAt = now + 6;
  }

  if (enemy.type === 'snake' && now >= enemy.nextLungeAt && distance < 60) {
    enemy.lungeUntil = now + 0.3;
    enemy.retreatUntil = now + 0.9;
    enemy.nextLungeAt = now + 2;
  }

  if (distance <= 16) return;

  const dir = now < enemy.retreatUntil ? -1 : 1;
  const speed = enemySpeed(enemy, now);
  const nx = enemy.x + (dx / distance) * speed * dir * dtSec;
  const ny = enemy.y + (dy / distance) * speed * dir * dtSec;
  const free = (x: number, y: number): boolean =>
    !walkable || walkable(Math.floor(x / 16), Math.floor(y / 16));
  if (free(nx, ny)) {
    enemy.x = nx;
    enemy.y = ny;
  } else if (free(nx, enemy.y)) {
    enemy.x = nx;
  } else if (free(enemy.x, ny)) {
    enemy.y = ny;
  }
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
  enemy.alerted = true;
  const shelled = isShelled(enemy, now);
  const defense = armorPierce ? 0 : enemy.defense;
  let damage = Math.max(1, Math.round((amount - defense) * (1 - enemy.armor / 100)));
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
