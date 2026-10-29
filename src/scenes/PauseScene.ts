import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { exportSave, importSave, saveGame } from '../systems/saveSystem';
import { playSfx } from '../systems/audio';
import type { MusicManager } from '../systems/music';
import { makeText } from '../ui/text';
import { COLORS, TINTS } from '../ui/theme';
import { drawPanel } from '../ui/widgets/panel';

const PANEL = { x: 140, y: 8, w: 360, h: 344 };

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

    const guide = makeText(this, PANEL.x + PANEL.w - 16, PANEL.y + 18, '操作指引', {
      origin: [1, 0],
      color: COLORS.goldDark,
    });
    guide.setInteractive({ useHandCursor: true });
    guide.on('pointerdown', () => this.openGuide());

    this.button(88, '继续游戏', () => this.resumeGame());
    this.button(126, '保存进度', () => this.save());
    this.button(164, '导出存档', () => this.exportFile());
    this.button(202, '导入存档', () => this.importFile());
    this.button(240, '开场故事', () => this.replayIntro());
    this.soundButton();
    this.musicButton();
    this.musicVolume();
    if (this.registry.get('touchLayout')) this.touchButton();

    makeText(this, 320, PANEL.y + PANEL.h - 10, 'Esc 继续 · 存档保存在浏览器 localStorage', {
      color: COLORS.muted,
      align: 'center',
    }).setOrigin(0.5, 0.5);

    playSfx(this, this.state(), 'open');
    this.music()?.setDucked(true);
    const state = this.state();
    if (state) this.music()?.apply(state);
    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
  }

  private soundButton(): void {
    const state = this.state();
    const label = (): string => `音效：${state?.settings.muted ? '关' : '开'}（点击切换）`;
    const text = makeText(this, 320, 270, label(), {
      color: COLORS.inkSoft,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      if (!state) return;
      state.settings.muted = !state.settings.muted;
      saveGame(state);
      text.setText(label());
      this.music()?.apply(state);
      playSfx(this, state, 'click');
    });
  }

  private musicButton(): void {
    const state = this.state();
    if (!state) return;
    const label = (): string => `音乐：${state.settings.musicMuted ? '关' : '开'}（点击切换）`;
    const text = makeText(this, 320, 290, label(), {
      color: COLORS.inkSoft,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      state.settings.musicMuted = !state.settings.musicMuted;
      saveGame(state);
      text.setText(label());
      this.music()?.apply(state);
      playSfx(this, state, 'click');
    });
  }

  private musicVolume(): void {
    const state = this.state();
    if (!state) return;
    const label = makeText(this, 168, 308, '', { origin: [0, 0.5], color: COLORS.inkSoft });
    const refresh = (): void => {
      label.setText(`音乐音量 ${Math.round(state.settings.musicVolume * 100)}%`);
    };
    refresh();
    const step = (delta: number): void => {
      state.settings.musicVolume = Math.max(
        0,
        Math.min(1, Math.round((state.settings.musicVolume + delta) * 10) / 10),
      );
      saveGame(state);
      refresh();
      this.music()?.apply(state);
      playSfx(this, state, 'click');
    };
    for (const [text, x, delta] of [
      ['−', 320, -0.1],
      ['+', 352, 0.1],
    ] as const) {
      const button = makeText(this, x, 308, text, {
        size: 24,
        origin: [0.5, 0.5],
        color: COLORS.goldDark,
      });
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => step(delta));
    }
  }

  /** Phones only: keyboard shortcuts can be replaced by the virtual pad. */
  private touchButton(): void {
    const state = this.state();
    if (!state) return;
    const label = (): string => `触屏控制：${state.settings.touchControls ? '开' : '关'}（点击切换）`;
    const text = makeText(this, 320, 326, label(), {
      color: COLORS.inkSoft,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      state.settings.touchControls = !state.settings.touchControls;
      saveGame(state);
      text.setText(label());
      playSfx(this, state, 'click');
    });
  }

  private button(centerY: number, label: string, onClick: () => void): void {
    const x = 220;
    const y = centerY - 18;
    const g = this.add.graphics();
    g.fillStyle(0x3a2412, 1).fillRect(x, y, 200, 36);
    g.lineStyle(2, TINTS.goldDark, 1).strokeRect(x + 1, y + 1, 198, 34);
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

  private music(): MusicManager | null {
    return (this.registry.get('musicManager') as MusicManager | undefined) ?? null;
  }

  private resumeGame(): void {
    const state = this.state();
    if (state) this.music()?.apply(state);
    this.music()?.setDucked(false);
    this.scene.resume('IslandScene');
    this.scene.resume('UIScene');
    this.scene.stop();
  }

  private replayIntro(): void {
    this.music()?.setDucked(false);
    this.scene.launch('IntroScene', { replay: true });
    this.scene.stop();
  }

  private openGuide(): void {
    const state = this.state();
    const active = state?.scene === 'dungeon' ? 'DungeonScene' : 'IslandScene';
    this.music()?.setDucked(false);
    this.scene.launch('GuideScene', { resume: [active, 'UIScene'] });
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
    const text = makeText(this, 320, 334, message, {
      color: COLORS.energy,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.tweens.add({ targets: text, alpha: 0, delay: 900, duration: 400 });
  }
}
