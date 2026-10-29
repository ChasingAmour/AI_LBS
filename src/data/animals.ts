import type { DropDef } from './spawns';
import { TILE } from '../world/terrain';

export type AnimalSize = 'small' | 'large';

export interface AnimalDef {
  id: string;
  name: string;
  level: number;
  size: AnimalSize;
  hp: number;
  /** damage per bite when retaliating */
  damage: number;
  defense: number;
  /** percentage damage reduction */
  armor: number;
  attackCooldownSec: number;
  wanderSpeed: number;
  chaseSpeed: number;
  /** distance at which a retaliating animal gives up */
  leashRange: number;
  /** seconds out of leash before it goes back to wandering */
  disengageSec: number;
  drops: DropDef[];
  /** tile ids this species spawns on */
  habitat: number[];
  /** lives in water instead of land */
  aquatic?: boolean;
  /** swims away when hit instead of fighting back */
  flees?: boolean;
}

export const ANIMALS: Record<string, AnimalDef> = {
  chicken: {
    id: 'chicken',
    name: '野鸡',
    level: 1,
    size: 'small',
    hp: 12,
    damage: 2,
    defense: 0,
    armor: 0,
    attackCooldownSec: 1.5,
    wanderSpeed: 20,
    chaseSpeed: 45,
    leashRange: 400,
    disengageSec: 5,
    drops: [{ baseId: 'raw_meat', min: 1, max: 2 }],
    habitat: [TILE.grass, TILE.forest],
  },
  rabbit: {
    id: 'rabbit',
    name: '野兔',
    level: 1,
    size: 'small',
    hp: 10,
    damage: 1,
    defense: 0,
    armor: 0,
    attackCooldownSec: 1.5,
    wanderSpeed: 20,
    chaseSpeed: 45,
    leashRange: 400,
    disengageSec: 5,
    drops: [{ baseId: 'raw_meat', min: 1, max: 1 }],
    habitat: [TILE.grass, TILE.forest],
  },
  boar: {
    id: 'boar',
    name: '野猪',
    level: 3,
    size: 'large',
    hp: 60,
    damage: 10,
    defense: 1,
    armor: 10,
    attackCooldownSec: 1.5,
    wanderSpeed: 20,
    chaseSpeed: 45,
    leashRange: 400,
    disengageSec: 5,
    drops: [{ baseId: 'raw_meat', min: 3, max: 4 }],
    habitat: [TILE.forest, TILE.rock],
  },
  fish: {
    id: 'fish',
    name: '海鱼',
    level: 1,
    size: 'small',
    hp: 6,
    damage: 0,
    defense: 0,
    armor: 0,
    attackCooldownSec: 2,
    wanderSpeed: 22,
    chaseSpeed: 48,
    leashRange: 200,
    disengageSec: 3,
    drops: [{ baseId: 'raw_fish', min: 1, max: 1 }],
    habitat: [TILE.shallowWater, TILE.stream],
    aquatic: true,
    flees: true,
  },
};

/** Population caps and spawn ring around the player, in world pixels. */
export const ANIMAL_SPAWN = {
  smallCap: 6,
  largeCap: 3,
  fishCap: 6,
  minDist: 200,
  maxDist: 500,
  fishMinDist: 100,
  fishMaxDist: 360,
  despawnDist: 900,
  refillSec: 10,
} as const;
