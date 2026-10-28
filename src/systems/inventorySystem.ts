import type { GameState, ItemStack } from '../core/gameState';
import { CONFIG } from '../core/config';
import { RARITY } from '../data/equipment';
import { ITEMS, type ItemKind } from '../data/items';

const KIND_ORDER: Record<ItemKind, number> = {
  food: 0,
  material: 1,
  consumable: 2,
  tool: 3,
  weapon: 4,
};

/** Merges stackable items, orders them by kind/name and sorts gear by rarity. */
export function sortInventory(state: GameState): void {
  const stacks = new Map<string, number>();
  const singles: ItemStack[] = [];
  for (const item of state.inventory) {
    if (item.durability !== undefined || !ITEMS[item.baseId]) {
      singles.push(item);
      continue;
    }
    stacks.set(item.baseId, (stacks.get(item.baseId) ?? 0) + item.count);
  }

  const merged: ItemStack[] = [];
  for (const [baseId, total] of stacks) {
    let left = total;
    while (left > 0) {
      const take = Math.min(CONFIG.stackMax, left);
      merged.push({ baseId, count: take });
      left -= take;
    }
  }
  merged.push(...singles);
  merged.sort((a, b) => {
    const ka = ITEMS[a.baseId]?.kind ?? 'material';
    const kb = ITEMS[b.baseId]?.kind ?? 'material';
    const order = (KIND_ORDER[ka] ?? 9) - (KIND_ORDER[kb] ?? 9);
    if (order !== 0) return order;
    return (ITEMS[a.baseId]?.name ?? a.baseId).localeCompare(ITEMS[b.baseId]?.name ?? b.baseId);
  });
  state.inventory = merged;
  state.equipmentInstances.sort(
    (a, b) =>
      RARITY[b.rarity].tier - RARITY[a.rarity].tier || a.baseId.localeCompare(b.baseId),
  );
}

export function addItem(state: GameState, baseId: string, count: number): { added: number; leftover: number } {
  const def = ITEMS[baseId];
  if (!def) throw new Error(`Unknown item: ${baseId}`);
  let remaining = Math.max(0, Math.floor(count));
  const requested = remaining;

  if (def.maxDurability) {
    while (remaining > 0 && state.inventory.length < CONFIG.inventorySlots) {
      state.inventory.push({ baseId, count: 1, durability: def.maxDurability });
      remaining -= 1;
    }
    return { added: requested - remaining, leftover: remaining };
  }

  for (const stack of state.inventory) {
    if (remaining <= 0) break;
    if (stack.baseId !== baseId || stack.durability !== undefined) continue;
    const space = CONFIG.stackMax - stack.count;
    if (space <= 0) continue;
    const moved = Math.min(space, remaining);
    stack.count += moved;
    remaining -= moved;
  }
  while (remaining > 0 && state.inventory.length < CONFIG.inventorySlots) {
    const moved = Math.min(CONFIG.stackMax, remaining);
    state.inventory.push({ baseId, count: moved });
    remaining -= moved;
  }
  return { added: requested - remaining, leftover: remaining };
}

export function addTool(state: GameState, baseId: string): boolean {
  return addItem(state, baseId, 1).added === 1;
}

export function countItem(state: GameState, baseId: string): number {
  return state.inventory
    .filter((i) => i.baseId === baseId)
    .reduce((sum, i) => sum + i.count, 0);
}

export function removeItem(state: GameState, baseId: string, count: number): boolean {
  if (countItem(state, baseId) < count) return false;
  let remaining = count;
  for (let i = state.inventory.length - 1; i >= 0 && remaining > 0; i--) {
    const stack = state.inventory[i];
    if (stack.baseId !== baseId) continue;
    const taken = Math.min(stack.count, remaining);
    stack.count -= taken;
    remaining -= taken;
    if (stack.count <= 0) state.inventory.splice(i, 1);
  }
  return true;
}

export function damageTool(state: GameState, baseId: string, amount = 1): void {
  const stack = state.inventory.find((i) => i.baseId === baseId && i.durability !== undefined);
  if (!stack) return;
  stack.durability = Math.max(0, (stack.durability ?? 0) - amount);
  if (stack.durability <= 0) {
    const index = state.inventory.indexOf(stack);
    state.inventory.splice(index, 1);
  }
}

export function getToolDurability(state: GameState, baseId: string): number | null {
  const stack: ItemStack | undefined = state.inventory.find((i) => i.baseId === baseId && i.durability !== undefined);
  return stack?.durability ?? null;
}

/** Puts a tool or weapon into the first empty hotbar slot. */
export function ensureHotbar(state: GameState, baseId: string): void {
  const def = ITEMS[baseId];
  if (!def || (def.kind !== 'tool' && def.kind !== 'weapon')) return;
  if (state.hotbar.includes(baseId)) return;
  const index = state.hotbar.findIndex((slot) => slot === null);
  if (index >= 0) state.hotbar[index] = baseId;
}
