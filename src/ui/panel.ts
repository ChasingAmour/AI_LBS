import Phaser from 'phaser';

export interface PanelRow {
  label: string;
  detail?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 300;
const ROW_HEIGHT = 17;

export class Panel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private titleText: Phaser.GameObjects.Text;
  private rowObjects: Phaser.GameObjects.GameObject[] = [];
  private rows: PanelRow[] = [];
  private visible = false;
  private currentTitle = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const background = scene.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x0b1220, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x6f8fa8);
    this.titleText = scene.add.text(12, 8, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffd479',
    });
    this.container = scene.add
      .container(110, 30, [background, this.titleText])
      .setDepth(9000)
      .setScrollFactor(0)
      .setVisible(false);
  }

  get isOpen(): boolean {
    return this.visible;
  }

  open(title: string, rows: PanelRow[]): void {
    this.visible = true;
    this.currentTitle = title;
    this.rows = rows;
    this.titleText.setText(title);
    this.container.setVisible(true);
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

  private clearRows(): void {
    for (const object of this.rowObjects) object.destroy();
    this.rowObjects = [];
  }

  private renderRows(): void {
    this.clearRows();
    const startY = 34;
    const maxRows = Math.floor((PANEL_HEIGHT - startY - 8) / ROW_HEIGHT);

    this.rows.slice(0, maxRows).forEach((row, index) => {
      const y = startY + index * ROW_HEIGHT;
      const text = this.scene.add.text(12, y, row.label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: row.disabled ? '#5a6b7a' : '#d8e4f0',
      });
      if (!row.disabled && row.onClick) {
        text.setInteractive({ useHandCursor: true });
        text.on('pointerover', () => text.setColor('#ffd479'));
        text.on('pointerout', () => text.setColor('#d8e4f0'));
        text.on('pointerdown', () => {
          row.onClick?.();
          this.renderRows();
        });
      }
      this.rowObjects.push(text);

      if (row.detail) {
        const detail = this.scene.add
          .text(PANEL_WIDTH - 12, y, row.detail, {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: row.disabled ? '#44515e' : '#8fb4a8',
          })
          .setOrigin(1, 0);
        this.rowObjects.push(detail);
      }
    });

    this.container.add(this.rowObjects);
  }
}
