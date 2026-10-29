import Phaser from 'phaser';
import { makeText } from './text';
import { COLORS, TINTS } from './theme';
import { drawPanel } from './widgets/panel';

const PANEL = { x: 100, y: 16, w: 440, h: 328 };
const BTN = { w: 128, h: 58, gap: 8, x: 112, y: 70 };

export interface TouchMenuHandlers {
  inventory: () => void;
  craft: () => void;
  build: () => void;
  labor: () => void;
  map: () => void;
  adventure: () => void;
  pause: () => void;
  guide: () => void;
  toggleTouch: () => void;
}

/** Phone-only modal that replaces the keyboard shortcuts. */
export class TouchMenu {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private open = false;

  constructor(scene: Phaser.Scene, handlers: TouchMenuHandlers) {
    this.scene = scene;
    this.root = scene.add
      .container(0, 0)
      .setDepth(9100)
      .setScrollFactor(0)
      .setVisible(false);

    const backdrop = scene.add.rectangle(0, 0, 640, 360, 0x0b0906, 0.5).setOrigin(0, 0);
    this.root.add(backdrop);
    const chrome = scene.add.graphics();
    drawPanel(chrome, PANEL);
    this.root.add(chrome);
    this.root.add(
      makeText(this.scene, PANEL.x + PANEL.w / 2, PANEL.y + 10, '菜单', {
        size: 24,
        origin: [0.5, 0],
        color: COLORS.ink,
      }),
    );

    const actions: Array<[string, () => void]> = [
      ['背包', handlers.inventory],
      ['合成', handlers.craft],
      ['建造', handlers.build],
      ['劳工', handlers.labor],
      ['地图', handlers.map],
      ['冒险', handlers.adventure],
      ['暂停', handlers.pause],
      ['操作', handlers.guide],
      ['按键', handlers.toggleTouch],
      ['全屏', () => this.fullscreen()],
      ['关闭', () => this.close()],
    ];
    actions.forEach(([label, action], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = BTN.x + col * (BTN.w + BTN.gap);
      const y = BTN.y + row * (BTN.h + BTN.gap);
      const g = scene.add.graphics();
      g.fillStyle(0x3a2412, 1).fillRect(x, y, BTN.w, BTN.h);
      g.lineStyle(2, TINTS.goldDark, 1).strokeRect(x + 1, y + 1, BTN.w - 2, BTN.h - 2);
      this.root.add(g);
      this.root.add(
        makeText(this.scene, x + BTN.w / 2, y + BTN.h / 2, label, {
          size: 24,
          origin: [0.5, 0.5],
          color: COLORS.cream,
        }),
      );
      const zone = scene.add
        .zone(x + BTN.w / 2, y + BTN.h / 2, BTN.w, BTN.h)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.close();
        action();
      });
      this.root.add(zone);
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  show(): void {
    this.open = true;
    this.root.setVisible(true);
  }

  close(): void {
    this.open = false;
    this.root.setVisible(false);
  }

  private fullscreen(): void {
    const request = document.documentElement.requestFullscreen?.();
    if (request) void request.catch(() => undefined);
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (mode: string) => Promise<void>;
    };
    const locked = orientation.lock?.('landscape');
    if (locked) void locked.catch(() => undefined);
  }
}
