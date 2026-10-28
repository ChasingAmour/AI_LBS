import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, FONT_SIZE } from './theme';

export interface TextOptions {
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  origin?: [number, number];
  shadow?: boolean;
}

/**
 * Single entry point for every Text object. Keeps resolution at 1, rounds the
 * position to whole pixels and pins the font family/size so no 8/9/10/11px
 * text sneaks back into the UI.
 */
export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  options: TextOptions = {},
): Phaser.GameObjects.Text {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT_FAMILY,
    fontSize: `${options.size ?? FONT_SIZE.body}px`,
    color: options.color ?? COLORS.cream,
    align: options.align ?? 'left',
    resolution: 1,
  };

  if (options.shadow) {
    style.shadow = {
      offsetX: 1,
      offsetY: 1,
      color: 'rgba(0,0,0,0.72)',
      blur: 0,
      stroke: false,
      fill: true,
    };
  }

  const text = scene.add.text(Math.round(x), Math.round(y), content, style);
  text.setResolution(1);
  if (options.origin) text.setOrigin(options.origin[0], options.origin[1]);
  return text;
}
