import type { EquipInstance } from '../core/gameState';
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
): EquipInstance | null {
  const base = EQUIPMENT[baseId];
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
