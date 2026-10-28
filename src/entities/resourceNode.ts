import Phaser from 'phaser';
import { nodeTypeFromId } from '../data/spawns';

/** Visual wrapper for a resource node object from the Tiled object layer. */
export class ResourceNodeSprite extends Phaser.GameObjects.Image {
  readonly nodeId: string;
  readonly nodeType: string | null;

  constructor(scene: Phaser.Scene, nodeId: string, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    this.nodeId = nodeId;
    this.nodeType = nodeTypeFromId(nodeId);
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
  }

  setDepleted(depleted: boolean): void {
    this.setAlpha(depleted ? 0.15 : 1);
    this.setVisible(true);
  }
}
