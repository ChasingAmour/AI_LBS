import type { GameState, ItemStack } from '../core/gameState';
import { BUILDINGS } from '../data/buildings';
import { ITEMS } from '../data/items';
import { RESOURCE_NODES, nodeDefForId } from '../data/spawns';
import { addItem, countItem } from './inventorySystem';
import { deriveStats } from './statsSystem';

export type InteractKind =
  | 'savage'
  | 'laborer'
  | 'building'
  | 'chest'
  | 'dungeon'
  | 'groundLoot'
  | 'node'
  | 'water';

export interface InteractTarget {
  kind: InteractKind;
  id: string;
  label: string;
  x: number;
  y: number;
  durationSec: number;
}

export interface InteractOptions {
  onWater: boolean;
}

/** Panels that can be open while the player is gathering. */
export type UiPanel =
  | 'inventory'
  | 'build'
  | 'craft'
  | 'labor'
  | 'map'
  | 'adventure'
  | 'pause'
  | null;

/** The inventory can stay open during a gather channel; everything else cancels it. */
export function shouldCancelChannel(panel: UiPanel): boolean {
  return panel !== null && panel !== 'inventory';
}

const PICKUP_RADIUS = 26;
const BUILDING_RADIUS = 34;
const NODE_RADIUS = 34;
const ACTOR_RADIUS = 34;
const BASE_CHANNEL = 1.5;
const WATER_CHANNEL = 2;

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function nodeDuration(state: GameState, nodeId: string): number {
  const def = nodeDefForId(nodeId);
  const base = BASE_CHANNEL / deriveStats(state).gatherMul;
  if (!def?.tool) return base;
  return countItem(state, def.tool) > 0 ? base : base * 3;
}

/**
 * Picks the closest interaction, honouring the design priority:
 * enemy > laborer > building > resource node, with water last.
 */
export function findInteractTarget(
  state: GameState,
  px: number,
  py: number,
  options: InteractOptions,
): InteractTarget | null {
  let best: InteractTarget | null = null;
  let bestRank = Number.POSITIVE_INFINITY;

  const consider = (target: InteractTarget, rank: number): void => {
    if (rank < bestRank) {
      best = target;
      bestRank = rank;
    }
  };

  for (const savage of state.savages) {
    if (savage.mode !== 'stunned' || savage.hp <= 0) continue;
    if (distance(px, py, savage.x, savage.y) > ACTOR_RADIUS) continue;
    consider(
      {
        kind: 'savage',
        id: savage.id,
        label: '捆绑野人',
        x: savage.x,
        y: savage.y,
        durationSec: BASE_CHANNEL,
      },
      0,
    );
  }

  for (const laborer of state.laborers) {
    if (distance(px, py, laborer.x, laborer.y) > ACTOR_RADIUS) continue;
    consider(
      {
        kind: 'laborer',
        id: laborer.id,
        label: `查看 ${laborer.name}`,
        x: laborer.x,
        y: laborer.y,
        durationSec: BASE_CHANNEL,
      },
      1,
    );
  }

  for (const building of state.buildings) {
    const bx = building.x * 16 + 8;
    const by = building.y * 16 + 16;
    if (distance(px, py, bx, by) > BUILDING_RADIUS) continue;
    const name = BUILDINGS[building.type]?.name ?? building.type;
    let label = `使用 ${name}`;
    if (building.type === 'tent') label = '睡觉';
    if (building.type === 'storage') label = '打开储物箱';
    if (building.type === 'workbench') label = '使用工作台';
    consider(
      { kind: 'building', id: building.id, label, x: bx, y: by, durationSec: BASE_CHANNEL },
      2,
    );
  }

  const entrance = state.world.wreckEntrance;
  if (
    entrance &&
    entrance.x > 0 &&
    distance(px, py, entrance.x, entrance.y) <= NODE_RADIUS
  ) {
    consider(
      {
        kind: 'dungeon',
        id: 'wreck_entrance',
        label: '进入沉船',
        x: entrance.x,
        y: entrance.y,
        durationSec: 0,
      },
      2.5,
    );
  }

  for (const [id, node] of Object.entries(state.world.nodes)) {
    if (distance(px, py, node.x, node.y) > NODE_RADIUS) continue;
    if (id.startsWith('chest_')) {
      consider(
        { kind: 'chest', id, label: '打开箱子', x: node.x, y: node.y, durationSec: BASE_CHANNEL },
        3,
      );
      continue;
    }
    const def = RESOURCE_NODES[node.type];
    if (!def) continue;
    const depleted = (state.world.nodeStates[id]?.remaining ?? def.maxHits) <= 0;
    consider(
      {
        kind: 'node',
        id,
        label: depleted ? `${def.name}（已采空）` : `采集 ${def.name}`,
        x: node.x,
        y: node.y,
        durationSec: nodeDuration(state, id),
      },
      4,
    );
  }

  for (const loot of state.world.groundLoot) {
    if (loot.x === undefined || loot.y === undefined) continue;
    if (distance(px, py, loot.x, loot.y) > PICKUP_RADIUS) continue;
    const name = ITEMS[loot.baseId]?.name ?? loot.baseId;
    consider(
      {
        kind: 'groundLoot',
        id: loot.baseId,
        label: `拾取 ${name}`,
        x: loot.x,
        y: loot.y,
        durationSec: BASE_CHANNEL,
      },
      5,
    );
  }

  if (options.onWater) {
    consider(
      { kind: 'water', id: 'water', label: '喝水', x: px, y: py, durationSec: WATER_CHANNEL },
      6,
    );
  }

  return best;
}

/** Adds loot to the backpack and leaves anything that does not fit on the ground. */
export function collectLoot(state: GameState, items: ItemStack[], x: number, y: number): number {
  let leftoverTotal = 0;
  for (const item of items) {
    const result = addItem(state, item.baseId, item.count);
    leftoverTotal += result.leftover;
    if (result.leftover > 0) {
      state.world.groundLoot.push({ baseId: item.baseId, count: result.leftover, x, y });
    }
  }
  return leftoverTotal;
}

/** Removes one ground-loot stack (or part of it) and adds it to the backpack. */
export function pickUpGroundLoot(state: GameState, baseId: string): boolean {
  const index = state.world.groundLoot.findIndex((item) => item.baseId === baseId);
  if (index < 0) return false;
  const loot = state.world.groundLoot[index];
  const result = addItem(state, loot.baseId, loot.count);
  if (result.added <= 0) return false;
  loot.count -= result.added;
  if (loot.count <= 0) state.world.groundLoot.splice(index, 1);
  return true;
}
