import type { EquipInstance, GameState } from '../core/gameState';
import { EQUIPMENT } from '../data/equipment';
import { countItem, removeItem } from './inventorySystem';
import { playerBaseStats } from './levelSystem';

export interface DerivedStats {
  attack: number;
  defense: number;
  /** percentage damage reduction, 0..70 */
  armor: number;
  stunBonus: number;
  stunMul: number;
  savageMul: number;
  gatherMul: number;
  moveMul: number;
  energyMax: number;
  hungerMul: number;
  thorns: number;
  shallowImmune: boolean;
  waveWalk: boolean;
  sprintEnergyMul: number;
  energyCostMul: number;
  knockbackMul: number;
  armorPierce: boolean;
  poisonStacks: number;
  slowOnHit: boolean;
  killHaste: boolean;
  tidalKnockback: boolean;
}

const DEFAULT_STATS: DerivedStats = {
  attack: 0,
  defense: 0,
  armor: 0,
  stunBonus: 0,
  stunMul: 1,
  savageMul: 1,
  gatherMul: 1,
  moveMul: 1,
  energyMax: 100,
  hungerMul: 1,
  thorns: 0,
  shallowImmune: false,
  waveWalk: false,
  sprintEnergyMul: 1,
  energyCostMul: 1,
  knockbackMul: 1,
  armorPierce: false,
  poisonStacks: 0,
  slowOnHit: false,
  killHaste: false,
  tidalKnockback: false,
};

function equippedInstance(state: GameState, slot: 'weapon' | 'armor' | 'boots'): EquipInstance | null {
  const id = state.equipment[slot];
  if (!id) return null;
  return state.equipmentInstances.find((item) => item.instanceId === id) ?? null;
}

/** Aggregates base stats, affixes and legendary traits of equipped, unbroken gear. */
export function deriveStats(state: GameState): DerivedStats {
  const stats: DerivedStats = { ...DEFAULT_STATS };
  const base = playerBaseStats(state.player.level ?? 1);
  stats.attack += base.attack;
  stats.defense += base.defense;
  stats.armor += base.armor;
  stats.moveMul *= base.moveMul;

  for (const slot of ['weapon', 'armor', 'boots'] as const) {
    const instance = equippedInstance(state, slot);
    if (!instance || instance.durability <= 0) continue;
    const base = EQUIPMENT[instance.baseId];
    if (!base) continue;

    stats.attack += base.attack ?? 0;
    stats.defense += base.defense ?? 0;
    stats.moveMul *= base.moveMul ?? 1;
    stats.energyMax += base.energyMax ?? 0;
    if (base.shallowImmune) stats.shallowImmune = true;

    for (const affix of instance.affixes) {
      switch (affix.id) {
        case 'attack':
          stats.attack += affix.value;
          break;
        case 'defense':
          stats.defense += affix.value;
          break;
        case 'stun':
          stats.stunMul += affix.value;
          break;
        case 'savage':
          stats.savageMul += affix.value;
          break;
        case 'gather':
          stats.gatherMul += affix.value;
          break;
        case 'move':
          stats.moveMul += affix.value;
          break;
        case 'energy':
          stats.energyMax += affix.value;
          break;
        case 'hunger':
          stats.hungerMul += affix.value;
          break;
        case 'thorns':
          stats.thorns += affix.value;
          break;
      }
    }

    switch (instance.uniqueTraitId) {
      case 'aftershock':
        stats.stunBonus += 15;
        break;
      case 'sunder':
        stats.armorPierce = true;
        break;
      case 'tidal_combo':
        stats.tidalKnockback = true;
        break;
      case 'veteran':
        stats.killHaste = true;
        break;
      case 'venom':
        stats.poisonStacks = 2;
        break;
      case 'anchor':
        stats.slowOnHit = true;
        break;
      case 'thorns':
        stats.thorns += 6;
        break;
      case 'hard_shell':
        stats.defense += 3;
        break;
      case 'light_kit':
        stats.energyCostMul *= 0.85;
        break;
      case 'old_sailor':
        stats.shallowImmune = true;
        break;
      case 'nimble':
        stats.sprintEnergyMul *= 0.5;
        break;
      case 'wave_walk':
        stats.waveWalk = true;
        break;
      case 'long_haul':
        stats.hungerMul *= 0.9;
        break;
      case 'steady':
        stats.knockbackMul *= 0.5;
        break;
      case 'copper_edge':
        stats.savageMul += 0.1;
        break;
      case 'copper_guard':
        stats.defense += 4;
        break;
    }
  }

  stats.armor = Math.min(70, stats.armor);
  return stats;
}

export function damageEquipped(state: GameState, slot: 'weapon' | 'armor' | 'boots', amount = 1): void {
  const instance = equippedInstance(state, slot);
  if (!instance) return;
  instance.durability = Math.max(0, instance.durability - amount);
}

/** Boots lose 1 durability per 2000 px travelled. */
export function tickBootWear(state: GameState, movedPx: number): void {
  if (!equippedInstance(state, 'boots')) return;
  state.bootWear += movedPx;
  while (state.bootWear >= 2000) {
    state.bootWear -= 2000;
    damageEquipped(state, 'boots', 1);
  }
}

export function repairCost(instance: EquipInstance): { wood: number; vine: number; cloth: number } {
  const missing = Math.max(0, instance.maxDurability - instance.durability);
  const units = Math.ceil(missing / 20);
  return {
    wood: units,
    vine: units,
    cloth: instance.rarity === 'legendary' ? 1 : 0,
  };
}

export function repairEquipped(
  state: GameState,
  instanceId: string,
  nearWorkbench: boolean,
): boolean {
  if (!nearWorkbench) return false;
  const instance = state.equipmentInstances.find((item) => item.instanceId === instanceId);
  if (!instance) return false;
  if (instance.durability >= instance.maxDurability) return false;
  const cost = repairCost(instance);
  if (
    countItem(state, 'wood') < cost.wood ||
    countItem(state, 'vine') < cost.vine ||
    countItem(state, 'cloth') < cost.cloth
  ) {
    return false;
  }
  if (cost.wood > 0) removeItem(state, 'wood', cost.wood);
  if (cost.vine > 0) removeItem(state, 'vine', cost.vine);
  if (cost.cloth > 0) removeItem(state, 'cloth', cost.cloth);
  instance.durability = instance.maxDurability;
  return true;
}
