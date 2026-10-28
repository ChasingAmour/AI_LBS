import Phaser from 'phaser';
import { GAME_CONFIG } from './core/config';
import { BootScene } from './scenes/BootScene';
import { IslandScene } from './scenes/IslandScene';

const game = new Phaser.Game({
  ...GAME_CONFIG,
  scene: [BootScene, IslandScene],
} as Phaser.Types.Core.GameConfig);

if (import.meta.env.DEV) {
  (globalThis as unknown as { __game: Phaser.Game }).__game = game;
}
