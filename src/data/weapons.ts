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
  coral_dagger: {
    id: 'coral_dagger',
    name: '珊瑚匕首',
    pattern: { kind: 'combo', range: 26, angleDeg: 70, hits: 3 },
    damage: 4,
    stun: 3,
    cooldownSec: 0.25,
    maxDurability: 45,
  },
  captain_cutlass: {
    id: 'captain_cutlass',
    name: '船长弯刀',
    pattern: { kind: 'arc', range: 42, angleDeg: 100 },
    damage: 16,
    stun: 8,
    cooldownSec: 0.7,
    maxDurability: 60,
  },
  sea_snake_spear: {
    id: 'sea_snake_spear',
    name: '海蛇骨矛',
    pattern: { kind: 'thrust', range: 60, width: 16 },
    damage: 18,
    stun: 6,
    cooldownSec: 0.9,
    maxDurability: 55,
  },
  anchor_hammer: {
    id: 'anchor_hammer',
    name: '船锚锤',
    pattern: { kind: 'arc', range: 40, angleDeg: 120 },
    damage: 12,
    stun: 28,
    cooldownSec: 1.1,
    maxDurability: 70,
  },
  iron_spear: {
    id: 'iron_spear',
    name: '铁矛',
    pattern: { kind: 'thrust', range: 58, width: 15 },
    damage: 20,
    stun: 8,
    cooldownSec: 0.85,
    maxDurability: 70,
  },
};

export function weaponFor(baseId: string | null): WeaponDef {
  if (!baseId) return WEAPONS.fist;
  return WEAPONS[baseId] ?? WEAPONS.fist;
}
