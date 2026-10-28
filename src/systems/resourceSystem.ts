import type { GameState, ItemStack } from '../core/gameState';
import type { Rng } from '../core/rng';
import { UNIQUE_CHESTS, nodeDefForId, type DropDef, type ResourceNodeDef } from '../data/spawns';
import { countItem } from './inventorySystem';

export interface GatherResult {
  items: ItemStack[];
  depleted: boolean;
}

function rollDrops(drops: DropDef[], rng: Rng): ItemStack[] {
  const items: ItemStack[] = [];
  for (const drop of drops) {
    const chance = drop.chance ?? 1;
    if (chance < 1 && rng.next() >= chance) continue;
    const count = rng.int(drop.min, drop.max);
    if (count > 0) items.push({ baseId: drop.baseId, count });
  }
  return items;
}

export function gatherNode(state: GameState, nodeId: string, rng: Rng): GatherResult {
  const def = nodeDefForId(nodeId);
  if (!def) return { items: [], depleted: false };

  let node = state.world.nodeStates[nodeId];
  if (!node) {
    node = { remaining: def.maxHits, respawnDay: 0 };
    state.world.nodeStates[nodeId] = node;
  }
  if (node.remaining <= 0) return { items: [], depleted: true };

  node.remaining -= 1;
  const depleted = node.remaining === 0;
  if (depleted) {
    node.respawnDay = state.time.day + def.respawnDays;
  }

  const items = rollDrops(def.drops, rng);
  if (depleted && def.depleteDrops) {
    items.push(...rollDrops(def.depleteDrops, rng));
  }
  return { items, depleted };
}

export function respawnNodes(state: GameState): void {
  for (const [nodeId, node] of Object.entries(state.world.nodeStates)) {
    if (node.remaining > 0) continue;
    if (node.respawnDay > state.time.day) continue;
    const def = nodeDefForId(nodeId);
    if (!def) continue;
    node.remaining = def.maxHits;
    node.respawnDay = 0;
  }
}

export function openUniqueChest(state: GameState, chestId: string): ItemStack[] | null {
  const def = UNIQUE_CHESTS[chestId];
  if (!def) return null;
  if (state.world.uniqueLoot.includes(chestId)) return null;
  if (def.requiresTorch && countItem(state, 'torch') <= 0) return null;
  state.world.uniqueLoot.push(chestId);
  return def.items.map((item) => ({ ...item }));
}

export function gatherChannelMs(baseMs: number, hasTool: boolean, slow = false): number {
  const base = hasTool ? baseMs : baseMs * 3;
  return slow ? base * 2 : base;
}

export function hasToolFor(state: GameState, nodeId: string): boolean {
  const def = nodeDefForId(nodeId);
  if (!def?.tool) return true;
  return countItem(state, def.tool) > 0;
}

export function nodeDefinition(nodeId: string): ResourceNodeDef | null {
  return nodeDefForId(nodeId);
}

export function tickTorchFuel(state: GameState, dtSec: number): void {
  const index = state.inventory.findIndex((i) => i.baseId === 'torch' && i.durability !== undefined);
  if (index < 0) return;
  const stack = state.inventory[index];
  stack.durability = (stack.durability ?? 0) - dtSec;
  if (stack.durability <= 0) {
    state.inventory.splice(index, 1);
  }
}
