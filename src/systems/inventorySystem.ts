import type { GameState, ItemStack } from '../core/gameState';
import { CONFIG } from '../core/config';
import { ITEMS } from '../data/items';

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
