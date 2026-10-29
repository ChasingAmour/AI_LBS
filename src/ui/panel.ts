import Phaser from 'phaser';
import { makeText } from './text';
import { COLORS, TINTS } from './theme';
import { pageLabel, pageWindow, visibleRows } from './widgets/scrollList';

export interface PanelRow {
  label: string;
  detail?: string;
  /** Smaller second line, used by the crafting book for equipment stats. */
  sub?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export type PanelStyle = 'list' | 'craft' | 'build' | 'labor';

interface PanelGeometry {
  width: number;
  height: number;
  x: number;
  y: number;
  header: number;
  perPage: number;
  step: number;
}

const GEOMETRY: Record<PanelStyle, PanelGeometry> = {
  list: { width: 420, height: 300, x: 110, y: 30, header: 44, perPage: 8, step: 1 },
  craft: { width: 560, height: 340, x: 40, y: 10, header: 52, perPage: 9, step: 1 },
  build: { width: 560, height: 340, x: 40, y: 10, header: 52, perPage: 8, step: 2 },
  labor: { width: 560, height: 340, x: 40, y: 10, header: 52, perPage: 4, step: 1 },
};

const CARD = {
  build: { w: 258, h: 62, gapX: 14, gapY: 12, x: 14 },
  labor: { w: 528, h: 64, gapX: 0, gapY: 4, x: 16 },
} as const;

/** Parchment modal used by craft (list), build (2×4 cards) and labour (scroll cards). */
export class Panel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private backdrop: Phaser.GameObjects.Rectangle;
  private chrome: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private rowObjects: Phaser.GameObjects.GameObject[] = [];
  private rows: PanelRow[] = [];
  private visible = false;
  private currentTitle = '';
  private currentStyle: PanelStyle = 'list';
  private scroll = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.chrome = scene.add.graphics();
    this.titleText = makeText(scene, 16, 12, '', { size: 24, color: COLORS.ink });
    this.backdrop = scene.add.rectangle(0, 0, 640, 360, 0x0b0906, 0.45).setOrigin(0, 0);
    this.container = scene.add
      .container(GEOMETRY.list.x, GEOMETRY.list.y, [this.backdrop, this.chrome, this.titleText])
      .setDepth(9000)
      .setScrollFactor(0)
      .setVisible(false);

    scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      const geo = GEOMETRY[this.currentStyle];
      if (!this.visible || this.rows.length <= geo.perPage) return;
      this.scroll = Phaser.Math.Clamp(
        this.scroll + (dy > 0 ? geo.step : -geo.step),
        0,
        Math.max(0, this.rows.length - geo.perPage),
      );
      this.renderRows();
    });
  }

  get isOpen(): boolean {
    return this.visible;
  }

  get style(): PanelStyle {
    return this.currentStyle;
  }

  open(title: string, rows: PanelRow[], style: PanelStyle = 'list'): void {
    this.visible = true;
    this.currentTitle = title;
    this.currentStyle = style;
    this.rows = rows;
    this.scroll = 0;
    this.titleText.setText(title);
    this.container.setPosition(GEOMETRY[style].x, GEOMETRY[style].y);
    this.backdrop.setPosition(-GEOMETRY[style].x, -GEOMETRY[style].y);
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

  toggle(title: string, rows: PanelRow[], style: PanelStyle = 'list'): void {
    if (this.visible && this.currentTitle === title) {
      this.close();
      return;
    }
    this.open(title, rows, style);
  }

  private drawChrome(): void {
    const geo = GEOMETRY[this.currentStyle];
    this.chrome.clear();
    this.chrome.fillStyle(0x000000, 0.35).fillRect(3, 4, geo.width, geo.height);
    this.chrome.fillStyle(TINTS.parchment, 1).fillRect(0, 0, geo.width, geo.height);
    this.chrome.lineStyle(2, TINTS.woodDark, 1).strokeRect(1, 1, geo.width - 2, geo.height - 2);
    this.chrome.lineStyle(1, TINTS.cream, 0.8).strokeRect(5, 5, geo.width - 10, geo.height - 10);
    this.chrome.fillStyle(TINTS.goldDark, 0.5).fillRect(8, geo.header - 2, geo.width - 16, 1);
  }

  private clearRows(): void {
    for (const object of this.rowObjects) object.destroy();
    this.rowObjects = [];
  }

  private renderRows(): void {
    this.clearRows();
    const geo = GEOMETRY[this.currentStyle];
    const { start, end } = visibleRows(this.rows.length, this.scroll, geo.perPage);

    if (this.currentStyle === 'list' || this.currentStyle === 'craft') {
      this.renderList(start, end, geo);
    } else {
      this.renderCards(start, end);
    }

    if (this.rows.length > geo.perPage) {
      this.pageButton('◀', geo.width - 78, 18, -geo.perPage);
      this.rootPageLabel(geo);
      this.pageButton('▶', geo.width - 16, 18, geo.perPage);
    }

    this.container.add(this.rowObjects);
  }

  private pageButton(label: string, x: number, y: number, delta: number): void {
    const geo = GEOMETRY[this.currentStyle];
    const text = makeText(this.scene, x, y, label, {
      size: 24,
      origin: [1, 0],
      color: COLORS.goldDark,
    });
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      this.scroll = pageWindow(this.rows.length, this.scroll, geo.perPage, delta);
      this.renderRows();
    });
    this.rowObjects.push(text);
  }

  private rootPageLabel(geo: PanelGeometry): void {
    const text = makeText(
      this.scene,
      geo.width - 47,
      20,
      pageLabel(this.rows.length, this.scroll, geo.perPage),
      { origin: [0.5, 0], color: COLORS.inkSoft },
    );
    this.rowObjects.push(text);
  }

  private renderList(start: number, end: number, geo: PanelGeometry): void {
    const craft = this.currentStyle === 'craft';
    const rowHeight = craft ? 30 : 28;
    for (let index = start; index < end; index++) {
      const row = this.rows[index];
      const y = geo.header + (index - start) * rowHeight;
      const color = row.disabled ? COLORS.muted : COLORS.ink;
      const text = makeText(this.scene, 16, y + (craft ? 2 : 7), row.label, { color });
      this.rowObjects.push(text);

      if (row.detail) {
        const detail = makeText(this.scene, geo.width - 16, y + (craft ? 3 : 8), row.detail, {
          origin: [1, 0],
          color: row.disabled ? COLORS.muted : COLORS.inkSoft,
        });
        this.rowObjects.push(detail);
      }

      if (row.sub) {
        const sub = makeText(this.scene, 16, y + 16, row.sub, {
          size: 10,
          color: row.disabled ? COLORS.muted : COLORS.inkSoft,
        });
        this.rowObjects.push(sub);
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
  }

  private renderCards(start: number, end: number): void {
    const isBuild = this.currentStyle === 'build';
    const card = isBuild ? CARD.build : CARD.labor;
    const geo = GEOMETRY[this.currentStyle];

    for (let index = start; index < end; index++) {
      const row = this.rows[index];
      const slot = index - start;
      const col = isBuild ? slot % 2 : 0;
      const line = isBuild ? Math.floor(slot / 2) : slot;
      const x = card.x + col * (card.w + card.gapX);
      const y = geo.header + line * (card.h + card.gapY);

      const g = this.scene.add.graphics();
      const fill = row.disabled ? 0xe6d6b2 : 0xf8ecd0;
      g.fillStyle(fill, 1).fillRect(x, y, card.w, card.h);
      g.lineStyle(1, row.disabled ? TINTS.muted : TINTS.wood, 1).strokeRect(
        x + 0.5,
        y + 0.5,
        card.w - 1,
        card.h - 1,
      );
      if (!row.disabled) {
        g.lineStyle(1, TINTS.goldDark, 0.7).strokeRect(x + 3.5, y + 3.5, card.w - 7, card.h - 7);
      }
      this.rowObjects.push(g);

      const nameColor = row.disabled ? COLORS.muted : COLORS.ink;
      const name = makeText(this.scene, x + 10, y + 8, row.label, {
        color: nameColor,
      });
      this.rowObjects.push(name);

      if (row.detail) {
        const detail = makeText(this.scene, x + 10, y + (isBuild ? 26 : 30), row.detail, {
          color: row.disabled ? COLORS.muted : COLORS.inkSoft,
        });
        detail.setWordWrapWidth(card.w - 22);
        detail.setLineSpacing(0);
        this.rowObjects.push(detail);
      }

      if (!row.disabled && row.onClick) {
        const hover = this.scene.add.graphics().setVisible(false);
        hover.lineStyle(2, TINTS.goldDark, 1).strokeRect(x + 1, y + 1, card.w - 2, card.h - 2);
        this.rowObjects.push(hover);

        const zone = this.scene.add
          .zone(x + card.w / 2, y + card.h / 2, card.w, card.h)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => hover.setVisible(true));
        zone.on('pointerout', () => hover.setVisible(false));
        zone.on('pointerdown', () => {
          row.onClick?.();
          if (this.visible) this.renderRows();
        });
        this.rowObjects.push(zone);
      }
    }
  }
}
