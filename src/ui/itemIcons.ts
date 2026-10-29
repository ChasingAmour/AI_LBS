import type Phaser from 'phaser';
import { EQUIPMENT } from '../data/equipment';
import { ITEMS } from '../data/items';

export interface ItemIcon {
  texture: string;
  frame?: number;
}

/** Items taken straight from the Kenney sheets. */
const SHEET_ICONS: Record<string, ItemIcon> = {
  coconut: { texture: 'farm', frame: 7 },
  berries: { texture: 'farm', frame: 78 },
  stone: { texture: 'farm', frame: 77 },
  vine: { texture: 'farm', frame: 39 },
  clay: { texture: 'farm', frame: 79 },
  cloth: { texture: 'farm', frame: 70 },
  stone_axe: { texture: 'farm', frame: 88 },
  stone_pick: { texture: 'farm', frame: 87 },
};

const GENERATED = new Set([
  'wood',
  'flint',
  'shell',
  'raw_fish',
  'cooked_fish',
  'dried_fish',
  'fish_stew',
  'meat_stew',
  'roast_coconut',
  'seaweed_salad',
  'berry_jam',
  'coconut_milk',
  'shell_soup',
  'bandage',
  'herbal_poultice',
  'coconut_salve',
  'copper_axe',
  'copper_pick',
  'iron_axe',
  'iron_pick',
  'lantern',
  'torch',
  'club',
  'spear',
  'stick',
  'rope',
  'coral_dagger',
  'captain_cutlass',
  'sea_snake_spear',
  'anchor_hammer',
  'fishing_rod',
  'tropical_fish',
  'seaweed',
  'waterskin',
  'hide',
  'leather',
  'feather',
  'venom_sac',
  'turtle_shell',
  'antler',
  'crab_meat',
  'jellyfish',
  'crab_soup',
  'jelly_salad',
]);

