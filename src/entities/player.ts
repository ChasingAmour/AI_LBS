import Phaser from 'phaser';

export class PlayerEntity extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(1, 8);
  }

  setVelocityFromInput(input: { x: number; y: number }, speed: number): void {
    if (input.x === 0 && input.y === 0) {
      this.setVelocity(0, 0);
      return;
    }
    this.setVelocity(input.x * speed, input.y * speed);
    if (input.x !== 0) this.setFlipX(input.x < 0);
  }
}
