import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { ITEMS } from '../data/items';
import { getCampChecklist } from '../systems/campSystem';
import { currentGoal } from '../systems/tutorialSystem';
import { formatClock, formatDay, formatPhase, getInteractPrompt } from './format';

const BAR_WIDTH = 86;
const BAR_HEIGHT = 7;

interface Bar {
  fill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class Hud {
  private scene: Phaser.Scene;
  private dayText: Phaser.GameObjects.Text;
  private clockText: Phaser.GameObjects.Text;
  private phaseText: Phaser.GameObjects.Text;
  private promptText: Phaser.GameObjects.Text;
  private campText: Phaser.GameObjects.Text;
  private tutorialText: Phaser.GameObjects.Text;
  private bannerText: Phaser.GameObjects.Text;
  private progressRing: Phaser.GameObjects.Graphics;
  private bars: Record<'hp' | 'hunger' | 'thirst' | 'energy', Bar>;
  private hotbarNames: Phaser.GameObjects.Text[] = [];
  private hotbarCounts: Phaser.GameObjects.Text[] = [];
  private hotbarDurability: Phaser.GameObjects.Rectangle[] = [];
  private promptOverride: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const style = { fontFamily: 'monospace', fontSize: '11px', color: '#d8e4f0' };

    this.dayText = scene.add.text(8, 6, '', style).setDepth(8000).setScrollFactor(0);
    this.clockText = scene.add.text(8, 20, '', style).setDepth(8000).setScrollFactor(0);
    this.phaseText = scene.add
      .text(150, 6, '', { ...style, color: '#9fb7c9' })
      .setDepth(8000)
      .setScrollFactor(0);

    this.bars = {
      hp: this.createBar(8, 38, 0xc94f4f, '生命'),
      hunger: this.createBar(8, 58, 0xd59a45, '饱食'),
      thirst: this.createBar(8, 78, 0x5a9fd4, '口渴'),
      energy: this.createBar(8, 98, 0x6fbf73, '精力'),
    };

    this.campText = scene.add
      .text(632, 6, '', { ...style, align: 'right' })
      .setOrigin(1, 0)
      .setDepth(8000)
      .setScrollFactor(0);

    this.tutorialText = scene.add
      .text(8, 118, '', { ...style, color: '#ffd479' })
      .setDepth(8000)
      .setScrollFactor(0);

    this.progressRing = scene.add.graphics().setDepth(8600).setScrollFactor(0);

    this.promptText = scene.add
      .text(320, 326, '', { ...style, color: '#ffd479' })
      .setOrigin(0.5, 1)
      .setDepth(8000)
      .setScrollFactor(0);

    this.bannerText = scene.add
      .text(320, 60, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffe9a8',
        backgroundColor: '#1b2430',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 0)
      .setDepth(8500)
      .setScrollFactor(0)
      .setAlpha(0);

    this.createHotbar();
  }

  private createBar(x: number, y: number, color: number, name: string): Bar {
    const style = { fontFamily: 'monospace', fontSize: '9px', color: '#aebfcd' };
    this.scene.add.text(x, y - 2, name, style).setDepth(8000).setScrollFactor(0);
    this.scene.add
      .rectangle(x + 30, y, BAR_WIDTH, BAR_HEIGHT, 0x1b2430, 0.9)
      .setOrigin(0, 0)
      .setDepth(8000)
      .setScrollFactor(0);
    const fill = this.scene.add
      .rectangle(x + 30, y, BAR_WIDTH, BAR_HEIGHT, color, 1)
      .setOrigin(0, 0)
      .setDepth(8001)
      .setScrollFactor(0);
    const label = this.scene.add
      .text(x + 30 + BAR_WIDTH + 6, y - 2, '', style)
      .setDepth(8001)
      .setScrollFactor(0);
    return { fill, label };
  }

