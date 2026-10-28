import Phaser from 'phaser';

export class IslandScene extends Phaser.Scene {
  constructor() {
    super('IslandScene');
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'AI_LBS', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#e8f0e8',
      })
      .setOrigin(0.5);
  }
}
