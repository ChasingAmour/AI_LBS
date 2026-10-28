import { BUILDINGS } from '../data/buildings';
import { ANIMALS } from '../data/animals';
import { CAMP_LEVELS, CAMP_MAX_LEVEL } from '../data/campLevels';
import { EQUIPMENT } from '../data/equipment';
import { ITEMS } from '../data/items';
import { RECIPES } from '../data/recipes';
import { RESOURCE_NODES, UNIQUE_CHESTS } from '../data/spawns';
import { WEAPONS } from '../data/weapons';

/**
 * Cross-checks every data table reference. Returns human-readable errors;
 * an empty array means the content set is internally consistent.
 */
export function validateGameData(): string[] {
  const errors: string[] = [];
  const hasItem = (id: string): boolean => Boolean(ITEMS[id]);
  const hasOutput = (id: string): boolean => Boolean(ITEMS[id] || EQUIPMENT[id]);

  for (const recipe of Object.values(RECIPES)) {
    if (!hasOutput(recipe.output)) {
      errors.push(`配方 ${recipe.id} 的产物 ${recipe.output} 不存在`);
    }
    if (recipe.unlockLevel < 0 || recipe.unlockLevel > CAMP_MAX_LEVEL) {
      errors.push(`配方 ${recipe.id} 的解锁等级 ${recipe.unlockLevel} 超出范围`);
    }
    for (const input of recipe.inputs) {
      if (!hasItem(input.baseId)) {
        errors.push(`配方 ${recipe.id} 的材料 ${input.baseId} 不存在`);
      }
      if (input.count <= 0) {
        errors.push(`配方 ${recipe.id} 的材料 ${input.baseId} 数量无效`);
      }
    }
  }

  for (const building of Object.values(BUILDINGS)) {
    if (building.hp <= 0) errors.push(`建筑 ${building.id} 的耐久无效`);
    if (building.unlockLevel < 0 || building.unlockLevel > CAMP_MAX_LEVEL) {
      errors.push(`建筑 ${building.id} 的解锁等级超出范围`);
    }
    for (const cost of building.cost) {
      if (!hasItem(cost.baseId)) {
        errors.push(`建筑 ${building.id} 的成本 ${cost.baseId} 不存在`);
      }
      if (cost.count <= 0) errors.push(`建筑 ${building.id} 的成本数量无效`);
    }
  }

  let previousCap = 0;
  for (const level of CAMP_LEVELS) {
    if (level.captiveCap <= previousCap) {
      errors.push(`营地 Lv${level.level} 的囚犯上限没有递增`);
    }
    previousCap = level.captiveCap;
    for (const requirement of level.requires) {
      if (!BUILDINGS[requirement.type]) {
        errors.push(`营地 Lv${level.level} 引用了未知建筑 ${requirement.type}`);
      }
      if (requirement.count <= 0) {
        errors.push(`营地 Lv${level.level} 的建筑数量无效`);
      }
    }
  }

  for (const node of Object.values(RESOURCE_NODES)) {
    for (const drop of [...node.drops, ...(node.depleteDrops ?? [])]) {
      if (!hasItem(drop.baseId)) {
        errors.push(`资源节点 ${node.type} 的产出 ${drop.baseId} 不存在`);
      }
      if (drop.min < 0 || drop.max < drop.min) {
        errors.push(`资源节点 ${node.type} 的产出数量无效`);
      }
    }
    if (node.tool && !hasItem(node.tool)) {
      errors.push(`资源节点 ${node.type} 的工具 ${node.tool} 不存在`);
    }
  }

  for (const chest of Object.values(UNIQUE_CHESTS)) {
    for (const item of chest.items) {
      if (!hasItem(item.baseId)) {
        errors.push(`宝箱 ${chest.id} 的物资 ${item.baseId} 不存在`);
      }
    }
  }

  for (const weapon of Object.values(WEAPONS)) {
    if (weapon.damage < 0 || weapon.stun < 0) {
      errors.push(`武器 ${weapon.id} 的数值无效`);
    }
  }

  for (const animal of Object.values(ANIMALS)) {
    if (animal.hp <= 0) errors.push(`动物 ${animal.id} 的生命无效`);
    if (animal.habitat.length === 0) errors.push(`动物 ${animal.id} 没有栖息地`);
    for (const drop of animal.drops) {
      if (!hasItem(drop.baseId)) errors.push(`动物 ${animal.id} 的产出 ${drop.baseId} 不存在`);
      if (drop.min < 0 || drop.max < drop.min) {
        errors.push(`动物 ${animal.id} 的产出数量无效`);
      }
    }
  }

  for (const base of Object.values(EQUIPMENT)) {
    if (base.durability <= 0) errors.push(`装备 ${base.id} 的耐久无效`);
    if (base.weaponId && !WEAPONS[base.weaponId]) {
      errors.push(`装备 ${base.id} 引用了未知武器 ${base.weaponId}`);
    }
    if (!base.legendary?.id) errors.push(`装备 ${base.id} 缺少传说词条`);
  }

  return errors;
}
