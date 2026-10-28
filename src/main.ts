import Phaser from 'phaser';
import './style.css';
import { BASE_HEIGHT, BASE_WIDTH, integerScale } from './core/scaling';
import { GAME_CONFIG } from './core/config';
import { BootScene } from './scenes/BootScene';
import { IslandScene } from './scenes/IslandScene';
import { UIScene } from './scenes/UIScene';
import { PauseScene } from './scenes/PauseScene';
import { DeathScene } from './scenes/DeathScene';

const FONT_SPEC = '12px "Fusion Pixel 12px"';

function applyIntegerScale(game: Phaser.Game): void {
  const canvas = game.canvas;
  if (!canvas) return;
  const { scale } = integerScale(window.innerWidth, window.innerHeight);
  canvas.style.width = `${BASE_WIDTH * scale}px`;
  canvas.style.height = `${BASE_HEIGHT * scale}px`;
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
    scene: [BootScene, IslandScene, UIScene, PauseScene, DeathScene],
  } as Phaser.Types.Core.GameConfig);

  applyIntegerScale(game);
  window.addEventListener('resize', () => applyIntegerScale(game));

  if (import.meta.env.DEV) {
    (globalThis as unknown as { __game: Phaser.Game }).__game = game;
  }
}

void boot();
