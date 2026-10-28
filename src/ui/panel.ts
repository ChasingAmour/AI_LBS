import Phaser from 'phaser';
import { makeText } from './text';
import { COLORS, TINTS } from './theme';
import { visibleRows } from './widgets/scrollList';

export interface PanelRow {
  label: string;
  detail?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 300;
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 44;
const MAX_ROWS = Math.floor((PANEL_HEIGHT - HEADER_HEIGHT - 12) / ROW_HEIGHT);

/** Parchment modal list used by craft, build and labor. */
export class Panel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private chrome: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private rowObjects: Phaser.GameObjects.GameObject[] = [];
  private rows: PanelRow[] = [];
  private visible = false;
  private currentTitle = '';
  private scroll = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.chrome = scene.add.graphics();
    this.titleText = makeText(scene, 16, 12, '', { size: 24, color: COLORS.ink });
    const backdrop = scene.add
      .rectangle(-110, -30, 640, 360, 0x0b0906, 0.45)
      .setOrigin(0, 0);
    this.container = scene.add
      .container(110, 30, [backdrop, this.chrome, this.titleText])
      .setDepth(9000)
      .setScrollFactor(0)
      .setVisible(false);

    scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      if (!this.visible || this.rows.length <= MAX_ROWS) return;
      this.scroll = Phaser.Math.Clamp(
        this.scroll + (dy > 0 ? 1 : -1),
        0,
        Math.max(0, this.rows.length - MAX_ROWS),
      );
      this.renderRows();
    });
  }

  get isOpen(): boolean {
    return this.visible;
  }

  open(title: string, rows: PanelRow[]): void {
    this.visible = true;
    this.currentTitle = title;
    this.rows = rows;
    this.scroll = 0;
    this.titleText.setText(title);
    this.container.setVisible(true);
    this.drawChrome();
    this.renderRows();
  }

  close(): void {
    this.visible = false;
    this.currentTitle = '';
    this.container.setVisible(false);
    this.clearRows();
  }

  toggle(title: string, rows: PanelRow[]): void {
    if (this.visible && this.currentTitle === title) {
      this.close();
      return;
    }
    this.open(title, rows);
  }

  private drawChrome(): void {
    this.chrome.clear();
    this.chrome.fillStyle(0x000000, 0.35).fillRect(3, 4, PANEL_WIDTH, PANEL_HEIGHT);
    this.chrome.fillStyle(TINTS.parchment, 1).fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    this.chrome.lineStyle(2, TINTS.woodDark, 1).strokeRect(1, 1, PANEL_WIDTH - 2, PANEL_HEIGHT - 2);
    this.chrome.lineStyle(1, TINTS.cream, 0.8).strokeRect(5, 5, PANEL_WIDTH - 10, PANEL_HEIGHT - 10);
    this.chrome.fillStyle(TINTS.goldDark, 0.5).fillRect(8, HEADER_HEIGHT - 2, PANEL_WIDTH - 16, 1);
  }

  private clearRows(): void {
    for (const object of this.rowObjects) object.destroy();
    this.rowObjects = [];
  }

  private renderRows(): void {
    this.clearRows();
    const { start, end } = visibleRows(this.rows.length, this.scroll, MAX_ROWS);

    for (let index = start; index < end; index++) {
      const row = this.rows[index];
      const y = HEADER_HEIGHT + (index - start) * ROW_HEIGHT;
      const color = row.disabled ? COLORS.muted : COLORS.ink;
      const text = makeText(this.scene, 16, y + 7, row.label, { color });
      this.rowObjects.push(text);

      if (row.detail) {
        const detail = makeText(this.scene, PANEL_WIDTH - 16, y + 8, row.detail, {
          origin: [1, 0],
          color: row.disabled ? COLORS.muted : COLORS.inkSoft,
        });
        this.rowObjects.push(detail);
      }

      if (!row.disabled && row.onClick) {
        text.setInteractive({ useHandCursor: true });
        text.on('pointerover', () => text.setColor(COLORS.goldDark));
        text.on('pointerout', () => text.setColor(color));
        text.on('pointerdown', () => {
          row.onClick?.();
          if (this.visible) this.renderRows();
        });
      }
    }

    if (this.rows.length > MAX_ROWS) {
      const hint = makeText(this.scene, PANEL_WIDTH / 2, PANEL_HEIGHT - 16, '滚轮翻页', {
        origin: [0.5, 0],
        color: COLORS.muted,
      });
      this.rowObjects.push(hint);
    }

    this.container.add(this.rowObjects);
  }
}
