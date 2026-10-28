export type SavageMode = 'attack' | 'stunned' | 'dead' | 'flee';

/** Tiny Dungeon red warrior frame. */
export const SAVAGE_TEXTURE = 'dungeon';
export const SAVAGE_FRAME = 88;

export interface SavageState {
  id: string;
  x: number;
  y: number;
  hp: number;
  /** 0..100 stun meter */
  stun: number;
  /** seconds of stun remaining, null when not stunned */
  stunnedUntil: number | null;
  /** seconds since the last hit taken */
  lastHitAgo: number;
  mode: SavageMode;
  /** seconds until the next building/player attack, optional */
  attackCooldown?: number;
}

export function createSavage(id: string, x: number, y: number, hp = 60): SavageState {
  return {
    id,
    x,
    y,
    hp,
    stun: 0,
    stunnedUntil: null,
    lastHitAgo: 0,
    mode: 'attack',
  };
}
