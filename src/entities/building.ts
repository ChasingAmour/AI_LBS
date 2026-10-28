import Phaser from 'phaser';
import type { BuildingInstance } from '../core/gameState';
import { BUILDINGS } from '../data/buildings';
import { buildingSprite } from '../ui/assets';
import { depthFor } from '../world/depthSort';

/** Visual wrapper for a placed building: sprite, 10×4 ground shadow, tidy depth. */
export class BuildingSprite extends Phaser.GameObjects.Image {
  readonly buildingId: string;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, building: BuildingInstance) {
    const spec = buildingSprite(building.type);
    const x = building.x * 16 + 8;
    const y = building.y * 16 + 16;
    super(scene, x, y, spec.texture, spec.frame);
    this.buildingId = building.id;
    this.setOrigin(0.5, 1);
    this.setDisplaySize(spec.w, spec.h);
    this.setDepth(depthFor(y));
    this.shadow = scene.add
      .ellipse(x, y - 2, Math.max(10, Math.round(spec.w * 0.5)), 4, 0x000000, 0.22)
      .setDepth(depthFor(y) - 1);
    scene.add.existing(this);
  }

  override destroy(fromScene?: boolean): void {
    if (this.shadow.active) this.shadow.destroy();
    super.destroy(fromScene);
  }

  static displayName(type: string): string {
    return BUILDINGS[type]?.name ?? type;
  }
}
