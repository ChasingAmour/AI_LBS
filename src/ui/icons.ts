import Phaser from 'phaser';

export type HudIcon = 'hp' | 'hunger' | 'thirst' | 'energy' | 'sun' | 'moon' | 'campfire';

const ICON_SIZE = 10;

const PAINT: Record<HudIcon, number> = {
  hp: 0xc94f4f,
  hunger: 0xd98a4a,
  thirst: 0x3f8fd0,
  energy: 0x6fbf4f,
  sun: 0xffd479,
  moon: 0xcfe0ff,
  campfire: 0xd9772f,
};

/** Draws the seven 10×10 HUD icons once and generates textures for them. */
export function ensureHudIcons(scene: Phaser.Scene): void {
  if (scene.textures.exists('icon-hp')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // heart
  g.fillStyle(0xc94f4f).fillCircle(3, 4, 2.4).fillCircle(7, 4, 2.4).fillTriangle(1, 5, 9, 5, 5, 9);
  g.generateTexture('icon-hp', ICON_SIZE, ICON_SIZE);
  g.clear();

  // drumstick
  g.fillStyle(0xd98a4a).fillCircle(6, 3, 3);
  g.fillStyle(0xf0e6d2).fillRect(1, 5, 4, 2).fillCircle(1, 6, 1.5).fillCircle(1, 5, 1.2);
  g.generateTexture('icon-hunger', ICON_SIZE, ICON_SIZE);
  g.clear();

  // water drop
  g.fillStyle(0x3f8fd0).fillTriangle(5, 0, 1, 6, 9, 6).fillCircle(5, 6, 4);
  g.generateTexture('icon-thirst', ICON_SIZE, ICON_SIZE);
  g.clear();

  // lightning
  g.fillStyle(0xe0c13f)
    .fillPoints(
      [
        new Phaser.Geom.Point(6, 0),
        new Phaser.Geom.Point(2, 5),
        new Phaser.Geom.Point(4.5, 5),
        new Phaser.Geom.Point(3, 10),
        new Phaser.Geom.Point(8, 4),
        new Phaser.Geom.Point(5.5, 4),
      ],
      true,
    );
  g.generateTexture('icon-energy', ICON_SIZE, ICON_SIZE);
  g.clear();

  // sun
  g.fillStyle(0xffd479)
    .fillCircle(5, 5, 2.6)
    .fillRect(4, 0, 2, 2)
    .fillRect(4, 8, 2, 2)
    .fillRect(0, 4, 2, 2)
    .fillRect(8, 4, 2, 2);
  g.generateTexture('icon-sun', ICON_SIZE, ICON_SIZE);
  g.clear();

  // moon
  g.fillStyle(0xcfe0ff).fillCircle(5, 5, 4);
  g.fillStyle(0x1b2430, 0.55).fillCircle(7, 3, 3);
  g.generateTexture('icon-moon', ICON_SIZE, ICON_SIZE);
  g.clear();

  // campfire
  g.fillStyle(0x5b3f2a).fillRect(1, 7, 8, 2);
  g.fillStyle(0xd9772f).fillTriangle(5, 1, 1, 8, 9, 8);
  g.fillStyle(0xffd479).fillTriangle(5, 4, 3, 8, 7, 8);
  g.generateTexture('icon-campfire', ICON_SIZE, ICON_SIZE);
  g.destroy();
}

export function iconTexture(icon: HudIcon): string {
  return `icon-${icon}`;
}

export function iconColor(icon: HudIcon): number {
  return PAINT[icon];
}
