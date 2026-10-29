import Phaser from 'phaser';

/** Code-drawn farm plot and four crop stages (no extra art dependency). */
export function ensureFarmArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('farm-plot')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(0x5c3b1e).fillRect(1, 3, 14, 11);
  g.fillStyle(0x6b4420).fillRect(2, 4, 12, 9);
  g.fillStyle(0x4a2f18).fillRect(2, 6, 12, 1).fillRect(2, 9, 12, 1);
  g.fillStyle(0x8a5a2b).fillRect(1, 2, 2, 2).fillRect(13, 2, 2, 2);
  g.fillStyle(0x8a5a2b).fillRect(1, 12, 2, 2).fillRect(13, 12, 2, 2);
  g.generateTexture('farm-plot', 16, 16);
  g.clear();

  const seeds: Array<[string, number]> = [
    ['berries', 0xd8452f],
    ['coconut', 0xc9a24a],
  ];
  for (const [seed, fruit] of seeds) {
    for (let stage = 1; stage <= 3; stage++) {
      const height = stage === 1 ? 6 : 3 + stage * 2;
      g.fillStyle(0x2f6b3f).fillRect(7, 14 - height, 2, height);
      g.fillStyle(0x4f9f5f).fillRect(5, 14 - height, 2, 2).fillRect(9, 13 - height, 2, 2);
      if (stage >= 2) {
        g.fillStyle(0x4f9f5f).fillRect(3, 11 - stage, 3, 2);
        g.fillStyle(0x4f9f5f).fillRect(10, 12 - stage, 3, 2);
      }
      if (stage === 3) {
        g.fillStyle(fruit).fillCircle(5, 8, 2).fillCircle(11, 9, 2);
        g.fillStyle(0xffe9a8).fillRect(5, 7, 1, 1).fillRect(11, 8, 1, 1);
      }
      g.generateTexture(`crop-${seed}-${stage}`, 16, 16);
      g.clear();
    }
  }
  g.destroy();
}

export function cropTexture(seedId: string, stage: number): string {
  return `crop-${seedId}-${stage}`;
}
