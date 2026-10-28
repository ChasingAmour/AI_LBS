import Phaser from 'phaser';
import { createNewGame } from '../core/gameState';
import { validateGameData } from '../systems/dataValidation';
import { loadGameResult } from '../systems/saveSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.tilemapTiledJSON('island', 'assets/maps/island.tmj');
    this.load.image('tiles', 'assets/tiles/placeholder.png');
  }

  create(): void {
    const errors = validateGameData();
    if (errors.length > 0) {
      console.error('游戏数据校验失败：', errors);
    }

    const loaded = loadGameResult();
    const state = loaded.state ?? createNewGame();
    this.registry.set('state', state);
    this.registry.set('loadSource', loaded.source);
    if (loaded.source === 'backup') {
      this.registry.set('loadNotice', '主存档损坏，已使用备份存档');
    } else if (loaded.source === 'main') {
      this.registry.set('loadNotice', `读取存档：第 ${state.time.day} 天`);
    }

    this.scene.start('IslandScene');
  }
}
