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
    this.scene.bringToTop();
    this.replay = data.replay === true;
    this.index = 0;
    this.busy = false;
    this.advancing = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.add.rectangle(0, 0, 640, 360, 0x0b0906, 1).setOrigin(0, 0);

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
      case 'york':
        this.drawYork(g);
        break;
      case 'harbor':
        this.drawHarbor(g);
        break;
      case 'escape':
        this.drawEscape(g);
        break;
      case 'storm':
        this.drawStorm(g);
        break;
      case 'wreck':
        this.drawWreck(g);
        break;
      case 'raft':
        this.drawRaft(g);
        break;
      case 'supplies':
        this.drawSupplies(g);
        break;
      case 'date':
        this.drawDate(g);
        break;
    }
  }

  private drawYork(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x2a3550, 0xc98a5a, 10);
    g.fillStyle(0x1b2230, 1).fillRect(0, 150, 640, 82);
    for (const [x, w, h] of [[40, 90, 92], [150, 70, 74], [240, 100, 104], [370, 80, 84], [480, 110, 96]]) {
      g.fillStyle(0x2a1b12, 1).fillRect(x, 232 - h, w, h);
      g.fillStyle(0x4a2f18, 1).fillTriangle(x - 8, 232 - h, x + w + 8, 232 - h, x + w / 2, 232 - h - 26);
      g.fillStyle(0xf0c07a, 0.9).fillRect(x + 14, 232 - h + 18, 12, 14);
      g.fillRect(x + w - 28, 232 - h + 18, 12, 14);
    }
    g.fillStyle(0x151a20, 1).fillRect(0, 232, 640, 22);
    g.fillStyle(0x2f7f96, 0.8).fillRect(540, 196, 100, 36);
    g.fillStyle(0x2a1b12, 1).fillRect(580, 170, 3, 26).fillRect(610, 176, 3, 20);
    g.fillStyle(0xd8c8a0, 0.8).fillTriangle(583, 170, 600, 178, 583, 184);
  }

  private drawEscape(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x0b1830, 0x2f5f7a, 10);
    g.fillStyle(0xf0dfb8, 0.85).fillCircle(520, 52, 18);
    g.fillStyle(0x1d4a5e, 1).fillRect(0, 156, 640, 76);
    this.waves(g, 166, 0x5f9fb0, 0.5);
    g.fillStyle(0x3a2412, 1).fillTriangle(220, 196, 330, 196, 310, 214);
    g.fillRect(230, 194, 90, 6);
    g.fillStyle(0x2b2118, 1).fillRect(244, 176, 4, 20).fillRect(300, 176, 4, 20);
    g.fillStyle(0xd8c8a0, 0.9).fillTriangle(256, 176, 290, 186, 256, 192);
    g.fillStyle(0x2b2118, 1).fillCircle(262, 188, 3).fillCircle(286, 188, 3);
    g.fillStyle(0x0e1116, 0.85).fillRect(440, 148, 90, 10);
    g.fillRect(470, 120, 30, 28);
    g.fillStyle(0xd8c8a0, 0.7).fillRect(506, 128, 2, 20);
  }

  private drawWreck(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x1b2c46, 0x8a6a6a, 10);
    g.fillStyle(0x2f7f96, 1).fillRect(0, 142, 640, 50);
    this.waves(g, 150, 0x8fd3df, 0.55);
    g.fillStyle(0xd9a05e, 1).fillRect(0, 190, 640, 42);
    g.lineStyle(3, 0x3a2412, 1);
    g.beginPath();
    g.moveTo(360, 196);
    g.lineTo(430, 150);
    g.lineTo(470, 158);
    g.strokePath();
    g.lineStyle(2, 0x3a2412, 0.9);
    for (let i = 0; i < 6; i++) {
      g.lineBetween(370 + i * 14, 194 - i * 4, 404 + i * 12, 166 - i * 2);
    }
    g.fillStyle(0x2b2118, 1).fillRect(300, 198, 10, 5).fillRect(314, 196, 6, 4);
    g.fillStyle(0x3a2412, 1).fillRect(200, 200, 22, 10);
  }

  private drawRaft(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x16324a, 0x5f8fa0, 10);
    g.fillStyle(0x1d4a5e, 1).fillRect(0, 150, 640, 82);
    this.waves(g, 162, 0x6fb0c0, 0.55);
    g.fillStyle(0x5a3a1e, 1).fillRect(220, 188, 200, 14);
    for (let i = 0; i < 5; i++) g.lineStyle(1, 0x2a1b12, 1).lineBetween(220 + i * 40, 188, 220 + i * 40, 202);
    g.fillStyle(0x6b4420, 1).fillRect(250, 166, 44, 22);
    g.fillStyle(0x3a2412, 1).fillRect(310, 172, 26, 16);
    g.fillStyle(0xc9a24a, 1).fillRect(360, 170, 8, 18);
    g.lineStyle(1, 0xd8c8a0, 0.7).lineBetween(226, 188, 196, 160);
    g.fillStyle(0x2a1b12, 1).fillRect(470, 160, 4, 30).fillRect(500, 166, 3, 24);
  }

  private drawSupplies(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x2b3f63, 0xe8a86a, 10);
    g.fillStyle(0xf0c07a, 0.9).fillCircle(500, 78, 22);
    g.fillStyle(0x2f7f96, 1).fillRect(0, 150, 640, 40);
    g.fillStyle(0xd9a05e, 1).fillRect(0, 186, 640, 46);
    g.fillStyle(0x6b4420, 1).fillRect(220, 186, 56, 30);
    g.lineStyle(2, 0x3a2412, 1).strokeRect(220, 186, 56, 30);
    g.fillStyle(0x8a5a2b, 1).fillRect(292, 176, 34, 40);
    g.fillStyle(0xc9a24a, 1).fillRect(292, 190, 34, 4).fillRect(292, 202, 34, 4);
    g.fillStyle(0x8a97a8, 1).fillRect(348, 196, 18, 4).fillRect(354, 188, 4, 14);
    g.fillStyle(0x3a2412, 1).fillRect(380, 180, 46, 36);
    g.fillStyle(0xc9a24a, 1).fillRect(384, 184, 38, 4);
    g.fillStyle(0x2b2118, 1).fillRect(420, 202, 10, 4).fillRect(424, 194, 4, 12);
    g.fillStyle(0x2f6b3f, 1).fillRect(470, 196, 26, 6).fillRect(476, 188, 4, 10);
  }

  private drawDate(g: Phaser.GameObjects.Graphics): void {
    this.sky(g, 0x1d3557, 0xd98a5a, 10);
    g.fillStyle(0x2f7f96, 1).fillRect(0, 154, 640, 78);
    this.waves(g, 166, 0x8fd3df, 0.55);
    g.fillStyle(0xd9a05e, 1).fillRect(0, 202, 640, 30);
    g.fillStyle(0x6b4420, 1).fillRect(300, 116, 8, 92);
    g.fillStyle(0x8a5a2b, 1).fillRect(290, 160, 28, 10);
    g.fillStyle(0x4a2f18, 1).fillRect(296, 136, 16, 3).fillRect(296, 144, 12, 3).fillRect(296, 152, 14, 3);
    g.fillStyle(0x2f6b3f, 1).fillTriangle(240, 210, 270, 210, 255, 184);
    g.fillStyle(0x3f8a4f, 1).fillTriangle(230, 220, 280, 220, 255, 194);
    g.fillStyle(0x2b2118, 0.9).fillRect(360, 214, 56, 8);
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
        this.scene.start(state && !state.flags.named ? 'NameScene' : 'IslandScene');
      }
    });
  }
}
