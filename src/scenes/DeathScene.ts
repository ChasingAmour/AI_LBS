import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';
import { respawnAfterDeath } from '../systems/needsSystem';

export class DeathScene extends Phaser.Scene {
  constructor() {
    super('DeathScene');
  }

  create(): void {
    this.add.rectangle(0, 0, 640, 360, 0x05080c, 0.9).setOrigin(0, 0);
    this.add
      .text(320, 120, '你失去了一切，但还活着', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffd479',
      })
      .setOrigin(0.5);
    this.add
      .text(320, 156, '背包与快捷栏里的物资留在了原地。\n已穿戴的装备还在。', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#9fb7c9',
        align: 'center',
      })
      .setOrigin(0.5);

    const button = this.add
      .text(320, 236, '第二天清晨醒来', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#d8e4f0',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setColor('#ffd479'));
    button.on('pointerout', () => button.setColor('#d8e4f0'));
    button.on('pointerdown', () => this.respawn());
    this.input.keyboard?.once('keydown-SPACE', () => this.respawn());
  }

  private respawn(): void {
    const state = this.registry.get('state') as GameState | undefined;
    const bus = this.registry.get('bus') as EventBus | undefined;
    if (state && bus) {
      respawnAfterDeath(state, bus);
      if (state.raid?.active) {
        state.raid = null;
        state.savages = [];
        state.flags.firstRaidDone = true;
      }
    }
    this.scene.stop('UIScene');
    this.scene.start('IslandScene');
  }
}
