import Phaser from 'phaser';
import { createNewGame } from '../core/gameState';
import { PlayerEntity } from '../entities/player';
import { CANOPY_OFFSET, LIGHT_DEPTH, NIGHT_DEPTH, depthFor } from '../world/depthSort';
import { TILE, terrainSpeedAt } from '../world/terrain';

interface Keys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
}

export class IslandScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private ground!: Phaser.Tilemaps.TilemapLayer;
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private player!: PlayerEntity;
  private keys!: Keys;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private light!: Phaser.GameObjects.Image;
  private state = createNewGame();

  constructor() {
    super('IslandScene');
  }

  preload(): void {
    this.load.tilemapTiledJSON('island', 'assets/maps/island.tmj');
    this.load.image('tiles', 'assets/tiles/placeholder.png');
  }

  create(): void {
    this.makeTextures();

    this.map = this.make.tilemap({ key: 'island' });
    const tileset = this.map.addTilesetImage('placeholder', 'tiles', 16, 16, 0, 0);
    if (!tileset) throw new Error('Missing tileset');
    this.ground = this.map.createLayer('ground', tileset, 0, 0)!;
    this.collision = this.map.createLayer('collision', tileset, 0, 0)!;
    this.collision.setVisible(false);
    this.collision.setCollisionByExclusion([-1, 0]);

    const spawn = this.map.findObject('objects', (o) => o.name === 'spawn_wreck');
    const spawnX = typeof spawn?.x === 'number' ? spawn.x : this.state.world.wreckSpawn.x;
    const spawnY = typeof spawn?.y === 'number' ? spawn.y : this.state.world.wreckSpawn.y;
    this.player = new PlayerEntity(this, spawnX + 8, spawnY + 16);
    this.physics.add.collider(this.player, this.collision);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(2);
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);

    this.addDecorations();
    this.createNightLayer();

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SHIFT') as unknown as Keys;
  }

  private makeTextures(): void {
    if (this.textures.exists('player')) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x2f2a26).fillRect(2, 8, 8, 8);
    g.fillStyle(0xe0b080).fillRect(3, 2, 6, 6);
    g.generateTexture('player', 12, 16);
    g.clear();

    g.fillStyle(0x5b3f2a).fillRect(0, 0, 8, 20);
    g.generateTexture('tree-trunk', 8, 20);
    g.clear();

    g.fillStyle(0x3f6b3a).fillCircle(14, 10, 10);
    g.fillStyle(0x4e7f45).fillCircle(8, 12, 8);
    g.fillStyle(0x5a8f4d).fillCircle(20, 12, 8);
    g.generateTexture('tree-canopy', 28, 22);
    g.clear();

    g.fillStyle(0x6f6a5f).fillRect(1, 4, 14, 8);
    g.fillStyle(0x8a8478).fillRect(3, 2, 10, 4);
    g.generateTexture('rock', 16, 14);
    g.clear();

    g.fillStyle(0x7a4b2a).fillRect(1, 2, 12, 10);
    g.fillStyle(0xd6b25a).fillRect(6, 5, 4, 4);
    g.generateTexture('chest', 14, 14);
    g.clear();

    g.fillStyle(0x5b3f2a).fillRect(6, 8, 6, 16);
    g.fillStyle(0x3f6b3a).fillCircle(9, 8, 9);
    g.generateTexture('palm', 18, 24);
    g.clear();

    g.fillStyle(0x3f6b3a).fillRect(0, 8, 12, 4);
    g.fillStyle(0x6fa05a).fillRect(2, 4, 8, 4);
    g.generateTexture('vine', 12, 12);
    g.clear();

    g.fillStyle(0x3f6b3a).fillCircle(6, 8, 6);
    g.fillStyle(0xb73838).fillRect(3, 6, 2, 2);
    g.fillStyle(0xb73838).fillRect(8, 9, 2, 2);
    g.generateTexture('berry', 12, 14);
    g.clear();

    g.fillStyle(0x2f6f7e).fillRect(0, 3, 14, 6);
    g.fillStyle(0x6fb6c4).fillRect(2, 4, 10, 2);
    g.generateTexture('tide', 14, 10);
    g.clear();

    g.fillStyle(0x9a6f4f).fillRect(0, 4, 14, 6);
    g.generateTexture('clay', 14, 10);
    g.destroy();

    const canvas = this.textures.createCanvas('light', 256, 256);
    if (canvas) {
      const ctx = canvas.context;
      const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(255, 205, 130, 0.85)');
      gradient.addColorStop(1, 'rgba(255, 205, 130, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
      canvas.refresh();
    }
  }

  private addDecorations(): void {
    const objects = this.map.getObjectLayer('objects')?.objects ?? [];
    for (const obj of objects) {
      const name = obj.name ?? '';
      const x = (obj.x ?? 0) + 8;
      const y = (obj.y ?? 0) + 16;
      if (name.startsWith('tree_')) {
        this.add.image(x, y, 'tree-trunk').setOrigin(0.5, 1).setDepth(depthFor(y));
        this.add
          .image(x, y, 'tree-canopy')
          .setOrigin(0.5, 1)
          .setDepth(depthFor(y) + CANOPY_OFFSET);
      } else if (name.startsWith('rock_')) {
        this.add.image(x, y, 'rock').setOrigin(0.5, 1).setDepth(depthFor(y));
      } else if (name.startsWith('vine_')) {
        this.add.image(x, y, 'vine').setOrigin(0.5, 1).setDepth(depthFor(y));
      } else if (name.startsWith('berry_')) {
        this.add.image(x, y, 'berry').setOrigin(0.5, 1).setDepth(depthFor(y));
      } else if (name.startsWith('palm_')) {
        this.add.image(x, y, 'palm').setOrigin(0.5, 1).setDepth(depthFor(y));
      } else if (name.startsWith('tide_')) {
        this.add.image(x, y, 'tide').setOrigin(0.5, 1).setDepth(depthFor(y));
      } else if (name.startsWith('clay_')) {
        this.add.image(x, y, 'clay').setOrigin(0.5, 1).setDepth(depthFor(y));
      } else if (name === 'chest_wreck' || name === 'chest_cave') {
        this.add.image(x, y, 'chest').setOrigin(0.5, 1).setDepth(depthFor(y));
      } else if (name === 'dungeon_entrance') {
        this.add
          .text(x, y, '沉船', { fontFamily: 'monospace', fontSize: '10px', color: '#d8e4f0' })
          .setOrigin(0.5, 1)
          .setDepth(depthFor(y));
      }
    }
  }

  private createNightLayer(): void {
    const cam = this.cameras.main;
    this.nightOverlay = this.add
      .rectangle(0, 0, cam.width, cam.height, 0x081a33, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(NIGHT_DEPTH)
      .setVisible(false);
    this.light = this.add
      .image(this.player.x, this.player.y, 'light')
      .setDepth(LIGHT_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
  }

  update(): void {
    const dx = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
    const dy = Number(this.keys.S.isDown) - Number(this.keys.W.isDown);
    const length = Math.hypot(dx, dy) || 1;
    const input = { x: dx / length, y: dy / length };
    const tile = this.ground.getTileAtWorldXY(this.player.x, this.player.y - 4);
    const terrain = terrainSpeedAt(tile?.index ?? TILE.grass);
    const sprint = this.keys.SHIFT.isDown ? 1.5 : 1;
    this.player.setVelocityFromInput(input, 90 * terrain * sprint);
    this.player.setDepth(depthFor(this.player.y));
    this.light.setPosition(this.player.x, this.player.y - 8);

    const isNight = this.state.time.phase === 'night';
    this.nightOverlay.setVisible(isNight);
    this.light.setVisible(isNight);
  }
}
