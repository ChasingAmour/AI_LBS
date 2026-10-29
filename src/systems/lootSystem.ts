import type { EquipInstance, GameState, ItemStack } from '../core/gameState';
import { createRng, type Rng } from '../core/rng';
import { LOOT_EQUIPMENT_IDS, type Rarity } from '../data/equipment';
import { rollEquipment } from './equipmentSystem';

type EnemyRank = 'normal' | 'elite' | 'boss';

const NORMAL_TABLE: Array<[Rarity, number]> = [
  ['common', 0.6],
  ['fine', 0.3],
  ['rare', 0.08],
  ['epic', 0.02],
];

const FINAL_TABLE: Array<[Rarity, number]> = [
  ['fine', 0.4],
  ['rare', 0.3],
  ['epic', 0.2],
  ['legendary', 0.1],
];

const MATERIALS = ['cloth', 'flint', 'stone', 'wood', 'vine'];

export interface ChestLoot {
  equipment: EquipInstance;
  materials: ItemStack[];
  firstClear: boolean;
}

function rollRarity(rng: Rng, table: Array<[Rarity, number]>): Rarity {
  const roll = rng.next();
  let acc = 0;
  for (const [rarity, weight] of table) {
    acc += weight;
    if (roll < acc) return rarity;
  }
  return table[table.length - 1][0];
}

/**
 * Rolls equipment + materials for a dungeon chest. The first final chest in a
 * save always yields a legendary; later final chests use the normal table.
 */
export function rollChestLoot(
  state: GameState,
  source: 'normal' | 'final',
  rng: Rng = createRng(state.lootSeed + state.lootRolls),
): ChestLoot {
  const firstClear = source === 'final' && !state.dungeon.firstClearDone;
  const rarity = firstClear
    ? 'legendary'
    : rollRarity(rng, source === 'final' ? FINAL_TABLE : NORMAL_TABLE);

  const baseIds = LOOT_EQUIPMENT_IDS;
  const baseId = baseIds[rng.int(0, baseIds.length - 1)];
  state.lootRolls += 1;
  const equipment = rollEquipment(
    createRng(state.lootSeed + state.lootRolls * 7919),
    baseId,
    rarity,
    `eq_${state.lootRolls}`,
  );
  if (!equipment) throw new Error(`unknown equipment base: ${baseId}`);
  if (firstClear) state.dungeon.firstClearDone = true;

  const materials: ItemStack[] = [];
  const count = rng.int(1, 2);
  for (let i = 0; i < count; i++) {
    const base = MATERIALS[rng.int(0, MATERIALS.length - 1)];
    materials.push({ baseId: base, count: rng.int(1, 3) });
  }

  return { equipment, materials, firstClear };
}

/**
 * Enemy drops: normal mobs rarely drop common/fine gear, elites drop better
 * gear, and every boss drops rare-or-better loot from the pirate pool.
 */
export function rollEnemyLoot(
  state: GameState,
  rank: EnemyRank,
  floor: 1 | 2 | 3,
  rng: Rng = createRng(state.lootSeed + state.lootRolls * 7919),
): EquipInstance | null {
  const chance = rank === 'boss' ? 1 : rank === 'elite' ? 0.7 : 0.3;
  if (rng.next() > chance) return null;

  let rarity: Rarity;
  if (rank === 'boss') {
    const roll = rng.next();
    if (floor >= 3) rarity = roll < 0.5 ? 'legendary' : 'epic';
    else if (floor === 2) rarity = roll < 0.55 ? 'epic' : 'rare';
    else rarity = roll < 0.4 ? 'epic' : 'rare';
  } else if (rank === 'elite') {
    rarity = rng.next() < 0.35 ? 'rare' : 'fine';
  } else {
    rarity = rng.next() < 0.15 ? 'fine' : 'common';
  }

  const baseId = LOOT_EQUIPMENT_IDS[rng.int(0, LOOT_EQUIPMENT_IDS.length - 1)];
  state.lootRolls += 1;
  const equipment = rollEquipment(
    createRng(state.lootSeed + state.lootRolls * 7919),
    baseId,
    rarity,
    `eq_${state.lootRolls}`,
  );
  if (!equipment) return null;
  state.equipmentInstances.push(equipment);
  return equipment;
}
