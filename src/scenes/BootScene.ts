import Phaser from 'phaser';
import { createNewGame } from '../core/gameState';
import { ensurePlayerFrames } from '../entities/playerFrames';
import { validateGameData } from '../systems/dataValidation';
import { loadGameResult } from '../systems/saveSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const frame = { frameWidth: 16, frameHeight: 16 };
    this.load.spritesheet('town', 'assets/tiles/town.png', frame);
    this.load.spritesheet('battle', 'assets/tiles/battle.png', frame);
    this.load.spritesheet('dungeon', 'assets/tiles/dungeon.png', frame);
    this.load.spritesheet('farm', 'assets/tiles/farm.png', frame);
    this.load.spritesheet('ui-large', 'assets/ui/ui-large.png', frame);
    this.load.spritesheet('ui-small', 'assets/ui/ui-small.png', frame);
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    ensurePlayerFrames(this);
    const errors = validateGameData();
    if (errors.length > 0) {
      console.error('游戏数据校验失败：', errors);
    }

    const loaded = loadGameResult();
    const state = loaded.state ?? createNewGame();
    // Dev-only QA shortcut: /AI_LBS/?dungeon=1|2|3 starts inside that floor.
    const forcedFloor = Number(new URLSearchParams(window.location.search).get('dungeon'));
    if (import.meta.env.DEV && forcedFloor >= 1 && forcedFloor <= 3) {
      state.scene = 'dungeon';
      state.dungeonFloor = forcedFloor as 1 | 2 | 3;
    }
    this.registry.set('state', state);
    this.registry.set('loadSource', loaded.source);
    if (loaded.source === 'backup') {
      this.registry.set('loadNotice', '主存档损坏，已使用备份存档');
    } else if (loaded.source === 'main') {
      this.registry.set('loadNotice', `读取存档：第 ${state.time.day} 天`);
    }

    this.scene.start(state.scene === 'dungeon' && state.dungeonFloor ? 'DungeonScene' : 'IslandScene');
  }
}
