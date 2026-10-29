import Phaser from 'phaser';
import { WEAPONS } from '../data/weapons';

const WEAPON_COLORS: Record<string, number> = {
  fist: 0xf0e6d2,
  club: 0xc9a24a,
  spear: 0xd8e8ff,
  coral_dagger: 0xf09ab0,
  captain_cutlass: 0xffe9a8,
  sea_snake_spear: 0xf7f1e3,
  anchor_hammer: 0xc9d4e0,
  copper_spear: 0xe0a060,
  iron_spear: 0xd8e8ff,
  antler_spear: 0xe0c07a,
  venom_spear: 0x8aff6a,
  stone_axe: 0xc9d4e0,
  copper_axe: 0xe0a060,
  iron_axe: 0xd8e8ff,
};

function colorFor(baseId: string | null): number {
  return (baseId && WEAPON_COLORS[baseId]) || 0xf0e6d2;
}

/** Weapon-shaped attack flash: arcs for clubs/swords, a long line for spears. */
export function spawnWeaponAttack(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number,
  baseId: string | null,
  depth: number,
): void {
  const weapon = baseId ? WEAPONS[baseId] ?? WEAPONS.fist : WEAPONS.fist;
  const color = colorFor(baseId);
  const g = scene.add.graphics().setPosition(x, y).setRotation(angle).setDepth(depth);

  if (weapon.pattern.kind === 'thrust') {
    const range = weapon.pattern.range;
    g.lineStyle(3, color, 0.95).lineBetween(6, 0, range, 0);
    g.fillStyle(color, 0.95).fillTriangle(range + 6, 0, range - 2, -4, range - 2, 4);
    g.lineStyle(1, 0xffffff, 0.8).lineBetween(8, 0, range - 2, 0);
  } else if (weapon.pattern.kind === 'combo') {
    for (let i = 0; i < weapon.pattern.hits; i++) {
      g.lineStyle(2, color, 0.85 - i * 0.15);
      g.beginPath();
      g.arc(0, 0, weapon.pattern.range - i * 3, -0.55, 0.55);
      g.strokePath();
    }
  } else {
    const radius = weapon.pattern.range;
    const angleDeg = weapon.pattern.kind === 'arc' ? weapon.pattern.angleDeg : 80;
    const half = (angleDeg * Math.PI) / 360;
    g.lineStyle(baseId === 'anchor_hammer' ? 6 : 4, color, 0.95);
    g.beginPath();
    g.arc(0, 0, radius, -half, half);
    g.strokePath();
    g.lineStyle(1, 0xffffff, 0.75);
    g.beginPath();
    g.arc(0, 0, radius - 4, -half * 0.8, half * 0.8);
    g.strokePath();
    if (baseId === 'anchor_hammer') {
      g.fillStyle(color, 0.45).fillCircle(radius * 0.75, 0, 7);
    }
  }

  g.setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration: 190,
    ease: 'Quad.easeOut',
    onComplete: () => g.destroy(),
  });
}

/** DNF-style damage number: bigger and redder as the hit gets heavier. */
export function spawnDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  tone: 'enemy' | 'player' = 'enemy',
): void {
  const value = Math.max(1, Math.round(amount));
  const style =
    value >= 80
      ? { size: 26, color: '#ff3b30' }
      : value >= 50
        ? { size: 21, color: '#ff6b4a' }
        : value >= 25
          ? { size: 17, color: '#ffb347' }
          : value >= 10
            ? { size: 14, color: '#ffe066' }
            : { size: 11, color: '#f7f1e3' };
  const text = scene.add
    .text(x + (Math.random() * 14 - 7), y - 8, String(value), {
      fontFamily: '"Fusion Pixel 12px", monospace',
      fontSize: `${style.size}px`,
      color: tone === 'player' ? '#ff5a5a' : style.color,
      stroke: '#2b2118',
      strokeThickness: 3,
      resolution: 2,
    })
    .setOrigin(0.5, 1)
    .setDepth(12000)
    .setScale(0.65);
  scene.tweens.add({
    targets: text,
    y: text.y - 30,
    scale: 1,
    alpha: 0,
    duration: 680,
    ease: 'Quad.easeOut',
    onComplete: () => text.destroy(),
  });
  if (value >= 50) scene.cameras.main.shake(70, value >= 80 ? 0.004 : 0.002);
}

/** Small coloured burst at the point of impact. */
export function spawnHitSpark(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffe9a8,
): void {
  const spark = scene.add.circle(x, y - 8, 3, color, 0.9).setDepth(11999);
  scene.tweens.add({
    targets: spark,
    scale: 2.4,
    alpha: 0,
    duration: 180,
    ease: 'Quad.easeOut',
    onComplete: () => spark.destroy(),
  });
}