/** Hand-drawn 16×16 icons for items the sheets do not cover. */
export function ensureItemIcons(scene: Phaser.Scene): void {
  if (scene.textures.exists('icon-wood')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const make = (key: string, paint: () => void) => {
    paint();
    g.generateTexture(key, 16, 16);
    g.clear();
  };

  make('icon-wood', () => {
    g.fillStyle(0x6b4420).fillRect(2, 5, 12, 6);
    g.fillStyle(0xc9a24a).fillRect(3, 6, 10, 4);
    g.fillStyle(0x8a5a2b).fillRect(4, 7, 2, 2).fillRect(9, 7, 2, 2);
  });
  make('icon-flint', () => {
    g.fillStyle(0x8a97a8).fillTriangle(8, 2, 3, 12, 12, 9);
    g.fillStyle(0xc9d4e0).fillTriangle(8, 4, 6, 9, 10, 8);
  });
  make('icon-shell', () => {
    g.fillStyle(0xf0d8c0).fillTriangle(8, 13, 2, 4, 14, 4);
    g.fillStyle(0xc9a24a).fillRect(7, 4, 2, 9);
    g.lineStyle(1, 0xb08a5a, 1).lineBetween(8, 13, 4, 4).lineBetween(8, 13, 12, 4);
  });
  make('icon-raw_fish', () => {
    g.fillStyle(0x3f8fd0).fillEllipse(7, 8, 12, 6);
    g.fillStyle(0x2f6f9f).fillTriangle(13, 8, 16, 5, 16, 11);
    g.fillStyle(0xffffff).fillRect(3, 7, 2, 2);
  });
  make('icon-cooked_fish', () => {
    g.fillStyle(0xb8783a).fillEllipse(7, 8, 12, 6);
    g.fillStyle(0x8a5a2b).fillTriangle(13, 8, 16, 5, 16, 11);
    g.fillStyle(0xffe9a8).fillRect(3, 7, 2, 2);
  });
  make('icon-dried_fish', () => {
    g.fillStyle(0x9a6f3a).fillEllipse(7, 8, 12, 5);
    g.fillStyle(0x6b4420).fillTriangle(13, 8, 16, 6, 16, 10);
    g.fillStyle(0xd8b25a).fillRect(3, 7, 2, 2);
  });
  make('icon-fish_stew', () => {
    g.fillStyle(0x6b4420).fillEllipse(8, 11, 13, 6);
    g.fillStyle(0xc9a24a).fillEllipse(8, 9, 13, 5);
    g.fillStyle(0xe0913f).fillEllipse(7, 8, 6, 3);
    g.fillStyle(0xf7f1e3).fillRect(4, 8, 2, 1);
    g.fillStyle(0x4f9f5f).fillRect(10, 8, 2, 1);
  });
  make('icon-meat_stew', () => {
    g.fillStyle(0x6b4420).fillEllipse(8, 11, 13, 6);
    g.fillStyle(0xc9a24a).fillEllipse(8, 9, 13, 5);
    g.fillStyle(0x8a4a24).fillEllipse(7, 8, 6, 3);
    g.fillStyle(0xb8783a).fillRect(6, 7, 3, 1);
    g.fillStyle(0x4f9f5f).fillRect(10, 8, 2, 1);
  });
  make('icon-roast_coconut', () => {
    g.fillStyle(0x6b4420).fillCircle(8, 8, 6);
    g.fillStyle(0x8a5a2b).fillCircle(8, 8, 4);
    g.fillStyle(0x4a2e14).fillRect(5, 6, 6, 1).fillRect(5, 9, 6, 1);
    g.fillStyle(0xf7f1e3).fillRect(7, 8, 2, 2);
  });
  make('icon-seaweed_salad', () => {
    g.fillStyle(0x6b4420).fillEllipse(8, 11, 13, 6);
    g.fillStyle(0xc9a24a).fillEllipse(8, 9, 13, 5);
    g.fillStyle(0x2f6b3f).fillRect(4, 6, 3, 4).fillRect(8, 5, 3, 5);
    g.fillStyle(0x4f9f5f).fillRect(6, 7, 2, 3).fillRect(10, 6, 2, 4);
    g.fillStyle(0xb03a2e).fillRect(5, 8, 2, 2).fillRect(10, 8, 2, 2);
  });
  make('icon-berry_jam', () => {
    g.fillStyle(0x8a5a2b).fillRect(4, 5, 8, 9);
    g.fillStyle(0xc9a24a).fillRect(3, 3, 10, 2);
    g.fillStyle(0xb03a2e).fillRect(5, 7, 6, 6);
    g.fillStyle(0xd4533f).fillRect(5, 7, 6, 2);
    g.fillStyle(0xffd479).fillRect(7, 10, 2, 1);
  });
  make('icon-coconut_milk', () => {
    g.fillStyle(0x6b4420).fillRect(3, 6, 10, 7);
    g.fillStyle(0x8a5a2b).fillRect(3, 5, 10, 2);
    g.fillStyle(0xf7f1e3).fillRect(4, 7, 8, 4);
    g.fillStyle(0xf0e6d2).fillRect(8, 2, 2, 6);
    g.fillStyle(0xc9a24a).fillRect(9, 2, 1, 6);
  });
  make('icon-shell_soup', () => {
    g.fillStyle(0x6b4420).fillEllipse(8, 11, 13, 6);
    g.fillStyle(0xc9a24a).fillEllipse(8, 9, 13, 5);
    g.fillStyle(0xf0d8c0).fillTriangle(7, 10, 3, 6, 11, 6);
    g.fillStyle(0xc9a24a).fillRect(7, 6, 2, 4);
    g.fillStyle(0x4f9f5f).fillRect(10, 7, 2, 2);
  });
  make('icon-stick', () => {
    g.fillStyle(0x8a5a2b).fillRect(4, 4, 2, 10);
    g.fillStyle(0xc9a24a).fillRect(4, 4, 1, 9);
  });
  make('icon-rope', () => {
    g.lineStyle(2, 0xc9a24a, 1).strokeCircle(8, 8, 5);
    g.lineStyle(1, 0x8a5a2b, 1).strokeCircle(8, 8, 3);
  });
  make('icon-bandage', () => {
    g.fillStyle(0xf0e6d2).fillRect(3, 5, 10, 6);
    g.fillStyle(0xd0c0a0).fillRect(5, 5, 2, 6).fillRect(9, 5, 2, 6);
  });
  make('icon-herbal_poultice', () => {
    g.fillStyle(0x2f6b3f).fillEllipse(8, 9, 12, 7);
    g.fillStyle(0x4f9f5f).fillEllipse(7, 7, 8, 4);
    g.fillStyle(0xf0e6d2).fillRect(5, 8, 6, 3);
    g.fillStyle(0x6fbf4f).fillRect(6, 7, 1, 2).fillRect(9, 9, 1, 2);
  });
  make('icon-coconut_salve', () => {
    g.fillStyle(0x8a5a2b).fillRect(4, 6, 8, 8);
    g.fillStyle(0xc9a24a).fillRect(3, 4, 10, 2);
    g.fillStyle(0x6fbf4f).fillRect(5, 8, 6, 4);
    g.fillStyle(0x4f9f5f).fillRect(6, 9, 2, 2).fillRect(9, 8, 1, 3);
  });
  make('icon-torch', () => {
    g.fillStyle(0x6b4420).fillRect(7, 7, 2, 8);
    g.fillStyle(0xd9772f).fillTriangle(8, 1, 5, 8, 11, 8);
    g.fillStyle(0xffd479).fillTriangle(8, 3, 7, 7, 9, 7);
  });
  make('icon-club', () => {
    g.fillStyle(0x8a5a2b).fillRect(6, 2, 5, 10);
    g.fillStyle(0x6b4420).fillRect(7, 10, 3, 4);
    g.fillStyle(0xc9a24a).fillRect(7, 3, 2, 8);
  });
  make('icon-spear', () => {
    g.fillStyle(0x8a5a2b).fillRect(7, 4, 2, 11);
    g.fillStyle(0x8a97a8).fillTriangle(8, 1, 5, 6, 11, 6);
  });
  make('icon-weapon', () => {
    g.fillStyle(0xc9d4e0).fillRect(7, 2, 2, 9);
    g.fillStyle(0x8a97a8).fillRect(5, 3, 6, 2);
    g.fillStyle(0x6b4420).fillRect(6, 11, 4, 1).fillRect(7, 12, 2, 2);
  });
  make('icon-armor', () => {
    g.fillStyle(0x6f8fa8).fillRect(4, 4, 8, 8);
    g.fillStyle(0x8aa8c0).fillRect(3, 3, 3, 3).fillRect(10, 3, 3, 3);
    g.fillStyle(0x4f6f88).fillRect(5, 6, 6, 4);
  });
  make('icon-boots', () => {
    g.fillStyle(0x8a5a2b).fillRect(4, 4, 4, 8);
    g.fillStyle(0x6b4420).fillRect(4, 10, 8, 3);
    g.fillStyle(0xc9a24a).fillRect(4, 6, 4, 1);
  });
  make('icon-raw_meat', () => {
    g.fillStyle(0xb04a3a).fillEllipse(8, 9, 11, 8);
    g.fillStyle(0xd86a52).fillEllipse(7, 7, 7, 4);
    g.fillStyle(0xf0e6d2).fillRect(11, 10, 4, 2);
    g.fillStyle(0xf7f1e3).fillCircle(14, 11, 2);
  });
  make('icon-cooked_meat', () => {
    g.fillStyle(0x8a4a24).fillEllipse(8, 9, 11, 8);
    g.fillStyle(0xb8783a).fillEllipse(7, 7, 7, 4);
    g.fillStyle(0x5a2e14).fillRect(4, 7, 8, 1).fillRect(4, 10, 8, 1);
  });
  make('icon-dried_meat', () => {
    g.fillStyle(0x7a3a1e).fillRect(3, 5, 10, 3);
    g.fillStyle(0x9a5a2e).fillRect(3, 9, 10, 3);
    g.fillStyle(0x4a2410).fillRect(5, 6, 1, 5).fillRect(9, 6, 1, 5);
  });
  make('icon-copper_ore', () => {
    g.fillStyle(0x8a8378).fillTriangle(8, 2, 2, 12, 14, 12);
    g.fillStyle(0xc9793a).fillRect(6, 7, 2, 2).fillRect(9, 9, 2, 2);
  });
  make('icon-iron_ore', () => {
    g.fillStyle(0x7d8188).fillTriangle(8, 2, 2, 12, 14, 12);
    g.fillStyle(0xb9c2cc).fillRect(6, 7, 2, 2).fillRect(9, 9, 2, 2);
  });
  make('icon-coal', () => {
    g.fillStyle(0x5c5a56).fillTriangle(8, 2, 2, 12, 14, 12);
    g.fillStyle(0x24231f).fillRect(6, 7, 2, 2).fillRect(9, 9, 2, 2);
  });
  make('icon-copper_ingot', () => {
    g.fillStyle(0xb87333).fillRect(3, 7, 10, 5);
    g.fillStyle(0xd9975a).fillRect(4, 6, 8, 2);
    g.fillStyle(0x8a4f1e).fillRect(3, 11, 10, 1);
  });
  make('icon-iron_ingot', () => {
    g.fillStyle(0x8a97a8).fillRect(3, 7, 10, 5);
    g.fillStyle(0xc9d4e0).fillRect(4, 6, 8, 2);
    g.fillStyle(0x6a7480).fillRect(3, 11, 10, 1);
  });
  make('icon-iron_axe', () => {
    g.fillStyle(0x8a5a2b).fillRect(7, 5, 2, 10);
    g.fillStyle(0xc9d4e0).fillTriangle(8, 3, 2, 5, 8, 9);
    g.fillStyle(0x8a97a8).fillTriangle(8, 4, 4, 5, 8, 8);
  });
  make('icon-copper_axe', () => {
    g.fillStyle(0x8a5a2b).fillRect(7, 5, 2, 10);
    g.fillStyle(0xc9793a).fillTriangle(8, 3, 2, 5, 8, 9);
    g.fillStyle(0xd9975a).fillTriangle(8, 4, 4, 5, 8, 8);
  });
  make('icon-copper_pick', () => {
    g.fillStyle(0x8a5a2b).fillRect(7, 5, 2, 10);
    g.fillStyle(0xc9793a).fillRect(2, 3, 12, 2);
    g.fillStyle(0xd9975a).fillRect(3, 3, 10, 1);
    g.fillStyle(0x8a4f1e).fillRect(7, 5, 2, 2);
  });
  make('icon-iron_pick', () => {
    g.fillStyle(0x8a5a2b).fillRect(7, 5, 2, 10);
    g.fillStyle(0xc9d4e0).fillRect(2, 3, 12, 2);
    g.fillStyle(0x8a97a8).fillRect(3, 4, 10, 1);
    g.fillStyle(0x6a7480).fillRect(7, 5, 2, 2);
  });
  make('icon-lantern', () => {
    g.fillStyle(0x8a97a8).fillRect(5, 3, 6, 1).fillRect(4, 4, 1, 9).fillRect(11, 4, 1, 9);
    g.fillStyle(0x6a7480).fillRect(4, 12, 8, 2);
    g.fillStyle(0xffd479).fillRect(5, 5, 6, 7);
    g.fillStyle(0xfff2b0).fillRect(7, 6, 2, 5);
  });
  make('icon-fishing_rod', () => {
    g.lineStyle(1, 0xc9a24a, 1);
    g.lineBetween(3, 13, 12, 2);
    g.lineStyle(1, 0xf0e6d2, 0.9);
    g.lineBetween(12, 2, 13, 12);
    g.fillStyle(0x8a97a8).fillRect(12, 12, 2, 2);
  });
  make('icon-tropical_fish', () => {
    g.fillStyle(0xe0913f).fillEllipse(7, 8, 12, 7);
    g.fillStyle(0xffd479).fillRect(3, 5, 8, 2);
    g.fillStyle(0xe0913f).fillTriangle(13, 8, 16, 4, 16, 12);
    g.fillStyle(0xffffff).fillRect(12, 7, 2, 2);
    g.fillStyle(0x2b2118).fillRect(13, 7, 1, 1);
  });
  make('icon-seaweed', () => {
    g.fillStyle(0x2f6b3f).fillRect(5, 4, 2, 9);
    g.fillStyle(0x4f9f5f).fillRect(8, 3, 2, 10);
    g.fillStyle(0x2f6b3f).fillRect(11, 6, 2, 7);
    g.fillStyle(0x6fbf4f).fillRect(6, 7, 1, 3).fillRect(9, 8, 1, 3);
  });
  make('icon-waterskin', () => {
    g.fillStyle(0x8a5a2b).fillCircle(8, 9, 5);
    g.fillStyle(0xc9a24a).fillRect(7, 2, 2, 5);
    g.fillStyle(0x6b4420).fillRect(5, 12, 6, 2);
    g.fillStyle(0x3f8fd0).fillRect(6, 8, 4, 3);
  });
  make('icon-hide', () => {
    g.fillStyle(0x8a5a2b).fillPoints(
      [
        { x: 3, y: 4 },
        { x: 13, y: 3 },
        { x: 12, y: 12 },
        { x: 4, y: 13 },
      ],
      true,
    );
    g.fillStyle(0xc9a24a).fillRect(6, 6, 4, 4);
    g.fillStyle(0x6b4420).fillRect(4, 10, 2, 2);
  });
  make('icon-leather', () => {
    g.fillStyle(0x9a6a3a).fillRect(3, 4, 10, 8);
    g.fillStyle(0xc9a24a).fillRect(4, 5, 8, 2);
    g.fillStyle(0x6b4420).fillRect(5, 9, 6, 1);
    g.fillStyle(0xf0e6d2).fillRect(6, 7, 1, 1).fillRect(10, 7, 1, 1);
  });
  make('icon-feather', () => {
    g.fillStyle(0xf0e6d2).fillTriangle(10, 2, 5, 11, 12, 9);
    g.fillStyle(0xc9d4e0).fillRect(8, 5, 1, 6);
    g.fillStyle(0x8a97a8).fillRect(8, 12, 2, 2);
  });
  make('icon-venom_sac', () => {
    g.fillStyle(0x6fbf4f).fillEllipse(8, 9, 10, 8);
    g.fillStyle(0x4f9f5f).fillEllipse(7, 7, 6, 4);
    g.fillStyle(0x2b2118).fillRect(7, 3, 2, 3);
    g.fillStyle(0xd8ff8a).fillRect(6, 9, 2, 2);
  });
  make('icon-turtle_shell', () => {
    g.fillStyle(0x6f8f5f).fillEllipse(8, 8, 13, 10);
    g.fillStyle(0x4f6f3f).fillRect(4, 7, 8, 1).fillRect(7, 4, 1, 8);
    g.fillStyle(0xc9a24a).fillRect(2, 10, 2, 2).fillRect(12, 10, 2, 2);
  });
  make('icon-antler', () => {
    g.fillStyle(0xc9a24a).fillRect(7, 5, 2, 9);
    g.fillStyle(0xe0c07a).fillRect(4, 2, 2, 5).fillRect(7, 3, 2, 2).fillRect(10, 2, 2, 5);
    g.fillStyle(0x8a6a3c).fillRect(5, 6, 2, 1).fillRect(9, 6, 2, 1);
  });
  make('icon-crab_meat', () => {
    g.fillStyle(0xd86a52).fillEllipse(8, 9, 10, 7);
    g.fillStyle(0xf0a080).fillEllipse(7, 7, 5, 3);
    g.fillStyle(0xf0e6d2).fillRect(4, 11, 2, 2).fillRect(10, 11, 2, 2);
  });
  make('icon-jellyfish', () => {
    g.fillStyle(0xc9a0e0).fillEllipse(8, 6, 11, 7);
    g.fillStyle(0xe8d0f8).fillRect(4, 5, 8, 3);
    g.fillStyle(0xc9a0e0).fillRect(5, 9, 1, 5).fillRect(8, 9, 1, 6).fillRect(11, 9, 1, 4);
  });
  make('icon-crab_soup', () => {
    g.fillStyle(0x6b4420).fillEllipse(8, 11, 13, 6);
    g.fillStyle(0xc9a24a).fillEllipse(8, 9, 13, 5);
    g.fillStyle(0xd86a52).fillEllipse(7, 8, 6, 3);
    g.fillStyle(0xf0e6d2).fillRect(4, 8, 2, 1);
  });
  make('icon-jelly_salad', () => {
    g.fillStyle(0x6b4420).fillEllipse(8, 11, 13, 6);
    g.fillStyle(0xc9a24a).fillEllipse(8, 9, 13, 5);
    g.fillStyle(0x2f6b3f).fillRect(4, 6, 3, 4).fillRect(9, 5, 3, 5);
    g.fillStyle(0xc9a0e0).fillEllipse(7, 7, 4, 3);
  });

  for (const base of Object.values(EQUIPMENT)) {
    const key = `icon-${base.id}`;
    if (scene.textures.exists(key)) continue;
    paintEquipmentIcon(g, base.id);
    g.generateTexture(key, 16, 16);
    g.clear();
  }
  g.destroy();
}

/** One silhouette per equipment base, so loot and crafted gear never share art. */
function paintEquipmentIcon(g: Phaser.GameObjects.Graphics, id: string): void {
  switch (id) {
    case 'coral_dagger':
      g.fillStyle(0xd86a8a).fillTriangle(9, 2, 6, 11, 11, 11);
      g.fillStyle(0xf09ab0).fillRect(9, 3, 2, 6);
      g.fillStyle(0xc9a24a).fillRect(4, 10, 9, 2);
      g.fillStyle(0x6b4420).fillRect(4, 11, 3, 4);
      break;
    case 'captain_cutlass':
      g.fillStyle(0xc9d4e0).fillPoints(
        [
          { x: 10, y: 2 },
          { x: 13, y: 4 },
          { x: 9, y: 12 },
          { x: 6, y: 12 },
          { x: 8, y: 6 },
        ],
        true,
      );
      g.fillStyle(0xc9a24a).fillRect(4, 11, 9, 2);
      g.fillStyle(0x6b4420).fillRect(3, 12, 3, 3);
      break;
    case 'sea_snake_spear':
      g.fillStyle(0xd8d0b8).fillRect(7, 4, 2, 11);
      g.fillStyle(0xf7f1e3).fillTriangle(8, 1, 5, 6, 11, 6);
      g.fillStyle(0xb03a2e).fillRect(6, 6, 4, 1);
      break;
    case 'anchor_hammer':
      g.fillStyle(0x6b4420).fillRect(7, 4, 2, 10);
      g.fillStyle(0x8a97a8).fillRect(3, 2, 10, 4);
      g.fillStyle(0x6a7480).fillRect(3, 5, 10, 1);
      g.fillStyle(0xc9a24a).fillRect(6, 6, 4, 1);
      break;
    case 'copper_spear':
      g.fillStyle(0x8a5a2b).fillRect(7, 3, 2, 12);
      g.fillStyle(0xc9793a).fillTriangle(8, 1, 5, 6, 11, 6);
      g.fillStyle(0xd9975a).fillRect(7, 2, 1, 4);
      break;
    case 'iron_spear':
      g.fillStyle(0x8a5a2b).fillRect(7, 3, 2, 12);
      g.fillStyle(0xc9d4e0).fillTriangle(8, 1, 5, 6, 11, 6);
      g.fillStyle(0x8a97a8).fillRect(7, 2, 1, 4);
      break;
    case 'vine_armor':
      g.fillStyle(0x2f6b3f).fillRect(3, 5, 10, 8);
      g.fillStyle(0x4f9f5f).fillRect(3, 4, 3, 3).fillRect(10, 4, 3, 3);
      g.fillStyle(0x6fbf4f).fillRect(5, 7, 6, 1).fillRect(5, 9, 6, 1);
      g.fillStyle(0x8a5a2b).fillRect(7, 6, 2, 7);
      break;
    case 'shell_armor':
      g.fillStyle(0xf0d8c0).fillRect(3, 4, 10, 9);
      g.fillStyle(0xfff2df).fillRect(3, 4, 3, 3).fillRect(10, 4, 3, 3);
      g.fillStyle(0xc9a24a).fillRect(5, 7, 2, 2).fillRect(9, 9, 2, 2);
      g.fillStyle(0xb08a5a).fillRect(7, 5, 1, 7);
      break;
    case 'canvas_armor':
      g.fillStyle(0xd8c49a).fillRect(3, 5, 10, 8);
      g.fillStyle(0xe8d8b0).fillRect(3, 4, 3, 3).fillRect(10, 4, 3, 3);
      g.fillStyle(0x8a6a3c).fillRect(7, 6, 1, 7).fillRect(5, 8, 6, 1);
      break;
    case 'captain_coat':
      g.fillStyle(0x2f4f7a).fillRect(3, 4, 10, 10);
      g.fillStyle(0x4a6a9a).fillRect(3, 4, 3, 3).fillRect(10, 4, 3, 3);
      g.fillStyle(0xc9a24a).fillRect(7, 5, 2, 8).fillRect(5, 7, 1, 1).fillRect(10, 9, 1, 1);
      g.fillStyle(0xf0e6d2).fillRect(5, 12, 6, 1);
      break;
    case 'copper_armor':
      g.fillStyle(0xb87333).fillRect(3, 4, 10, 10);
      g.fillStyle(0xd9975a).fillRect(4, 5, 8, 3).fillRect(3, 4, 3, 3).fillRect(10, 4, 3, 3);
      g.fillStyle(0x8a4f1e).fillRect(5, 9, 1, 1).fillRect(10, 9, 1, 1);
      break;
    case 'iron_armor':
      g.fillStyle(0x8a97a8).fillRect(3, 4, 10, 10);
      g.fillStyle(0xc9d4e0).fillRect(4, 5, 8, 3).fillRect(3, 4, 3, 3).fillRect(10, 4, 3, 3);
      g.fillStyle(0x6a7480).fillRect(5, 9, 1, 1).fillRect(10, 9, 1, 1);
      break;
    case 'straw_shoes':
      g.fillStyle(0xc9a24a).fillRect(3, 10, 5, 3).fillRect(9, 10, 5, 3);
      g.fillStyle(0x8a6a3c).fillRect(4, 9, 1, 2).fillRect(10, 9, 1, 2);
      g.fillStyle(0xe0c07a).fillRect(4, 11, 3, 1).fillRect(10, 11, 3, 1);
      break;
    case 'wading_shoes':
      g.fillStyle(0x2f6b3f).fillRect(3, 8, 4, 6).fillRect(9, 8, 4, 6);
      g.fillStyle(0x4f9f5f).fillRect(3, 9, 4, 1).fillRect(9, 9, 4, 1);
      g.fillStyle(0x6fbf4f).fillRect(4, 11, 3, 1).fillRect(10, 11, 3, 1);
      break;
    case 'canvas_boots':
      g.fillStyle(0xd8c49a).fillRect(3, 8, 4, 6).fillRect(9, 8, 4, 6);
      g.fillStyle(0x8a6a3c).fillRect(3, 13, 4, 1).fillRect(9, 13, 4, 1);
      g.fillStyle(0xa88a5a).fillRect(4, 9, 3, 1).fillRect(10, 9, 3, 1);
      break;
    case 'captain_boots':
      g.fillStyle(0x4a2e14).fillRect(3, 7, 4, 7).fillRect(9, 7, 4, 7);
      g.fillStyle(0x2b1d12).fillRect(3, 13, 4, 1).fillRect(9, 13, 4, 1);
      g.fillStyle(0xc9a24a).fillRect(4, 8, 3, 1).fillRect(10, 8, 3, 1);
      break;
    case 'antler_spear':
      g.fillStyle(0x8a5a2b).fillRect(7, 4, 2, 11);
      g.fillStyle(0xc9a24a).fillRect(5, 2, 2, 6).fillRect(9, 2, 2, 6);
      g.fillStyle(0xe0c07a).fillTriangle(8, 1, 5, 5, 11, 5);
      break;
    case 'venom_spear':
      g.fillStyle(0x8a5a2b).fillRect(7, 4, 2, 11);
      g.fillStyle(0x6fbf4f).fillTriangle(8, 1, 5, 6, 11, 6);
      g.fillStyle(0xd8ff8a).fillRect(7, 2, 1, 4);
      g.fillStyle(0x4f9f5f).fillRect(6, 6, 4, 1);
      break;
    case 'leather_armor':
      g.fillStyle(0x9a6a3a).fillRect(3, 5, 10, 8);
      g.fillStyle(0xc9a24a).fillRect(3, 4, 3, 3).fillRect(10, 4, 3, 3);
      g.fillStyle(0x6b4420).fillRect(7, 6, 1, 7).fillRect(4, 8, 8, 1);
      break;
    case 'feather_cloak':
      g.fillStyle(0xd8cfb6).fillRect(3, 4, 10, 10);
      g.fillStyle(0xf0e6d2).fillRect(3, 4, 3, 3).fillRect(10, 4, 3, 3);
      g.fillStyle(0xc9a24a).fillRect(7, 5, 2, 8);
      g.fillStyle(0x8a97a8).fillRect(5, 8, 1, 4).fillRect(10, 7, 1, 5);
      break;
    case 'leather_boots':
      g.fillStyle(0x9a6a3a).fillRect(3, 8, 4, 6).fillRect(9, 8, 4, 6);
      g.fillStyle(0x6b4420).fillRect(3, 13, 4, 1).fillRect(9, 13, 4, 1);
      g.fillStyle(0xc9a24a).fillRect(4, 9, 3, 1).fillRect(10, 9, 3, 1);
      break;
  }
}

/** Item icon lookup; equipment has a unique icon per base. */
export function itemIcon(baseId: string | null | undefined): ItemIcon | null {
  if (!baseId) return null;
  if (SHEET_ICONS[baseId]) return SHEET_ICONS[baseId];
  if (GENERATED.has(baseId)) return { texture: `icon-${baseId}` };
  const equip = EQUIPMENT[baseId];
  if (equip) return { texture: `icon-${equip.id}` };
  if (ITEMS[baseId]) return { texture: `icon-${baseId}` };
  return null;
}
