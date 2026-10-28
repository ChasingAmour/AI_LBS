import Phaser from 'phaser';

/** Three 16×16 water tiles with the wave highlights shifted, for 450ms cycling. */
export function ensureWaterFrames(scene: Phaser.Scene): void {
  if (scene.textures.exists('water-0')) return;
  const battle = scene.textures.get('battle');
  const frame = battle.get(37);
  const source = battle.getSourceImage() as CanvasImageSource;
  for (let variant = 0; variant < 3; variant++) {
    const texture = scene.textures.createCanvas(`water-${variant}`, 16, 16);
    if (!texture) continue;
    const ctx = texture.context;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, frame.cutX, frame.cutY, 16, 16, 0, 0, 16, 16);
    ctx.fillStyle = 'rgba(225,250,255,0.55)';
    ctx.fillRect((2 + variant * 3) % 12, 4 + variant, 4, 1);
    ctx.fillRect((7 + variant * 2) % 12, 10 - variant, 3, 1);
    ctx.fillStyle = 'rgba(20,90,120,0.35)';
    ctx.fillRect((4 + variant * 4) % 12, 7 - variant, 5, 1);
    texture.refresh();
  }
}
