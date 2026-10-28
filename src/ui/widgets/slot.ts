import Phaser from 'phaser';
import { TINTS } from '../theme';

/** Dark slot with a 2px gold border when selected. */
export function drawSlot(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  selected: boolean,
): void {
  g.fillStyle(0x1b120b, 1).fillRect(x, y, size, size);
  g.lineStyle(selected ? 2 : 1, selected ? TINTS.gold : TINTS.wood, 1);
  g.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  if (selected) {
    g.lineStyle(1, TINTS.goldDark, 1).strokeRect(x + 3.5, y + 3.5, size - 7, size - 7);
  }
}
