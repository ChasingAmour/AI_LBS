import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { INTRO_STORY, markIntroSeen, type IntroSceneKind } from '../data/introStory';
import { playSfx } from '../systems/audio';
import { saveGame } from '../systems/saveSystem';
import { makeText } from '../ui/text';
import { COLORS, TINTS } from '../ui/theme';

const ART_H = 232;

/** Five-card pixel prologue shown once for a new save. */
export class IntroScene extends Phaser.Scene {
  private index = 0;
  private replay = false;
  private busy = false;
  private card?: Phaser.GameObjects.Container;
  private advancing = false;

  constructor() {
    super('IntroScene');
  }

  create(data: { replay?: boolean } = {}): void {
    this.replay = data.replay === true;
    this.index = 0;
    this.busy = false;
    this.advancing = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const state = this.state();
    if (state) playSfx(this, state, 'open');

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x > 556 && pointer.y < 48) return;
      this.advance();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-ENTER', () => this.advance());
    this.input.keyboard?.on('keydown-ESC', () => this.finish());

    this.showCard(0, false);
  }

  private state(): GameState | null {
    return (this.registry.get('state') as GameState | undefined) ?? null;
  }

  private advance(): void {
    if (this.busy || this.advancing) return;
    const state = this.state();
    if (state) playSfx(this, state, 'click');
    if (this.index >= INTRO_STORY.length - 1) {
      this.finish();
      return;
    }
    this.index += 1;
    this.showCard(this.index, true);
  }

  private showCard(index: number, fade: boolean): void {
    this.busy = true;
    const build = (): void => {
      this.card?.destroy();
      this.card = this.add.container(0, 0);
      this.drawArt(INTRO_STORY[index].scene);
      this.drawText(index);
      if (fade) this.card.setAlpha(0);
      this.tweens.add({
        targets: this.card,
        alpha: 1,
        duration: 320,
        onComplete: () => {
          this.busy = false;
        },
      });
    };
    if (fade && this.card) {
      this.tweens.add({
        targets: this.card,
        alpha: 0,
        duration: 180,
        onComplete: build,
      });
    } else {
      build();
    }
  }

  private drawText(index: number): void {
    if (!this.card) return;
    const card = INTRO_STORY[index];
    const panel = this.add.graphics();
    panel.fillStyle(0x120d09, 0.82).fillRect(0, ART_H, 640, 360 - ART_H);
    panel.lineStyle(1, TINTS.goldDark, 0.7).lineBetween(0, ART_H, 640, ART_H);
    this.card.add(panel);

    this.card.add(
      makeText(this, 40, ART_H + 14, card.title, {
        size: 24,
        color: COLORS.gold,
      }),
    );
    const body = makeText(this, 40, ART_H + 52, this.wrapCjk(card.body, 34), {
      color: COLORS.cream,
    });
    body.setLineSpacing(4);
    this.card.add(body);

    this.card.add(
      makeText(this, 600, 338, `${index + 1}/${INTRO_STORY.length} · 点击继续`, {
        origin: [1, 0.5],
        color: COLORS.muted,
      }),
    );
    const skip = makeText(this, 600, 14, '跳过 Esc', {
      origin: [1, 0],
      color: COLORS.cream,
    });
    skip.setInteractive({ useHandCursor: true });
    skip.on('pointerdown', () => this.finish());
    this.card.add(skip);
  }

  /** Phaser's word wrap relies on spaces; split CJK bodies by character count. */
  private wrapCjk(text: string, max: number): string {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      line += char;
      if (line.length >= max) {
        lines.push(line);
        line = '';
      }
    }
    if (line.length > 0) lines.push(line);
    return lines.join('\n');
  }

  private drawArt(scene: IntroSceneKind): void {    if (!this.card) return;
    const g = this.add.graphics();
    this.card.add(g);
    switch (scene) {
      case 'harbor':
        this.drawHarbor(g);
        break;
      case 'storm':
        this.drawStorm(g);
        break;
      case 'drift':
        this.drawDrift(g);
        break;
      case 'beach':
        this.drawBeach(g);
        break;
      case 'island':
        this.drawIsland(g);
        break;
    }
  }

  private sky(g: Phaser.GameObjects.Graphics, top: number, bottom: number, bands = 12): void {
    const strip = ART_H / bands;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      g.fillStyle(this.mix(top, bottom, t), 1).fillRect(0, Math.floor(i * strip), 640, Math.ceil(strip) + 1);
    }
  }

  private mix(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    return (
      (Math.round(ar + (br - ar) * t) << 16) |
      (Math.round(ag + (bg - ag) * t) << 8) |
      Math.round(ab + (bb - ab) * t)
    );
  }

  private waves(g: Phaser.GameObjects.Graphics, y: number, color: number, alpha = 0.7): void {
    g.lineStyle(2, color, alpha);
    for (let row = 0; row < 4; row++) {
      const yy = y + row * 12;
      g.beginPath();
      for (let x = 0; x <= 640; x += 8) {
        const wave = Math.sin((x + row * 16) / 28) * 3;
        if (x === 0) g.moveTo(x, yy + wave);
        else g.lineTo(x, yy + wave);
      }
      g.strokePath();
    }
  }

  private ship(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1): void {
    g.fillStyle(0x2a1b12, 1);
    g.fillTriangle(x - 26 * scale, y, x + 26 * scale, y, x + 18 * scale, y + 14 * scale);
    g.fillRect(x - 20 * scale, y - 2 * scale, 40 * scale, 5 * scale);
    g.lineStyle(2 * scale, 0x2a1b12, 1).lineBetween(x, y - 2 * scale, x, y - 34 * scale);
    g.lineBetween(x - 14 * scale, y - 26 * scale, x + 8 * scale, y - 8 * scale);
    g.fillStyle(0xd8c8a0, 0.9);
    g.fillTriangle(x + 1 * scale, y - 32 * scale, x + 22 * scale, y - 16 * scale, x + 1 * scale, y - 10 * scale);
  }

  private drawHarbor(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x2a3f66, 0xd98a4a);
    g.fillStyle(0x1d4a5e, 1).fillRect(0, 150, 640, 82);
    this.waves(g, 162, 0x5f9fb0, 0.55);
    g.fillStyle(0x0e1116, 0.95).fillRect(0, 188, 640, 44);
    this.ship(g, 220, 172, 1.6);
    this.ship(g, 470, 150, 0.8);
    g.fillStyle(0xf0d08a, 0.9).fillCircle(520, 54, 12);
    g.fillStyle(0x151a20, 1).fillRect(0, 150, 640, 6);
    g.fillStyle(0x3a2412, 1).fillRect(80, 140, 8, 20).fillRect(560, 138, 8, 22);
  }

  private drawStorm(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x10151f, 0x2c3442);
    g.fillStyle(0x0a0d12, 0.9).fillCircle(120, 46, 42).fillCircle(200, 36, 56).fillCircle(300, 50, 48);
    g.fillStyle(0x0a0d12, 0.8).fillCircle(470, 40, 52).fillCircle(560, 54, 46);
    g.fillStyle(0x18222c, 1).fillRect(0, 158, 640, 74);
    this.waves(g, 166, 0x4f7f92, 0.7);
    g.lineStyle(3, 0xffe9a8, 0.95);
    g.beginPath();
    g.moveTo(430, 0).lineTo(408, 46).lineTo(426, 48).lineTo(394, 110);
    g.strokePath();
    this.ship(g, 260, 168, 1.5);
    g.fillStyle(0x0a0d12, 0.55).fillRect(0, 0, 640, ART_H);
  }

  private drawDrift(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x050b17, 0x123046);
    g.fillStyle(0xffe9a8, 0.8);
    for (const [x, y] of [[80, 40], [160, 70], [300, 30], [420, 62], [540, 38], [600, 90], [220, 110]]) {
      g.fillCircle(x, y, 1.5);
    }
    g.fillStyle(0xf0dfb8, 0.9).fillCircle(520, 48, 16);
    g.fillStyle(0x0c2434, 1).fillRect(0, 150, 640, 82);
    this.waves(g, 158, 0x2f6f8f, 0.6);
    g.fillStyle(0x5a3a1e, 1).fillRect(288, 176, 64, 34);
    g.lineStyle(2, 0x2a1b12, 1).strokeRect(288, 176, 64, 34);
    g.lineBetween(288, 176, 352, 210).lineBetween(352, 176, 288, 210);
    g.fillStyle(0xc9a24a, 1).fillRect(292, 180, 56, 4);
    g.fillStyle(0x0a0d12, 1).fillTriangle(300, 100, 312, 104, 304, 108);
    g.fillTriangle(322, 96, 334, 100, 326, 104);
  }

  private drawBeach(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x2b3f63, 0xe8a86a, 10);
    g.fillStyle(0xf0c07a, 0.9).fillCircle(470, 84, 22);
    g.fillStyle(0x2f7f96, 1).fillRect(0, 142, 640, 52);
    this.waves(g, 150, 0x8fd3df, 0.7);
    g.fillStyle(0xd9a05e, 1).fillRect(0, 184, 640, 48);
    g.fillStyle(0x6b4420, 1).fillRect(300, 184, 48, 26);
    g.lineStyle(2, 0x3a2412, 1).strokeRect(300, 184, 48, 26);
    g.fillStyle(0x3a2412, 1).fillRect(392, 172, 10, 6).fillRect(388, 178, 18, 4);
    g.fillStyle(0x2b2118, 1).fillRect(380, 170, 8, 4);
    g.fillStyle(0x2b2118, 1).fillRect(436, 164, 54, 8);
    g.fillStyle(0x4a2f18, 1).fillRect(452, 152, 8, 20);
    g.lineStyle(1, 0x2b2118, 0.8).lineBetween(460, 152, 490, 166);
  }

  private drawIsland(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x1d3557, 0x6fa8b8, 10);
    g.fillStyle(0x2f7f96, 1).fillRect(0, 130, 640, 102);
    this.waves(g, 144, 0x8fd3df, 0.6);
    g.fillStyle(0x3f7a3a, 1).fillEllipse(320, 196, 430, 130);
    g.fillStyle(0x2f5f2c, 1).fillEllipse(250, 186, 160, 60).fillEllipse(430, 190, 150, 54);
    g.fillStyle(0xd9a05e, 1).fillEllipse(320, 232, 420, 34);
    g.fillStyle(0x4a2f18, 1).fillRect(452, 120, 10, 72);
    g.fillStyle(0x2b2118, 1).fillTriangle(430, 130, 500, 138, 452, 150);
    g.lineStyle(1, 0xd8c8a0, 0.6).lineBetween(462, 122, 500, 166);
    g.fillStyle(0x6b4420, 1).fillRect(140, 204, 10, 30);
    g.fillStyle(0x2f6b3f, 1).fillTriangle(130, 204, 160, 204, 145, 176);
    g.fillStyle(0x3f8a4f, 1).fillTriangle(120, 218, 168, 218, 145, 186);
  }

  private finish(): void {
    if (this.advancing) return;
    this.advancing = true;
    const state = this.state();
    if (state) {
      markIntroSeen(state);
      try {
        saveGame(state);
      } catch {
        // private mode: continue
      }
      playSfx(this, state, 'close');
    }
    this.cameras.main.fadeOut(320, 0, 0, 0);
    this.time.delayedCall(340, () => {
      if (this.replay) {
        this.scene.resume('IslandScene');
        this.scene.resume('UIScene');
        this.scene.stop();
      } else {
        this.scene.start('IslandScene');
      }
    });
  }
}
