/** Equipment bases, rarities, affixes and legendary traits (phase 2). */

export type EquipSlot = 'weapon' | 'armor' | 'boots';
export type Rarity = 'common' | 'fine' | 'rare' | 'epic' | 'legendary';
/** Crafted gear and dungeon loot are separate pools and never share a base. */
export type EquipSource = 'craft' | 'loot';

export interface LegendaryTrait {
  id: string;
  name: string;
  desc: string;
}

export interface EquipBase {
  id: string;
  name: string;
  slot: EquipSlot;
  /** Recipe output ('craft') or dungeon loot only ('loot'). */
  source: EquipSource;
  /** base durability at common rarity */
  durability: number;
  attack?: number;
  defense?: number;
  moveMul?: number;
  energyMax?: number;
  shallowImmune?: boolean;
  /** weapon pattern in data/weapons.ts */
  weaponId?: string;
  legendary: LegendaryTrait;
}

export const EQUIPMENT: Record<string, EquipBase> = {
  club: {
    id: 'club',
    name: '木棒',
    slot: 'weapon',
    source: 'craft',
    durability: 40,
    weaponId: 'club',
    legendary: { id: 'aftershock', name: '余震', desc: '命中额外 +15 眩晕' },
  },
  spear: {
    id: 'spear',
    name: '石矛',
    slot: 'weapon',
    source: 'craft',
    durability: 50,
    weaponId: 'spear',
    legendary: { id: 'sunder', name: '裂甲', desc: '突刺无视目标 50% 防御' },
  },
  coral_dagger: {
    id: 'coral_dagger',
    name: '珊瑚匕首',
    slot: 'weapon',
    source: 'loot',
    durability: 45,
    weaponId: 'coral_dagger',
    legendary: { id: 'tidal_combo', name: '潮汐连击', desc: '第 3 段附加击退' },
  },
  captain_cutlass: {
    id: 'captain_cutlass',
    name: '船长弯刀',
    slot: 'weapon',
    source: 'loot',
    durability: 60,
    weaponId: 'captain_cutlass',
    legendary: { id: 'veteran', name: '老练', desc: '击杀后 2 秒攻速 +30%' },
  },
  sea_snake_spear: {
    id: 'sea_snake_spear',
    name: '海蛇骨矛',
    slot: 'weapon',
    source: 'loot',
    durability: 55,
    weaponId: 'sea_snake_spear',
    legendary: { id: 'venom', name: '毒牙', desc: '中毒可叠加 2 层' },
  },
  anchor_hammer: {
    id: 'anchor_hammer',
    name: '船锚锤',
    slot: 'weapon',
    source: 'loot',
    durability: 70,
    weaponId: 'anchor_hammer',
    legendary: { id: 'anchor', name: '锚定', desc: '命中使目标减速 40%，持续 2 秒' },
  },
  copper_spear: {
    id: 'copper_spear',
    name: '铜矛',
    slot: 'weapon',
    source: 'craft',
    durability: 55,
    weaponId: 'copper_spear',
    legendary: { id: 'copper_edge', name: '铜锋', desc: '对野人伤害 +10%' },
  },
  iron_spear: {
    id: 'iron_spear',
    name: '铁矛',
    slot: 'weapon',
    source: 'craft',
    durability: 70,
    weaponId: 'iron_spear',
    legendary: { id: 'ironclad', name: '精铁', desc: '突刺伤害 +20%' },
  },
  vine_armor: {
    id: 'vine_armor',
    name: '藤甲',
    slot: 'armor',
    source: 'craft',
    durability: 80,
    defense: 4,
    legendary: { id: 'thorns', name: '荆棘', desc: '反伤 +6' },
  },
  shell_armor: {
    id: 'shell_armor',
    name: '贝壳甲',
    slot: 'armor',
    source: 'craft',
    durability: 90,
    defense: 6,
    moveMul: 0.97,
    legendary: { id: 'hard_shell', name: '硬壳', desc: '受到伤害 -3（与防御叠加）' },
  },
  canvas_armor: {
    id: 'canvas_armor',
    name: '帆布衣',
    slot: 'armor',
    source: 'craft',
    durability: 70,
    defense: 3,
    energyMax: 10,
    legendary: { id: 'light_kit', name: '轻装', desc: '精力消耗 -15%' },
  },
  captain_coat: {
    id: 'captain_coat',
    name: '船长外套',
    slot: 'armor',
    source: 'loot',
    durability: 100,
    defense: 8,
    legendary: { id: 'old_sailor', name: '老练水手', desc: '免疫浅水减速与漏水舱减速' },
  },
  copper_armor: {
    id: 'copper_armor',
    name: '铜甲',
    slot: 'armor',
    source: 'craft',
    durability: 100,
    defense: 9,
    moveMul: 0.98,
    legendary: { id: 'copper_guard', name: '铜壁', desc: '防御 +4' },
  },
  straw_shoes: {
    id: 'straw_shoes',
    name: '草鞋',
    slot: 'boots',
    source: 'craft',
    durability: 50,
    moveMul: 1.05,
    legendary: { id: 'nimble', name: '轻快', desc: '奔跑精力消耗 -50%' },
  },
  wading_shoes: {
    id: 'wading_shoes',
    name: '藤编涉水鞋',
    slot: 'boots',
    source: 'craft',
    durability: 55,
    moveMul: 1.08,
    shallowImmune: true,
    legendary: { id: 'wave_walk', name: '踏浪', desc: '涉水时移速额外 +10%' },
  },
  canvas_boots: {
    id: 'canvas_boots',
    name: '帆布靴',
    slot: 'boots',
    source: 'craft',
    durability: 60,
    moveMul: 1.12,
    legendary: { id: 'long_haul', name: '长途', desc: '饱食消耗 -10%' },
  },
  captain_boots: {
    id: 'captain_boots',
    name: '船长皮靴',
    slot: 'boots',
    source: 'loot',
    durability: 70,
    moveMul: 1.18,
    legendary: { id: 'steady', name: '稳健', desc: '受击击退距离减半' },
  },
};

