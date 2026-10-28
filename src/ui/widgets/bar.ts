import Phaser from 'phaser';
import { TINTS } from '../theme';
import { barWidth } from './layout';

export interface BarStyle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}

/** Empty track + border drawn once, before the dynamic fill rectangle. */
export function drawBarTrack(g: Phaser.GameObjects.Graphics, style: BarStyle): void {
  g.fillStyle(TINTS.track, 0.9).fillRect(style.x, style.y, style.w, style.h);
  g.lineStyle(1, TINTS.woodDark, 1).strokeRect(style.x - 0.5, style.y - 0.5, style.w + 1, style.h + 1);
}

/** Width in pixels for the current value; see barWidth for the maths. */
export function fillWidth(value: number, max: number, width: number): number {
  return barWidth(value, max, width);
}
