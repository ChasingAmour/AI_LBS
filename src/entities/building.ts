import Phaser from 'phaser';
import type { BuildingInstance } from '../core/gameState';
import { BUILDINGS } from '../data/buildings';

const TEXTURES: Record<string, string> = {
  campfire: 'build-campfire',
  workbench: 'build-workbench',
  cage: 'build-cage',
  tent: 'build-tent',
  storage: 'build-storage',
  fence: 'build-fence',
  stone_wall: 'build-stone-wall',
  drying_rack: 'build-drying-rack',
};

/** Visual wrapper for a placed building. */
export class BuildingSprite extends Phaser.GameObjects.Image {
  readonly buildingId: string;

  constructor(scene: Phaser.Scene, building: BuildingInstance) {
    const texture = TEXTURES[building.type] ?? 'build-storage';
    super(scene, building.x * 16 + 8, building.y * 16 + 16, texture);
    this.buildingId = building.id;
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
  }

  static displayName(type: string): string {
    return BUILDINGS[type]?.name ?? type;
  }
}

export function buildingTextures(): Record<string, string> {
  return { ...TEXTURES };
}
