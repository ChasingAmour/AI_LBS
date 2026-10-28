import Phaser from 'phaser';
import { nodeTypeFromId } from '../data/spawns';
import { nodeSprite } from '../ui/assets';

/** Visual wrapper for a resource node placed by the terrain generator. */
export class ResourceNodeSprite extends Phaser.GameObjects.Image {
  readonly nodeId: string;
  readonly nodeType: string | null;

  constructor(scene: Phaser.Scene, nodeId: string, x: number, y: number, depleted = false) {
    const nodeType = nodeTypeFromId(nodeId);
    const spec = nodeSprite(nodeType ?? 'rock', depleted);
    super(scene, x, y, spec.texture, spec.frame);
    this.nodeId = nodeId;
    this.nodeType = nodeType;
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
  }

  setDepleted(depleted: boolean): void {
    const spec = nodeSprite(this.nodeType ?? 'rock', depleted);
    this.setTexture(spec.texture, spec.frame);
    this.setAlpha(depleted ? 0.35 : 1);
    this.setVisible(true);
  }
}
