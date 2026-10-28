import Phaser from 'phaser';
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
  'bandage',
  'torch',
  'club',
  'spear',
  'stick',
  'rope',
  'coral_dagger',
  'captain_cutlass',
  'sea_snake_spear',
  'anchor_hammer',
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

  for (const base of Object.values(EQUIPMENT)) {
    if (base.slot === 'weapon') {
      if (!scene.textures.exists(`icon-${base.id}`)) {
        const match = base.id === 'coral_dagger' || base.id === 'captain_cutlass' ||
          base.id === 'sea_snake_spear' || base.id === 'anchor_hammer';
        if (match) {
          g.fillStyle(0xc9d4e0).fillRect(7, 2, 2, 10);
          g.fillStyle(base.id === 'anchor_hammer' ? 0x8a8478 : 0x8aa8c0).fillRect(5, 3, 6, 3);
          g.fillStyle(0x6b4420).fillRect(7, 12, 2, 2);
          g.generateTexture(`icon-${base.id}`, 16, 16);
          g.clear();
        }
      }
    }
  }
  g.destroy();
}

/** Item icon lookup; equipment falls back to its slot icon. */
export function itemIcon(baseId: string | null | undefined): ItemIcon | null {
  if (!baseId) return null;
  if (SHEET_ICONS[baseId]) return SHEET_ICONS[baseId];
  if (GENERATED.has(baseId)) return { texture: `icon-${baseId}` };
  const equip = EQUIPMENT[baseId];
  if (equip) {
    if (equip.slot === 'weapon' && equip.id !== 'club' && equip.id !== 'spear') {
      return { texture: `icon-${equip.id}` };
    }
    return { texture: `icon-${equip.slot}` };
  }
  if (ITEMS[baseId]) return { texture: `icon-${baseId}` };
  return null;
}
