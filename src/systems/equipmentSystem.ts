import type { EquipInstance, GameState } from '../core/gameState';
import type { Rng } from '../core/rng';
import { EQUIPMENT, RARITY, affixesFor, type Rarity } from '../data/equipment';
/**
 * Rolls one equipment instance: distinct slot-appropriate affixes at the
 * rarity's tier, a legendary trait for legendary gear and a scaled max
 * durability. Deterministic for the supplied RNG.
 */
export function rollEquipment(
  rng: Rng,
  baseId: string,
  rarity: Rarity,
  instanceId: string,
): EquipInstance | null {  const base = EQUIPMENT[baseId];
  if (!base) return null;

  const pool = affixesFor(base.slot);
  const picked: { id: string; value: number }[] = [];
  const count = RARITY[rarity].affixes;
  const tier = RARITY[rarity].tier;
  const remaining = [...pool];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const index = rng.int(0, remaining.length - 1);
    const affix = remaining.splice(index, 1)[0];
    picked.push({ id: affix.id, value: affix.values[Math.max(0, tier - 2)] });
  }

  const durabilityPct = picked
    .filter((affix) => affix.id === 'durability')
    .reduce((sum, affix) => sum + affix.value, 0);
  // Rarer gear also starts a little tougher, independent of the durability affix.
  const rarityBonus = (tier - 1) * 0.05;
  const maxDurability = Math.round(base.durability * (1 + rarityBonus + durabilityPct));

  return {
    instanceId,
    baseId,
    slot: base.slot,
    rarity,
    affixes: picked,
    uniqueTraitId: rarity === 'legendary' ? base.legendary.id : undefined,
    durability: maxDurability,
    maxDurability,
  };
}

export function equipInstance(state: GameState, instanceId: string): boolean {
  const instance = state.equipmentInstances.find((item) => item.instanceId === instanceId);
  if (!instance) return false;
  state.equipment[instance.slot] = instanceId;
  return true;
}

export function unequipSlot(
  state: GameState,
  slot: 'weapon' | 'armor' | 'boots',
): boolean {
  if (!state.equipment[slot]) return false;
  state.equipment[slot] = null;
  return true;
}

export interface StatLine {
  attack: number;
  defense: number;
  movePct: number;
  maxDurability: number;
}

export function instanceStats(instance: EquipInstance): StatLine {
  const base = EQUIPMENT[instance.baseId];
  const line: StatLine = {
    attack: base?.attack ?? 0,
    defense: base?.defense ?? 0,
    movePct: ((base?.moveMul ?? 1) - 1) * 100,
    maxDurability: instance.maxDurability,
  };
  for (const affix of instance.affixes) {
    if (affix.id === 'attack') line.attack += affix.value;
    else if (affix.id === 'defense') line.defense += affix.value;
    else if (affix.id === 'move') line.movePct += affix.value * 100;
  }
  return line;
}

/** Deltas against the item currently in the same slot (all zeros when empty). */
export function compareEquipment(
  state: GameState,
  instance: EquipInstance,
): StatLine {
  const target = instanceStats(instance);
  const currentId = state.equipment[instance.slot];
  const current = currentId
    ? state.equipmentInstances.find((item) => item.instanceId === currentId)
    : null;
  const base = current ? instanceStats(current) : { attack: 0, defense: 0, movePct: 0, maxDurability: 0 };
  return {
    attack: Math.round(target.attack - base.attack),
    defense: Math.round(target.defense - base.defense),
    movePct: Math.round(target.movePct - base.movePct),
    maxDurability: target.maxDurability - base.maxDurability,
  };
}
