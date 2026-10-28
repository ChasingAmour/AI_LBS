import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { exportSave, importSave, saveGame } from '../systems/saveSystem';
import { makeText } from '../ui/text';
import { COLORS, TINTS } from '../ui/theme';
import { drawPanel } from '../ui/widgets/panel';

const PANEL = { x: 140, y: 46, w: 360, h: 268 };

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    this.add.rectangle(0, 0, 640, 360, 0x05080c, 0.72).setOrigin(0, 0);
    const g = this.add.graphics();
    drawPanel(g, PANEL);

    makeText(this, 320, PANEL.y + 16, '暂停', {
      size: 24,
      color: COLORS.ink,
      align: 'center',
    }).setOrigin(0.5, 0);

    this.button(112, '继续游戏', () => this.resumeGame());
    this.button(152, '保存进度', () => this.save());
    this.button(192, '导出存档', () => this.exportFile());
    this.button(232, '导入存档', () => this.importFile());

    makeText(this, 320, PANEL.y + PANEL.h - 18, 'Esc 继续 · 存档保存在浏览器 localStorage', {
      color: COLORS.muted,
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
  }

  private button(centerY: number, label: string, onClick: () => void): void {
    const x = 220;
    const y = centerY - 16;
    const g = this.add.graphics();
    g.fillStyle(0x3a2412, 1).fillRect(x, y, 200, 32);
    g.lineStyle(2, TINTS.goldDark, 1).strokeRect(x + 1, y + 1, 198, 30);
    const text = makeText(this, 320, centerY, label, {
      color: COLORS.cream,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setColor(COLORS.gold));
    text.on('pointerout', () => text.setColor(COLORS.cream));
    text.on('pointerdown', onClick);
  }

  private state(): GameState | null {
    return (this.registry.get('state') as GameState | undefined) ?? null;
  }

  private resumeGame(): void {
    this.scene.resume('IslandScene');
    this.scene.resume('UIScene');
    this.scene.stop();
  }

  private save(): void {
    const state = this.state();
    if (!state) return;
    saveGame(state);
    this.flash('已保存');
  }

  private exportFile(): void {
    const state = this.state();
    if (!state) return;
    exportSave(state);
    this.flash('已导出');
  }

  private importFile(): void {
    const json = window.prompt('粘贴存档 JSON：');
    if (!json) return;
    try {
      const state = importSave(json);
      this.registry.set('state', state);
      this.scene.stop('IslandScene');
      this.scene.stop('UIScene');
      this.scene.stop();
      this.scene.start('IslandScene');
    } catch {
      this.flash('存档无效');
    }
  }

  private flash(message: string): void {
    const text = makeText(this, 320, 286, message, {
      color: COLORS.energy,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.tweens.add({ targets: text, alpha: 0, delay: 900, duration: 400 });
  }
}