export const CRAFTED_EQUIPMENT = Object.values(EQUIPMENT).filter(
  (base) => base.source === 'craft',
);

export const LOOT_EQUIPMENT = Object.values(EQUIPMENT).filter((base) => base.source === 'loot');

/** Dungeon chests only roll these bases; crafted gear never drops from them. */
export const LOOT_EQUIPMENT_IDS = LOOT_EQUIPMENT.map((base) => base.id);

export const RARITY: Record<
  Rarity,
  { label: string; affixes: number; tier: number; color: number }
> = {
  common: { label: '普通', affixes: 0, tier: 1, color: 0xf0e6d2 },
  fine: { label: '精良', affixes: 1, tier: 2, color: 0x6fbf4f },
  rare: { label: '稀有', affixes: 2, tier: 3, color: 0x4f8fd0 },
  epic: { label: '史诗', affixes: 3, tier: 4, color: 0xa06fd0 },
  legendary: { label: '传说', affixes: 3, tier: 5, color: 0xffd479 },
};

export type AffixStat =
  | 'attack'
  | 'defense'
  | 'durabilityPct'
  | 'stunPct'
  | 'savagePct'
  | 'gatherPct'
  | 'movePct'
  | 'energyMax'
  | 'hungerPct'
  | 'thorns';

export interface AffixDef {
  id: string;
  name: string;
  stat: AffixStat;
  slots: EquipSlot[];
  /** T2, T3, T4, T5 values */
  values: [number, number, number, number];
}

export const AFFIXES: AffixDef[] = [
  { id: 'attack', name: '攻击力', stat: 'attack', slots: ['weapon'], values: [2, 4, 6, 9] },
  { id: 'stun', name: '眩晕伤害', stat: 'stunPct', slots: ['weapon'], values: [0.1, 0.2, 0.3, 0.4] },
  { id: 'savage', name: '对野人伤害', stat: 'savagePct', slots: ['weapon'], values: [0.1, 0.15, 0.2, 0.25] },
  { id: 'gather', name: '采集速度', stat: 'gatherPct', slots: ['weapon'], values: [0.1, 0.15, 0.2, 0.25] },
  { id: 'defense', name: '防御', stat: 'defense', slots: ['armor'], values: [1, 2, 4, 6] },
  { id: 'thorns', name: '受击反伤', stat: 'thorns', slots: ['armor'], values: [2, 4, 6, 8] },
  { id: 'energy', name: '精力上限', stat: 'energyMax', slots: ['armor', 'boots'], values: [10, 15, 20, 25] },
  { id: 'move', name: '移动速度', stat: 'movePct', slots: ['boots'], values: [0.03, 0.05, 0.08, 0.12] },
  { id: 'hunger', name: '饱食消耗', stat: 'hungerPct', slots: ['boots'], values: [-0.05, -0.1, -0.15, -0.2] },
  { id: 'durability', name: '耐久上限', stat: 'durabilityPct', slots: ['weapon', 'armor', 'boots'], values: [0.1, 0.2, 0.3, 0.4] },
];

export function affixesFor(slot: EquipSlot): AffixDef[] {
  return AFFIXES.filter((affix) => affix.slots.includes(slot));
}

export function equipmentBase(id: string): EquipBase | null {
  return EQUIPMENT[id] ?? null;
}
