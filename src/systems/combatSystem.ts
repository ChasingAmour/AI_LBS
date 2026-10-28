import type { AttackPattern, WeaponDef } from '../data/weapons';
import type { SavageState } from '../entities/savage';

export interface HitOrigin {
  x: number;
  y: number;
  /** radians, 0 points along +x */
  angle: number;
}

export interface HitTarget {
  id: string;
  x: number;
  y: number;
}

function withinArc(origin: HitOrigin, range: number, angleDeg: number, target: HitTarget): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return true;
  if (distance > range) return false;
  const targetAngle = Math.atan2(dy, dx);
  const diff = Math.atan2(Math.sin(targetAngle - origin.angle), Math.cos(targetAngle - origin.angle));
  return Math.abs(diff) <= (angleDeg * Math.PI) / 360;
}

function withinThrust(origin: HitOrigin, range: number, width: number, target: HitTarget): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const cos = Math.cos(origin.angle);
  const sin = Math.sin(origin.angle);
  const forward = dx * cos + dy * sin;
  const sideways = Math.abs(-dx * sin + dy * cos);
  return forward >= 0 && forward <= range && sideways <= width / 2;
}

export function computeHitTargets(
  origin: HitOrigin,
  pattern: AttackPattern,
  targets: HitTarget[],
): string[] {
  switch (pattern.kind) {
    case 'arc':
      return targets
        .filter((t) => withinArc(origin, pattern.range, pattern.angleDeg, t))
        .map((t) => t.id);
    case 'combo':
      return targets
        .filter((t) => withinArc(origin, pattern.range, pattern.angleDeg, t))
        .map((t) => t.id);
    case 'thrust':
      return targets
        .filter((t) => withinThrust(origin, pattern.range, pattern.width, t))
        .map((t) => t.id);
    case 'projectile':
      return [];
  }
}

export type HitResult = 'hit' | 'stunned' | 'dead';

export interface CombatMods {
  attack?: number;
  stunMul?: number;
  stunBonus?: number;
  savageMul?: number;
  armorPierce?: boolean;
}

export function applyHitToSavage(
  savage: SavageState,
  weapon: WeaponDef,
  dtSec: number,
  mods: CombatMods = {},
): HitResult {
  void dtSec;
  if (savage.mode === 'dead') return 'dead';
  savage.lastHitAgo = 0;
  const rawDamage = (weapon.damage + (mods.attack ?? 0)) * (mods.savageMul ?? 1);
  const defense = mods.armorPierce ? 0 : (savage.defense ?? 0);
  savage.hp -= Math.max(1, Math.round(rawDamage - defense));
  savage.stun = Math.min(
    100,
    savage.stun + (weapon.stun + (mods.stunBonus ?? 0)) * (mods.stunMul ?? 1),
  );

  if (savage.hp <= 0) {
    savage.hp = 0;
    savage.mode = 'dead';
    return 'dead';
  }
  if (savage.stun >= 100) {
    savage.stunnedUntil = 8;
    savage.mode = 'stunned';
    return 'stunned';
  }
  savage.mode = 'attack';
  return 'hit';
}

export function tickSavageStun(savage: SavageState, dtSec: number): void {
  if (savage.mode === 'dead') return;

  if (savage.stunnedUntil !== null) {
    savage.stunnedUntil -= dtSec;
    if (savage.stunnedUntil <= 0) {
      savage.stunnedUntil = null;
      savage.stun = 0;
      savage.mode = 'attack';
    }
    return;
  }

  const before = savage.lastHitAgo;
  savage.lastHitAgo += dtSec;
  const decayStart = Math.max(before, 5);
  const decayed = savage.lastHitAgo - decayStart;
  if (decayed > 0) {
    savage.stun = Math.max(0, savage.stun - decayed * 10);
  }
}

export function canCaptureSavage(savage: SavageState): boolean {
  return savage.mode === 'stunned' && savage.stunnedUntil !== null && savage.hp > 0;
}
