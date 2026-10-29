import Phaser from 'phaser';

/** Small outlined world-space nameplate used under animals and monsters. */
export function worldNameLabel(
  scene: Phaser.Scene,
  text: string,
  size = 10,
): Phaser.GameObjects.Text {
  return scene.add
    .text(0, 0, text, {
      fontFamily: '"Fusion Pixel 12px", monospace',
      fontSize: `${size}px`,
      color: '#f7f1e3',
      stroke: '#2b2118',
      strokeThickness: 2,
      resolution: 2,
    })
    .setOrigin(0.5, 0);
}
