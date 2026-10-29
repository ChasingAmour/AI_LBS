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
  if (!(scene.textures.exists('player-idle') && scene.textures.exists('slash'))) {
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

  ensureGearTextures(scene);
}

interface ArmorStyle {
  base: string;
  trim: string;
  pattern: 'vine' | 'shell' | 'stitch' | 'coat' | 'plate';
}

const ARMOR_STYLES: Record<string, ArmorStyle> = {
  vine_armor: { base: '#2f6b3f', trim: '#6fbf4f', pattern: 'vine' },
  shell_armor: { base: '#e8d2b8', trim: '#c9a24a', pattern: 'shell' },
  canvas_armor: { base: '#d0ba8e', trim: '#8a6a3c', pattern: 'stitch' },
  captain_coat: { base: '#2f4f7a', trim: '#c9a24a', pattern: 'coat' },
  copper_armor: { base: '#b87333', trim: '#e0a060', pattern: 'plate' },
  iron_armor: { base: '#8a97a8', trim: '#c9d4e0', pattern: 'plate' },
  leather_armor: { base: '#9a6a3a', trim: '#c9a24a', pattern: 'stitch' },
  feather_cloak: { base: '#d8cfb6', trim: '#c9a24a', pattern: 'coat' },
};

const BOOT_COLORS: Record<string, { base: string; trim: string }> = {
  straw_shoes: { base: '#c9a24a', trim: '#8a6a3c' },
  wading_shoes: { base: '#2f6b3f', trim: '#6fbf4f' },
  canvas_boots: { base: '#d0ba8e', trim: '#8a6a3c' },
  captain_boots: { base: '#4a2e14', trim: '#c9a24a' },
  leather_boots: { base: '#9a6a3a', trim: '#c9a24a' },
};

function ensureGearTextures(scene: Phaser.Scene): void {
  for (const [id, style] of Object.entries(ARMOR_STYLES)) {
    const key = `gear-armor-${id}`;
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, 16, 16);
    if (!texture) continue;
    const ctx = texture.context;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(2, 4, 12, 10);
    ctx.fillStyle = style.base;
    ctx.fillRect(3, 5, 10, 8);
    ctx.fillRect(2, 4, 3, 3);
    ctx.fillRect(11, 4, 3, 3);
    ctx.fillStyle = style.trim;
    if (style.pattern === 'vine') {
      ctx.fillRect(4, 7, 8, 1);
      ctx.fillRect(4, 9, 8, 1);
    } else if (style.pattern === 'shell') {
      ctx.fillRect(5, 7, 2, 2);
      ctx.fillRect(9, 9, 2, 2);
      ctx.fillRect(8, 6, 1, 6);
    } else if (style.pattern === 'stitch') {
      ctx.fillRect(7, 5, 1, 8);
      ctx.fillRect(4, 8, 8, 1);
    } else if (style.pattern === 'coat') {
      ctx.fillRect(7, 5, 2, 8);
      ctx.fillRect(4, 7, 1, 1);
      ctx.fillRect(11, 9, 1, 1);
    } else {
      ctx.fillRect(4, 6, 8, 2);
      ctx.fillRect(5, 10, 1, 1);
      ctx.fillRect(10, 10, 1, 1);
    }
    texture.refresh();
  }

  for (const [id, style] of Object.entries(BOOT_COLORS)) {
    const key = `gear-boots-${id}`;
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, 16, 16);
    if (!texture) continue;
    const ctx = texture.context;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(2, 10, 5, 6);
    ctx.fillRect(9, 10, 5, 6);
    ctx.fillStyle = style.base;
    ctx.fillRect(3, 11, 4, 4);
    ctx.fillRect(10, 11, 4, 4);
    ctx.fillStyle = style.trim;
    ctx.fillRect(4, 12, 3, 1);
    ctx.fillRect(10, 12, 3, 1);
    texture.refresh();
  }
}
