import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { EventBus } from '../core/eventBus';
import { respawnAfterDeath } from '../systems/needsSystem';
import { makeText } from '../ui/text';
import { COLORS, TINTS } from '../ui/theme';
import { drawPanel } from '../ui/widgets/panel';

const PANEL = { x: 160, y: 58, w: 320, h: 244 };

export class DeathScene extends Phaser.Scene {
  constructor() {
    super('DeathScene');
  }

  create(): void {
    this.add.rectangle(0, 0, 640, 360, 0x05080c, 0.82).setOrigin(0, 0);
    if (this.textures.exists('vignette')) {
      this.add.image(0, 0, 'vignette').setOrigin(0, 0).setDisplaySize(640, 360).setAlpha(0.9);
    }
    const g = this.add.graphics();
    drawPanel(g, PANEL);

    makeText(this, 320, PANEL.y + 14, '你失去了一切，但还活着', {
      size: 24,
      color: COLORS.ink,
      align: 'center',
    }).setOrigin(0.5, 0);

    makeText(this, 320, PANEL.y + 54, '背包与快捷栏里的物资留在了原地。', {
      color: COLORS.inkSoft,
      align: 'center',
    }).setOrigin(0.5, 0);
    makeText(this, 320, PANEL.y + 72, '已穿戴的装备还在。', {
      color: COLORS.inkSoft,
      align: 'center',
    }).setOrigin(0.5, 0);

    const bx = 220;
    const by = PANEL.y + 132;
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x3a2412, 1).fillRect(bx, by, 200, 36);
    buttonBg.lineStyle(2, TINTS.goldDark, 1).strokeRect(bx + 1, by + 1, 198, 34);
    const button = makeText(this, 320, by + 18, '第二天清晨醒来', {
      color: COLORS.cream,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setColor(COLORS.gold));
    button.on('pointerout', () => button.setColor(COLORS.cream));
    button.on('pointerdown', () => this.respawn());
    this.input.keyboard?.once('keydown-SPACE', () => this.respawn());

    makeText(this, 320, PANEL.y + 188, '空格键也可以继续', {
      color: COLORS.muted,
      align: 'center',
    }).setOrigin(0.5, 0);
  }

  private respawn(): void {
    const state = this.registry.get('state') as GameState | undefined;
    const bus = (this.registry.get('bus') as EventBus | undefined) ?? new EventBus();
    if (state) {
      respawnAfterDeath(state, bus);
      if (state.raid?.active) {
        state.raid = null;
        state.savages = [];
        state.flags.firstRaidDone = true;
      }
    }
    this.scene.stop('DungeonScene');
    this.scene.stop('UIScene');
    this.registry.set('inDungeon', false);
    this.scene.start('IslandScene');
  }
}
