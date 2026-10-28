import Phaser from 'phaser';
import type { LaborerState } from '../core/gameState';

/** Tiny Farm farmer frame, reused for every laborer. */
export const LABORER_TEXTURE = 'farm';
export const LABORER_FRAME = 110;

/** Visual wrapper for a captured laborer. */
export class LaborerSprite extends Phaser.GameObjects.Image {
  readonly laborerId: string;

  constructor(scene: Phaser.Scene, laborer: LaborerState) {
    super(scene, laborer.x, laborer.y, LABORER_TEXTURE, LABORER_FRAME);
    this.laborerId = laborer.id;
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
  }

  sync(laborer: LaborerState, bob = 0): void {
    this.setPosition(laborer.x, laborer.y - bob);
    this.setDepth(laborer.y);
    this.setAlpha(laborer.task ? 1 : 0.85);
  }
}
