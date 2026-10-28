import Phaser from 'phaser';
import { TINTS } from '../theme';
import type { Rect } from './layout';

/**
 * Parchment panel with a dark wood border, a cream inner line and a soft drop
 * shadow. Static chrome is drawn once into a shared Graphics object.
 */
export function drawPanel(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  const { x, y, w, h } = rect;
  g.fillStyle(0x000000, 0.3).fillRect(x + 2, y + 3, w, h);
  g.fillStyle(TINTS.parchment, 1).fillRect(x, y, w, h);
  g.lineStyle(2, TINTS.woodDark, 1).strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.lineStyle(1, TINTS.cream, 0.75).strokeRect(x + 4, y + 4, w - 8, h - 8);
}

/** Compact 3px separator used between HUD rows. */
export function drawRule(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number): void {
  g.fillStyle(TINTS.wood, 0.5).fillRect(x, y, w, 1);
}
