import Phaser from 'phaser';

export type PlayerFrame = 'player-idle' | 'player-walk-a' | 'player-walk-b';

/** 8 fps leg cycle: idle → left step → right step → … */
export function walkFrame(elapsedMs: number, moving: boolean): PlayerFrame {
  if (!moving) return 'player-idle';
  return Math.floor(elapsedMs / 125) % 2 === 0 ? 'player-walk-a' : 'player-walk-b';
}

const OUTLINE = '#2b2118';
const OVERALLS = '#4a6a8a';
const BOOTS = '#8a5a2b';

function drawLeg(ctx: CanvasRenderingContext2D, x: number, top: number): void {
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, top - 1, 6, 6);
  ctx.fillStyle = OVERALLS;
  ctx.fillRect(x, top, 4, 2);
  ctx.fillStyle = BOOTS;
  ctx.fillRect(x, top + 2, 4, 3);
}

function paintFrame(
  scene: Phaser.Scene,
  key: PlayerFrame,
  source: CanvasImageSource,
  cutX: number,
  cutY: number,
  variant: 0 | 1 | 2,
): void {
  const texture = scene.textures.createCanvas(key, 16, 16);
  if (!texture) return;
  const ctx = texture.context;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, cutX, cutY, 16, 16, 0, 0, 16, 16);

  // Rebuild only the lower body so the legs stay below the torso.
  ctx.clearRect(3, 11, 10, 5);
  if (variant === 0) {
    drawLeg(ctx, 3, 12);
    drawLeg(ctx, 9, 12);
  } else if (variant === 1) {
    drawLeg(ctx, 3, 12);
    drawLeg(ctx, 9, 11);
  } else {
    drawLeg(ctx, 3, 11);
    drawLeg(ctx, 9, 12);
  }
  texture.refresh();
}

/** Builds the idle + two walk frames from the farmer sprite, plus the slash arc. */
export function ensurePlayerFrames(scene: Phaser.Scene): void {
  if (scene.textures.exists('player-idle') && scene.textures.exists('slash')) return;

  const farm = scene.textures.get('farm');
  const frame = farm.get(109);
  const source = farm.getSourceImage() as CanvasImageSource;
  paintFrame(scene, 'player-idle', source, frame.cutX, frame.cutY, 0);
  paintFrame(scene, 'player-walk-a', source, frame.cutX, frame.cutY, 1);
  paintFrame(scene, 'player-walk-b', source, frame.cutX, frame.cutY, 2);

  const slash = scene.textures.createCanvas('slash', 24, 24);
  if (slash) {
    const ctx = slash.context;
    ctx.strokeStyle = 'rgba(255, 233, 168, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(12, 12, 9, -0.95, 0.95);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(12, 12, 6.5, -0.75, 0.75);
    ctx.stroke();
    slash.refresh();
  }
}
