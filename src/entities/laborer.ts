import Phaser from 'phaser';
import type { LaborerState } from '../core/gameState';

export const LABORER_TEXTURE = 'laborer';

/** Visual wrapper for a captured laborer. */
export class LaborerSprite extends Phaser.GameObjects.Image {
  readonly laborerId: string;

  constructor(scene: Phaser.Scene, laborer: LaborerState) {
    super(scene, laborer.x, laborer.y, LABORER_TEXTURE);
    this.laborerId = laborer.id;
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
  }

  sync(laborer: LaborerState): void {
    this.setPosition(laborer.x, laborer.y);
    this.setDepth(laborer.y);
    this.setAlpha(laborer.task ? 1 : 0.85);
  }
}
