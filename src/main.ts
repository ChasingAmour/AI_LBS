import Phaser from 'phaser';
import { GAME_CONFIG } from './core/config';
import { BootScene } from './scenes/BootScene';
import { IslandScene } from './scenes/IslandScene';
import { UIScene } from './scenes/UIScene';
import { PauseScene } from './scenes/PauseScene';
import { DeathScene } from './scenes/DeathScene';

const game = new Phaser.Game({
  ...GAME_CONFIG,
  scene: [BootScene, IslandScene, UIScene, PauseScene, DeathScene],
} as Phaser.Types.Core.GameConfig);

if (import.meta.env.DEV) {
  (globalThis as unknown as { __game: Phaser.Game }).__game = game;
}