  private createHotbar(): void {
    const slotSize = 26;
    const gap = 3;
    const total = 8 * slotSize + 7 * gap;
    const startX = (640 - total) / 2;
    const y = 302;
    for (let i = 0; i < 8; i++) {
      const x = startX + i * (slotSize + gap);
      this.scene.add
        .rectangle(x, y, slotSize, slotSize, 0x111a24, 0.85)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x44515e)
        .setDepth(8000)
        .setScrollFactor(0);
      this.scene.add
        .text(x + 2, y + 1, String(i + 1), {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#5a6b7a',
        })
        .setDepth(8001)
        .setScrollFactor(0);
      this.hotbarNames.push(
        this.scene.add
          .text(x + slotSize / 2, y + 10, '', {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#d8e4f0',
          })
          .setOrigin(0.5, 0)
          .setDepth(8001)
          .setScrollFactor(0),
      );
      this.hotbarCounts.push(
        this.scene.add
          .text(x + slotSize - 2, y + slotSize - 2, '', {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#ffd479',
          })
          .setOrigin(1, 1)
          .setDepth(8001)
          .setScrollFactor(0),
      );
      this.hotbarDurability.push(
        this.scene.add
          .rectangle(x + 2, y + slotSize - 4, slotSize - 4, 2, 0x6fbf73, 1)
          .setOrigin(0, 0)
          .setDepth(8002)
          .setScrollFactor(0)
          .setVisible(false),
      );
    }
  }

  update(state: GameState): void {
    this.dayText.setText(formatDay(state.time.day));
    this.clockText.setText(formatClock(state.time.clockMin));
    this.phaseText.setText(formatPhase(state.time.phase));

    this.setBar('hp', state.player.hp);
    this.setBar('hunger', state.player.hunger);
    this.setBar('thirst', state.player.thirst);
    this.setBar('energy', state.player.energy);

    const checklist = getCampChecklist(state)
      .map((row) => row.label)
      .join('\n');
    this.campText.setText(`营地 Lv${state.camp.level}\n${checklist}`);

    this.promptText.setText(this.promptOverride ?? getInteractPrompt(state) ?? '');

    const goal = currentGoal(state);
    this.tutorialText.setText(goal ? `目标：${goal.label}` : '目标：自由求生');

    for (let i = 0; i < 8; i++) {
      const baseId = state.hotbar[i];
      const name = baseId ? (ITEMS[baseId]?.name ?? baseId) : '';
      this.hotbarNames[i].setText(name);
      const stack = baseId
        ? state.inventory.find((item) => item.baseId === baseId && item.durability !== undefined)
        : undefined;
      const max = baseId ? ITEMS[baseId]?.maxDurability : undefined;
      if (stack && max && stack.durability !== undefined) {
        const ratio = Math.max(0, Math.min(1, stack.durability / max));
        this.hotbarDurability[i]
          .setVisible(true)
          .setSize((26 - 4) * ratio, 2)
          .setFillStyle(ratio > 0.3 ? 0x6fbf73 : 0xc94f4f, 1);
      } else {
        this.hotbarDurability[i].setVisible(false);
      }
      const count = baseId
        ? state.inventory
            .filter((item) => item.baseId === baseId)
            .reduce((sum, item) => sum + item.count, 0)
        : 0;
      this.hotbarCounts[i].setText(count > 1 ? String(count) : '');
    }
  }

  setPrompt(text: string | null): void {
    this.promptOverride = text;
  }

  /** 0..1 while an interaction is channelling, null when idle. */
  setProgress(value: number | null): void {
    this.progressRing.clear();
    if (value === null || value <= 0) return;
    const clamped = Math.max(0, Math.min(1, value));
    this.progressRing.lineStyle(3, 0xffd479, 0.95);
    this.progressRing.beginPath();
    this.progressRing.arc(320, 292, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamped, false);
    this.progressRing.strokePath();
    this.progressRing.fillStyle(0x111a24, 0.7);
    this.progressRing.fillCircle(320, 292, 9);
  }

  private setBar(key: 'hp' | 'hunger' | 'thirst' | 'energy', value: number): void {
    const bar = this.bars[key];
    const clamped = Math.max(0, Math.min(100, value));
    bar.fill.setSize((BAR_WIDTH * clamped) / 100, BAR_HEIGHT);
    bar.label.setText(String(Math.round(clamped)));
  }

  showBanner(text: string, durationMs = 2600): void {
    this.bannerText.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.bannerText);
    this.scene.tweens.add({
      targets: this.bannerText,
      alpha: 0,
      delay: durationMs,
      duration: 400,
    });
  }
}
