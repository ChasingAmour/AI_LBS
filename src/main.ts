import Phaser from 'phaser';
import { GAME_CONFIG } from './core/config';
import { BootScene } from './scenes/BootScene';
import { IslandScene } from './scenes/IslandScene';

new Phaser.Game({
  ...GAME_CONFIG,
  scene: [BootScene, IslandScene],
} as Phaser.Types.Core.GameConfig);
