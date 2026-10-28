import { ANIMALS } from '../data/animals';

export type AnimalMode = 'wander' | 'retaliate' | 'dead';

export interface AnimalState {
  id: string;
  /** key into ANIMALS */
  type: string;
  x: number;
  y: number;
  hp: number;
  mode: AnimalMode;
  /** seconds until the next retaliating bite */
  cooldown: number;
  /** radians of the current wander heading */
  wanderDir: number;
  /** seconds until the next heading change */
  wanderTimer: number;
  /** seconds spent out of leash while retaliating */
  disengageTimer: number;
}

export function createAnimal(id: string, type: string, x: number, y: number): AnimalState {
  const def = ANIMALS[type];
  return {
    id,
    type,
    x,
    y,
    hp: def?.hp ?? 10,
    mode: 'wander',
    cooldown: 0,
    wanderDir: 0,
    wanderTimer: 0,
    disengageTimer: 0,
  };
}
