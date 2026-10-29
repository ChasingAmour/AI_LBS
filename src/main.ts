import Phaser from 'phaser';
import './style.css';
import { BASE_HEIGHT, BASE_WIDTH, fitScale, integerScale } from './core/scaling';
import { isTouchDevice, shouldPauseForPortrait } from './core/platform';
import { GAME_CONFIG } from './core/config';
import { BootScene } from './scenes/BootScene';
import { IntroScene } from './scenes/IntroScene';
import { NameScene } from './scenes/NameScene';
import { GuideScene } from './scenes/GuideScene';
import { IslandScene } from './scenes/IslandScene';
import { DungeonScene } from './scenes/DungeonScene';
import { UIScene } from './scenes/UIScene';
import { PauseScene } from './scenes/PauseScene';
import { DeathScene } from './scenes/DeathScene';

const FONT_SPEC = '12px "Fusion Pixel 12px"';

function applyViewportScale(game: Phaser.Game): void {
  const canvas = game.canvas;
  if (!canvas) return;
  const touch = isTouchDevice();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const result = touch ? fitScale(width, height) : integerScale(width, height);
  canvas.style.width = `${BASE_WIDTH * result.scale}px`;
  canvas.style.height = `${BASE_HEIGHT * result.scale}px`;

  const portrait = shouldPauseForPortrait({ touch, width, height });
  document.body.classList.toggle('show-rotate', portrait);
  if (portrait) game.loop.sleep();
  else game.loop.wake();
}

function setupRotateHint(): void {
  document.getElementById('rotate-fullscreen')?.addEventListener('click', () => {
    const root = document.documentElement;
    const fullscreen = root.requestFullscreen?.();
    if (fullscreen) void fullscreen.catch(() => undefined);
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (mode: string) => Promise<void>;
    };
    const locked = orientation.lock?.('landscape');
    if (locked) void locked.catch(() => undefined);
  });
}

async function loadPixelFont(): Promise<void> {
  try {
    await document.fonts.load(FONT_SPEC);
    if (!document.fonts.check(FONT_SPEC)) {
      console.warn('Fusion Pixel 12px 未生效，回退到 monospace');
    }
  } catch (error) {
    console.warn('像素字体加载失败，回退到 monospace', error);
  }
}

async function boot(): Promise<void> {
  await loadPixelFont();

  const game = new Phaser.Game({
    ...GAME_CONFIG,
    scene: [BootScene, IntroScene, NameScene, GuideScene, IslandScene, DungeonScene, UIScene, PauseScene, DeathScene],
  } as Phaser.Types.Core.GameConfig);

  applyViewportScale(game);
  const enforcePortraitSleep = (): void => {
    if (document.body.classList.contains('show-rotate')) game.loop.sleep();
  };
  game.events.on('step', enforcePortraitSleep);
  game.events.once('ready', () => {
    applyViewportScale(game);
    window.setTimeout(enforcePortraitSleep, 0);
  });
  setupRotateHint();
  const onViewportChange = (): void => applyViewportScale(game);
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);

  const unlockAudio = (): void => {
    (game.sound as unknown as { unlock?: () => void }).unlock?.();
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });

  const debug =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug'));
  if (debug) {
    (globalThis as unknown as { __game: Phaser.Game }).__game = game;
  }
}

void boot();
