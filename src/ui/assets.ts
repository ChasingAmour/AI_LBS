/**
 * Sprite lookup for world objects. Keeps tilesheet frame indices in one place
 * so gameplay code never hard-codes a magic number from a Kenney sheet.
 */

export const TEXTURE = {
  town: 'town',
  battle: 'battle',
  dungeon: 'dungeon',
  farm: 'farm',
  uiLarge: 'ui-large',
  uiSmall: 'ui-small',
} as const;

export interface NodeSpriteSpec {
  texture: string;
  frame?: number;
}

export interface BuildingSpriteSpec {
  texture: string;
  frame?: number;
  w: number;
  h: number;
}

const NODE_SPRITES: Record<string, NodeSpriteSpec> = {
  // Tiny Town 27/28 are broadleaf trees; the tropical palm is hand-drawn.
  tree: { texture: TEXTURE.town, frame: 28 },
  palm: { texture: 'palm' },
  rock: { texture: TEXTURE.farm, frame: 77 },
  vine: { texture: TEXTURE.farm, frame: 39 },
  berry: { texture: TEXTURE.farm, frame: 78 },
  tide: { texture: TEXTURE.battle, frame: 73 },
  clay: { texture: TEXTURE.farm, frame: 48 },
  chest: { texture: TEXTURE.dungeon, frame: 101 },
};

const DEPLETED_SPRITES: Record<string, NodeSpriteSpec> = {
  // A felled tree leaves a stump-like bush rather than vanishing.
  tree: { texture: TEXTURE.farm, frame: 39 },
};

const BUILDING_SPRITES: Record<string, BuildingSpriteSpec> = {
  flag: { texture: 'flag', w: 14, h: 20 },
  shelter: { texture: 'hut', w: 64, h: 64 },
  tent: { texture: 'hut', w: 64, h: 64 },
  campfire: { texture: TEXTURE.dungeon, frame: 29, w: 16, h: 16 },
  workbench: { texture: TEXTURE.farm, frame: 98, w: 16, h: 16 },
  storage: { texture: TEXTURE.dungeon, frame: 101, w: 16, h: 16 },
  cage: { texture: TEXTURE.farm, frame: 74, w: 16, h: 16 },
  fence: { texture: TEXTURE.town, frame: 45, w: 16, h: 16 },
  stone_wall: { texture: TEXTURE.battle, frame: 96, w: 16, h: 16 },
  drying_rack: { texture: TEXTURE.town, frame: 46, w: 16, h: 16 },
};

const FALLBACK_NODE: NodeSpriteSpec = { texture: TEXTURE.farm, frame: 78 };
const FALLBACK_BUILDING: BuildingSpriteSpec = { texture: TEXTURE.dungeon, frame: 101, w: 16, h: 16 };

/** Hand-drawn animal textures created in IslandScene.makeWorldTextures. */
const ANIMAL_SPRITES: Record<string, { texture: string }> = {
  chicken: { texture: 'animal-chicken' },
  rabbit: { texture: 'animal-rabbit' },
  boar: { texture: 'animal-boar' },
};

export function animalSprite(type: string): { texture: string } {
  return ANIMAL_SPRITES[type] ?? { texture: 'animal-chicken' };
}

/** Procedural hatch drawn in IslandScene, deliberately not the campfire frame. */
export const ENTRANCE_TEXTURE = 'wreck-hatch';

export function entranceSprite(): { texture: string } {
  return { texture: ENTRANCE_TEXTURE };
}

export function nodeSprite(type: string, depleted = false): NodeSpriteSpec {
  if (depleted && DEPLETED_SPRITES[type]) return DEPLETED_SPRITES[type];
  return NODE_SPRITES[type] ?? FALLBACK_NODE;
}

export function buildingSprite(type: string): BuildingSpriteSpec {
  return BUILDING_SPRITES[type] ?? FALLBACK_BUILDING;
}
