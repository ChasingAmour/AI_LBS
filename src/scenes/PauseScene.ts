import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { exportSave, importSave, saveGame } from '../systems/saveSystem';

const BUTTON_STYLE = {
  fontFamily: 'monospace',
  fontSize: '14px',
  color: '#d8e4f0',
};

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    this.add.rectangle(0, 0, 640, 360, 0x05080c, 0.86).setOrigin(0, 0);
    this.add
      .text(320, 84, '暂停', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffd479',
      })
      .setOrigin(0.5);

    this.button(150, '继续游戏', () => this.resumeGame());
    this.button(184, '保存进度', () => this.save());
    this.button(218, '导出存档', () => this.exportFile());
    this.button(252, '导入存档', () => this.importFile());

    this.add
      .text(320, 320, 'Esc 继续 · 存档保存在浏览器 localStorage', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#5a6b7a',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
  }

  private button(y: number, label: string, onClick: () => void): void {
    const text = this.add
      .text(320, y, label, BUTTON_STYLE)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setColor('#ffd479'));
    text.on('pointerout', () => text.setColor('#d8e4f0'));
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
    const text = this.add
      .text(320, 286, message, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#9fe0a8',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: text, alpha: 0, delay: 900, duration: 400 });
  }
}
