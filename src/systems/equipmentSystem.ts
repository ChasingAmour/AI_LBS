import type { EquipInstance, GameState } from '../core/gameState';
import type { Rng } from '../core/rng';
import { EQUIPMENT, RARITY, affixesFor, type Rarity } from '../data/equipment';
import { WEAPONS } from '../data/weapons';
import { addItem } from './inventorySystem';
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

/** Compact stat preview used by the crafting book before an item is made. */
export function gearPreviewText(baseId: string): string {
  const base = EQUIPMENT[baseId];
  if (!base) return '';
  const parts: string[] = [];
  const weapon = base.weaponId ? WEAPONS[base.weaponId] : null;
  if (weapon) parts.push(`攻击 ${weapon.damage}`, `眩晕 ${weapon.stun}`);
  if (base.defense) parts.push(`防御 ${base.defense}`);
  if (base.moveMul && base.moveMul !== 1) {
    parts.push(`移速 ${Math.round((base.moveMul - 1) * 100)}%`);
  }
  if (base.energyMax) parts.push(`精力 +${base.energyMax}`);
  parts.push(`耐久 ${base.durability}`);
  return `${parts.join(' · ')} · 传说 ${base.legendary.name}`;
}

/** Base stats shown in the inventory tooltip, before affixes. */
export function gearStatLines(instance: EquipInstance): string[] {
  const base = EQUIPMENT[instance.baseId];
  if (!base) return [];
  const lines: string[] = [];
  const weapon = base.weaponId ? WEAPONS[base.weaponId] : null;
  if (weapon) lines.push(`攻击 ${weapon.damage}`);
  if (base.defense) lines.push(`防御 ${base.defense}`);
  if (base.moveMul && base.moveMul !== 1) {
    lines.push(`移速 ${Math.round((base.moveMul - 1) * 100)}%`);
  }
  lines.push(`耐久 ${instance.durability}/${instance.maxDurability}`);
  if (instance.affixes.length === 0) lines.push('无词条（普通品质）');
  return lines;
}

/** Melts a piece of gear back into ingots; returns what was gained. */
export function recycleInstance(
  state: GameState,
  instanceId: string,
): { baseId: string; count: number } | null {
  const index = state.equipmentInstances.findIndex((item) => item.instanceId === instanceId);
  if (index < 0) return null;
  const instance = state.equipmentInstances[index];
  for (const slot of ['weapon', 'armor', 'boots'] as const) {
    if (state.equipment[slot] === instanceId) state.equipment[slot] = null;
  }
  state.equipmentInstances.splice(index, 1);
  const count = { common: 1, fine: 1, rare: 2, epic: 3, legendary: 4 }[instance.rarity];
  addItem(state, 'iron_ingot', count);
  return { baseId: 'iron_ingot', count };
}

export function equipInstance(state: GameState, instanceId: string): boolean {  const instance = state.equipmentInstances.find((item) => item.instanceId === instanceId);
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
