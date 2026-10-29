import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { saveGame } from '../systems/saveSystem';
import { makeText } from '../ui/text';
import { COLORS, TINTS } from '../ui/theme';
import { drawPanel } from '../ui/widgets/panel';

const PANEL = { x: 90, y: 54, w: 460, h: 252 };
const RANDOM_NAMES = ['鲁滨孙', '星期五', '海狼', '阿特拉斯', '小舟', '贝壳', '漂流者'];

export class NameScene extends Phaser.Scene {
  private inputEl?: HTMLInputElement;
  private state?: GameState;
  private confirming = false;

  constructor() {
    super('NameScene');
  }

  create(): void {
    this.state = this.registry.get('state') as GameState | undefined;
    this.add.rectangle(0, 0, 640, 360, 0x05080c, 0.78).setOrigin(0, 0);
    if (this.textures.exists('vignette')) {
      this.add.image(0, 0, 'vignette').setOrigin(0, 0).setDisplaySize(640, 360).setAlpha(0.8);
    }
    const g = this.add.graphics();
    drawPanel(g, PANEL);

    makeText(this, 320, PANEL.y + 18, '失落方舟 · 给你的主角起个名字', {
      size: 24,
      color: COLORS.ink,
      align: 'center',
    }).setOrigin(0.5, 0);

    makeText(this, 320, PANEL.y + 54, '名字会写进存档，并用于界面称呼。', {
      color: COLORS.inkSoft,
      align: 'center',
    }).setOrigin(0.5, 0);

    this.createInput();

    this.button(320, PANEL.y + 172, '开始漂流', () => this.confirm());
    const random = makeText(this, 320, PANEL.y + 216, '换个名字', {
      origin: [0.5, 0],
      color: COLORS.goldDark,
    });
    random.setInteractive({ useHandCursor: true });
    random.on('pointerdown', () => {
      const next = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
      if (this.inputEl) this.inputEl.value = next;
    });

    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.positionInput, this);
    this.events.once('shutdown', () => this.cleanup());
  }

  private createInput(): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 12;
    input.value = this.state?.player.name ?? '';
    input.placeholder = '输入名字（最多 12 字）';
    Object.assign(input.style, {
      position: 'fixed',
      boxSizing: 'border-box',
      padding: '0 10px',
      border: '2px solid #8a6a3c',
      borderRadius: '2px',
      background: '#f8ecd0',
      color: '#2b2118',
      fontFamily: '"Fusion Pixel 12px", monospace',
      outline: 'none',
      zIndex: '50',
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.confirm();
      }
    });
    document.body.appendChild(input);
    this.inputEl = input;
    this.positionInput();
    window.setTimeout(() => input.focus(), 60);
  }

  private positionInput(): void {
    const input = this.inputEl;
    const canvas = this.game.canvas;
    if (!input || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / 640;
    input.style.left = `${rect.left + 190 * scale}px`;
    input.style.top = `${rect.top + 156 * scale}px`;
    input.style.width = `${260 * scale}px`;
    input.style.height = `${38 * scale}px`;
    input.style.fontSize = `${18 * scale}px`;
  }

  private button(x: number, y: number, label: string, onClick: () => void): void {
    const g = this.add.graphics();
    g.fillStyle(0x3a2412, 1).fillRect(x - 90, y, 180, 34);
    g.lineStyle(2, TINTS.goldDark, 1).strokeRect(x - 89, y + 1, 178, 32);
    const text = makeText(this, x, y + 17, label, {
      origin: [0.5, 0.5],
      color: COLORS.cream,
    });
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', onClick);
  }

  private confirm(): void {
    if (this.confirming) return;
    this.confirming = true;
    const state = this.state;
    const name = (this.inputEl?.value ?? '').trim().slice(0, 12) || '鲁滨孙';
    if (state) {
      state.player.name = name;
      state.flags.named = true;
      try {
        saveGame(state);
      } catch {
        // private mode: continue without saving
      }
    }
    this.inputEl?.blur();
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.time.delayedCall(280, () => {
      this.scene.start(state?.scene === 'dungeon' ? 'DungeonScene' : 'IslandScene');
    });
  }

  private cleanup(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.positionInput, this);
    this.inputEl?.remove();
    this.inputEl = undefined;
  }
}
