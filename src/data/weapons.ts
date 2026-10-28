export type AttackPattern =
  | { kind: 'arc'; range: number; angleDeg: number }
  | { kind: 'thrust'; range: number; width: number }
  | { kind: 'combo'; range: number; angleDeg: number; hits: number }
  | { kind: 'projectile'; range: number; speed: number };

export interface WeaponDef {
  id: string;
  name: string;
  pattern: AttackPattern;
  damage: number;
  stun: number;
  cooldownSec: number;
  maxDurability?: number;
  /** movement multiplier while swinging, defaults to 0.4 */
  attackMoveMult?: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
  fist: {
    id: 'fist',
    name: '拳头',
    pattern: { kind: 'arc', range: 24, angleDeg: 60 },
    damage: 4,
    stun: 12,
    cooldownSec: 0.45,
  },
  club: {
    id: 'club',
    name: '木棒',
    pattern: { kind: 'arc', range: 36, angleDeg: 90 },
    damage: 8,
    stun: 20,
    cooldownSec: 0.65,
    maxDurability: 40,
  },
  spear: {
    id: 'spear',
    name: '石矛',
    pattern: { kind: 'thrust', range: 52, width: 14 },
    damage: 14,
    stun: 6,
    cooldownSec: 0.8,
    maxDurability: 50,
  },
};

export function weaponFor(baseId: string | null): WeaponDef {
  if (!baseId) return WEAPONS.fist;
  return WEAPONS[baseId] ?? WEAPONS.fist;
}
