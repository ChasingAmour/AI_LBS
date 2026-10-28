import Phaser from 'phaser';
import { walkFrame, type PlayerFrame } from './playerFrames';

/** Pixel hero from Tiny Farm; 16×16 frame, feet-anchored, two-frame walk cycle. */
export const PLAYER_TEXTURE = 'player-idle';
export const PLAYER_FRAME = 109;

export class PlayerEntity extends Phaser.Physics.Arcade.Sprite {
  private currentFrame: PlayerFrame = 'player-idle';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_TEXTURE);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(3, 8);
  }

  setVelocityFromInput(input: { x: number; y: number }, speed: number): void {
    if (input.x === 0 && input.y === 0) {
      this.setVelocity(0, 0);
      return;
    }
    this.setVelocity(input.x * speed, input.y * speed);
    if (input.x !== 0) this.setFlipX(input.x < 0);
  }

  /** Swaps idle/walk textures at 8 fps while the body is moving. */
  setWalking(moving: boolean, elapsedMs: number): void {
    const frame = walkFrame(elapsedMs, moving);
    if (frame === this.currentFrame) return;
    this.currentFrame = frame;
    this.setTexture(frame);
  }
}
