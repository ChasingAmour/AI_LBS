import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { guidePages, type GuidePage } from '../data/controlsGuide';
import { playSfx } from '../systems/audio';
import { saveGame } from '../systems/saveSystem';
import { makeText } from '../ui/text';
import { COLORS } from '../ui/theme';
import { drawPanel } from '../ui/widgets/panel';

const PANEL = { x: 70, y: 26, w: 500, h: 308 };

/** First-run control guide; also reachable from pause and the touch menu. */
export class GuideScene extends Phaser.Scene {
  private pages: GuidePage[] = [];
  private index = 0;
  private resumeScenes: string[] = [];
  private body?: Phaser.GameObjects.Container;
  private titleText?: Phaser.GameObjects.Text;
  private pageText?: Phaser.GameObjects.Text;
  private nextText?: Phaser.GameObjects.Text;
  private prevText?: Phaser.GameObjects.Text;

  constructor() {
    super('GuideScene');
  }

  create(data: { resume?: string[] } = {}): void {
    this.scene.bringToTop();
    this.resumeScenes = data.resume ?? [];
    this.index = 0;
    const touch = Boolean(this.registry.get('touchLayout'));
    this.pages = guidePages(touch);

    this.add.rectangle(0, 0, 640, 360, 0x05080c, 0.78).setOrigin(0, 0);
    const chrome = this.add.graphics();
    drawPanel(chrome, PANEL);

    this.titleText = makeText(this, 320, PANEL.y + 14, '', {
      size: 24,
      origin: [0.5, 0],
      color: COLORS.ink,
    });
    this.pageText = makeText(this, 320, PANEL.y + PANEL.h - 16, '', {
      origin: [0.5, 0],
      color: COLORS.muted,
    });

    this.prevText = this.navButton(PANEL.x + 60, PANEL.y + PANEL.h - 30, '上一页', () =>
      this.show(this.index - 1),
    );
    this.nextText = this.navButton(
      PANEL.x + PANEL.w - 60,
      PANEL.y + PANEL.h - 30,
      '下一页',
      () => {
        if (this.index >= this.pages.length - 1) this.close();
        else this.show(this.index + 1);
      },
    );
    this.navButton(PANEL.x + 46, PANEL.y + 26, '关闭', () => this.close());

    this.body = this.add.container(0, 0);
    this.show(0);

    this.input.keyboard?.on('keydown-LEFT', () => this.show(this.index - 1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.next());
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    playSfx(this, this.state(), 'open');
  }

  private navButton(
    centerX: number,
    centerY: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const bg = this.add.graphics();
    bg.fillStyle(0x3a2412, 1).fillRect(centerX - 42, centerY - 15, 84, 30);
    bg.lineStyle(1, 0xb8792a, 1).strokeRect(centerX - 41, centerY - 14, 82, 28);
    const text = makeText(this, centerX, centerY, label, {
      size: 12,
      origin: [0.5, 0.5],
      color: COLORS.cream,
    });
    const zone = this.add
      .zone(centerX, centerY, 88, 34)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', onClick);
    zone.on('pointerover', () => text.setColor(COLORS.gold));
    zone.on('pointerout', () => text.setColor(COLORS.cream));
    return text;
  }

  private next(): void {
    if (this.index >= this.pages.length - 1) this.close();
    else this.show(this.index + 1);
  }

  private show(index: number): void {
    const nextIndex = Math.max(0, Math.min(this.pages.length - 1, index));
    this.index = nextIndex;
    const page = this.pages[nextIndex];
    this.titleText?.setText(page.title);
    this.body?.removeAll(true);
    page.lines.forEach((line, row) => {
      this.body?.add(
        makeText(this, PANEL.x + 28, PANEL.y + 58 + row * 24, `· ${line}`, {
          color: COLORS.inkSoft,
        }),
      );
    });
    this.pageText?.setText(`${nextIndex + 1}/${this.pages.length} · ←/→ 翻页`);
    this.prevText?.setVisible(nextIndex > 0);
    this.nextText?.setText(nextIndex >= this.pages.length - 1 ? '开始游戏' : '下一页');
  }

  private close(): void {
    const state = this.state();
    if (state) {
      state.flags.controlsSeen = true;
      try {
        saveGame(state);
      } catch {
        // private mode
      }
      playSfx(this, state, 'close');
    }
    for (const key of this.resumeScenes) {
      this.scene.resume(key);
    }
    this.game.events.emit('ui:guideClosed');
    this.scene.stop();
  }

  private state(): GameState | null {
    return (this.registry.get('state') as GameState | undefined) ?? null;
  }
}
