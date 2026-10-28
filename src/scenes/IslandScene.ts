import Phaser from 'phaser';
import { createNewGame, type GameState } from '../core/gameState';
import { WORLD } from '../core/config';
import { EventBus } from '../core/eventBus';
import { createRng, type Rng } from '../core/rng';
import { PlayerEntity } from '../entities/player';
import { BuildingSprite } from '../entities/building';
import { LABORER_TEXTURE, LABORER_FRAME } from '../entities/laborer';
import { SAVAGE_TEXTURE, SAVAGE_FRAME } from '../entities/savage';
import { LIGHT_DEPTH, NIGHT_DEPTH, depthFor } from '../world/depthSort';
import { bobOffset, lowHealthVignette, nightAlpha } from '../world/lighting';
import { TILE, terrainSpeedAt } from '../world/terrain';
import { generateIsland, type IslandData } from '../world/generate';
import { CHUNK_PX, CHUNK_TILES, chunkKey, chunkOf, visibleChunks } from '../world/chunks';
import { isWalkableTile, tileAt, LANDMARK_NAMES } from '../world/landmarks';
import { isWater, terrainSprite, variantFor } from '../world/terrainVisual';
import { decorForChunk } from '../world/decor';
import { generateNodes } from '../world/nodes';
import { DEPTH } from '../ui/theme';
import { buildingSprite, nodeSprite } from '../ui/assets';
import { makeText } from '../ui/text';
import { decodeExplored, encodeExplored } from '../core/explored';
import { RESOURCE_NODES, UNIQUE_CHESTS } from '../data/spawns';
import { WEAPONS, weaponFor } from '../data/weapons';
import { advanceTime, canSleep, sleep } from '../systems/timeSystem';
import {
  applySleepRecovery,
  drinkFreshWater,
  spendEnergy,
  tickNeeds,
} from '../systems/needsSystem';
import { damageTool, ensureHotbar } from '../systems/inventorySystem';
import {
  gatherNode,
  hasToolFor,
  openUniqueChest,
  respawnNodes,
  tickTorchFuel,
} from '../systems/resourceSystem';
import { canPlace, placeBuilding } from '../systems/buildingSystem';
import { checkCampUpgrade } from '../systems/campSystem';
import { captureSavage } from '../systems/captureSystem';
import { settleLaborRations, tickLabor } from '../systems/laborSystem';
import { resolveRaidDawn, spawnRaid, updateSavageAi } from '../systems/raidSystem';
import {
  applyHitToSavage,
  computeHitTargets,
  tickSavageStun,
} from '../systems/combatSystem';
import {
  collectLoot,
  findInteractTarget,
  pickUpGroundLoot,
  type InteractTarget,
} from '../systems/interactionSystem';
import { refreshTutorial } from '../systems/tutorialSystem';
import { saveGame } from '../systems/saveSystem';
import { ITEMS } from '../data/items';

interface Keys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
  E: Phaser.Input.Keyboard.Key;
}

const STEP = 1 / 60;

export class IslandScene extends Phaser.Scene {
  private island!: IslandData;
  private terrain!: Uint8Array;
  private chunkLayers = new Map<string, Phaser.GameObjects.Image>();
  private exploredSet = new Set<string>();
  private lastNodeSync = 0;
  private player!: PlayerEntity;
  private keys!: Keys;
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private light!: Phaser.GameObjects.Image;
  private vignette!: Phaser.GameObjects.Image;
  private buildingLights = new Map<string, Phaser.GameObjects.Image>();
  private state!: GameState;
  private bus = new EventBus();
  private rng!: Rng;

  private nodeSprites = new Map<
    string,
    { shadow: Phaser.GameObjects.Ellipse; sprite: Phaser.GameObjects.Image }
  >();
  private buildingSprites = new Map<string, BuildingSprite>();
  private savageSprites = new Map<string, Phaser.GameObjects.Image>();
  private laborerSprites = new Map<string, Phaser.GameObjects.Image>();
  private buildGhost?: Phaser.GameObjects.Image;
  private buildMarker?: Phaser.GameObjects.Graphics;
  private buildReason?: Phaser.GameObjects.Text;
  private channel: { target: InteractTarget; elapsed: number } | null = null;
  private accumulator = 0;
  private nextAttackAt = 0;
  private deathLaunched = false;

  constructor() {
    super('IslandScene');
  }

  create(): void {
    const registered = this.registry.get('state') as GameState | undefined;
    this.state = registered ?? createNewGame();
    this.bus = new EventBus();
    this.registry.set('state', this.state);
    this.registry.set('bus', this.bus);
    this.registry.set('nearStation', false);
    this.registry.set('buildSelection', null);
    this.registry.set('interactPrompt', null);
    this.registry.set('interactProgress', null);
    this.rng = createRng(this.state.rngState);
    this.deathLaunched = false;
    this.chunkLayers.clear();
    this.exploredSet = decodeExplored(this.state.world.explored);
    this.lastNodeSync = 0;

    this.makeWorldTextures();
    this.setupTerrain();

    const start = this.startPosition();
    this.state.player.x = start.x;
    this.state.player.y = start.y;
    this.player = new PlayerEntity(this, start.x, start.y);

    this.physics.world.setBounds(0, 0, WORLD.widthPx, WORLD.heightPx);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD.widthPx, WORLD.heightPx);
    camera.setZoom(2);
    camera.centerOn(start.x, start.y);
    camera.startFollow(this.player, true, 0.18, 0.18);
    camera.preRender();

    this.registerWorldObjects();
    this.syncNodes(true);
    this.syncBuildings();
    this.syncSavages();
    this.syncLaborers();
    this.createNightLayer();
    this.bindInput();
    this.bindGameEvents();
    this.updateChunks(true);

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
    refreshTutorial(this.state, this.bus);
  }

  /** Rebuilds the island from the stored seed and writes back the derived values. */
  private setupTerrain(): void {
    this.island = generateIsland(this.state.world.seed);
    this.terrain = this.island.terrain;
    this.registry.set('island', this.island);
    this.state.world.hash = this.island.hash;
    this.state.camp.center = {
      x: Math.floor(this.island.campCenter.x / WORLD.tile),
      y: Math.floor(this.island.campCenter.y / WORLD.tile),
    };
    this.state.world.wreckSpawn = { x: this.island.spawn.x, y: this.island.spawn.y };
  }

  private startPosition(): { x: number; y: number } {
    const { x, y } = this.state.player;
    if (x > 0 && y > 0 && this.terrainAtWorld(x, y) !== TILE.deepWater) return { x, y };
    return { x: this.island.spawn.x, y: this.island.spawn.y };
  }

  private terrainAt(tileX: number, tileY: number): number {
    return tileAt(this.island, tileX, tileY);
  }

  private terrainAtWorld(x: number, y: number): number {
    return this.terrainAt(Math.floor(x / WORLD.tile), Math.floor(y / WORLD.tile));
  }

  private isWalkableWorld(x: number, y: number): boolean {
    return isWalkableTile(this.terrainAtWorld(x, y));
  }

  /** One baked 512×512 ground canvas per visible 32×32 chunk. */
  private bakeChunk(cx: number, cy: number): void {
    const key = chunkKey(cx, cy);
    if (this.chunkLayers.has(key)) return;

    const textureKey = `chunk-${key}`;
    if (this.textures.exists(textureKey)) this.textures.remove(textureKey);
    const canvasTexture = this.textures.createCanvas(textureKey, CHUNK_PX, CHUNK_PX);
    if (!canvasTexture) return;
    const ctx = canvasTexture.context;
    ctx.imageSmoothingEnabled = false;

    const seed = this.state.world.seed;
    const sources: Record<string, CanvasImageSource> = {
      town: this.textures.get('town').getSourceImage() as CanvasImageSource,
      battle: this.textures.get('battle').getSourceImage() as CanvasImageSource,
      farm: this.textures.get('farm').getSourceImage() as CanvasImageSource,
    };
    const drawFrame = (texture: string, frame: number, x: number, y: number): void => {
      const source = sources[texture] ?? sources.town;
      const offset = this.textures.get(texture).get(frame);
      ctx.drawImage(source, offset.cutX, offset.cutY, WORLD.tile, WORLD.tile, x, y, WORLD.tile, WORLD.tile);
    };
    const rgba = (color: number, alpha: number): string =>
      `rgba(${(color >> 16) & 0xff},${(color >> 8) & 0xff},${color & 0xff},${alpha})`;

    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const worldTx = cx * CHUNK_TILES + tx;
        const worldTy = cy * CHUNK_TILES + ty;
        if (worldTx >= WORLD.widthTiles || worldTy >= WORLD.heightTiles) continue;

        const x = tx * WORLD.tile;
        const y = ty * WORLD.tile;
        const tile = this.terrain[worldTy * WORLD.widthTiles + worldTx];
        const neighbors = {
          n: !isWater(this.terrainAt(worldTx, worldTy - 1)),
          e: !isWater(this.terrainAt(worldTx + 1, worldTy)),
          s: !isWater(this.terrainAt(worldTx, worldTy + 1)),
          w: !isWater(this.terrainAt(worldTx - 1, worldTy)),
        };
        const sprite = terrainSprite(tile, neighbors, variantFor(worldTx, worldTy, seed));
        drawFrame(sprite.texture, sprite.frame, x, y);
        if (sprite.shade) {
          ctx.fillStyle = rgba(sprite.shade.color, sprite.shade.alpha);
          ctx.fillRect(x, y, WORLD.tile, WORLD.tile);
        }
        if (sprite.foam) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          if (sprite.foam & 1) ctx.fillRect(x, y, WORLD.tile, 1);
          if (sprite.foam & 2) ctx.fillRect(x + WORLD.tile - 1, y, 1, WORLD.tile);
          if (sprite.foam & 4) ctx.fillRect(x, y + WORLD.tile - 1, WORLD.tile, 1);
          if (sprite.foam & 8) ctx.fillRect(x, y, 1, WORLD.tile);
        }
      }
    }

    for (const decor of decorForChunk(seed, cx, cy)) {
      if (!this.isWalkableWorld(decor.x, decor.y)) continue;
      drawFrame(
        decor.texture,
        decor.frame,
        decor.x - cx * CHUNK_PX - WORLD.tile / 2,
        decor.y - cy * CHUNK_PX - WORLD.tile / 2,
      );
    }

    canvasTexture.refresh();
    const layer = this.add
      .image(cx * CHUNK_PX, cy * CHUNK_PX, textureKey)
      .setOrigin(0, 0)
      .setDepth(DEPTH.world);
    this.chunkLayers.set(key, layer);
  }

  /** Bakes at most one chunk per frame, and frees chunks that left the view. */
  private updateChunks(initial = false): void {
    const view = this.cameras.main.worldView;
    const wanted = visibleChunks(view.x, view.y, view.width, view.height);
    const wantedKeys = new Set(wanted.map((chunk) => chunkKey(chunk.cx, chunk.cy)));

    for (const [key, layer] of this.chunkLayers) {
      if (wantedKeys.has(key)) continue;
      layer.destroy();
      if (this.textures.exists(`chunk-${key}`)) this.textures.remove(`chunk-${key}`);
      this.chunkLayers.delete(key);
    }

    const missing = wanted
      .filter((chunk) => !this.chunkLayers.has(chunkKey(chunk.cx, chunk.cy)))
      .sort((a, b) => {
        const da = Math.hypot(a.cx * CHUNK_PX - view.centerX, a.cy * CHUNK_PX - view.centerY);
        const db = Math.hypot(b.cx * CHUNK_PX - view.centerX, b.cy * CHUNK_PX - view.centerY);
        return da - db;
      });
    const budget = initial ? missing.length : 1;
    for (const chunk of missing.slice(0, budget)) {
      this.bakeChunk(chunk.cx, chunk.cy);
    }

    if (this.player) {
      const tileX = Math.floor(this.player.x / WORLD.tile);
      const tileY = Math.floor(this.player.y / WORLD.tile);
      const { cx, cy } = chunkOf(tileX, tileY);
      const key = `${cx},${cy}`;
      if (!this.exploredSet.has(key)) {
        this.exploredSet.add(key);
        this.state.world.explored = encodeExplored(this.exploredSet);
      }
    }
  }

  private makeWorldTextures(): void {
    if (this.textures.exists('palm') && this.textures.exists('hut')) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    this.drawPalm(g);
    g.clear();

    this.drawHut(g);
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

    const vignette = this.textures.createCanvas('vignette', 320, 180);
    if (vignette) {
      const ctx = vignette.context;
      const gradient = ctx.createRadialGradient(160, 90, 40, 160, 90, 175);
      gradient.addColorStop(0, 'rgba(120, 12, 12, 0)');
      gradient.addColorStop(0.65, 'rgba(120, 12, 12, 0.12)');
      gradient.addColorStop(1, 'rgba(90, 6, 6, 0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 320, 180);
      vignette.refresh();
    }
  }

  /** Hand-drawn 18×24 palm: curved trunk, five fronds and two coconuts. */
  private drawPalm(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x6b4420).fillRect(9, 10, 3, 14);
    g.fillRect(7, 14, 3, 10);
    g.fillStyle(0x8a5a2b).fillRect(10, 10, 2, 14);
    g.fillStyle(0x2f6b34).fillRect(1, 5, 8, 3);
    g.fillRect(9, 5, 8, 3);
    g.fillRect(4, 2, 10, 3);
    g.fillRect(2, 8, 6, 2);
    g.fillRect(10, 8, 6, 2);
    g.fillStyle(0x4e8f45).fillRect(5, 1, 8, 2);
    g.fillStyle(0x3a2a18).fillRect(7, 10, 2, 2);
    g.fillRect(10, 11, 2, 2);
    g.generateTexture('palm', 18, 24);
  }

  /** 32×32 thatch hut (shown at 2× as the 2×2 camp shelter). */
  private drawHut(g: Phaser.GameObjects.Graphics): void {
    // stone foundation
    g.fillStyle(0x8a8478).fillRect(3, 26, 26, 4);
    g.fillStyle(0x6f6a5f).fillRect(3, 29, 26, 1);
    // log walls
    g.fillStyle(0x8a5a2b).fillRect(5, 13, 22, 14);
    g.fillStyle(0x6b4420).fillRect(5, 13, 22, 2);
    g.fillStyle(0x6b4420).fillRect(5, 20, 22, 1);
    g.fillStyle(0x6b4420).fillRect(5, 25, 22, 1);
    // thatch roof
    g.fillStyle(0xb98b3c).fillTriangle(1, 14, 16, 2, 31, 14);
    g.fillStyle(0xd8b25a).fillTriangle(4, 12, 16, 3, 28, 12);
    g.fillStyle(0xa97c32).fillRect(1, 12, 30, 3);
    // chimney
    g.fillStyle(0x8a8478).fillRect(23, 1, 5, 9);
    g.fillStyle(0x6f6a5f).fillRect(23, 1, 5, 2);
    // door with warm light
    g.fillStyle(0x3a2412).fillRect(12, 18, 8, 10);
    g.fillStyle(0xffc861).fillRect(13, 20, 6, 6);
    g.fillStyle(0xfff0b8).fillRect(14, 21, 4, 3);
    // window
    g.fillStyle(0x3a2412).fillRect(7, 16, 4, 4);
    g.fillStyle(0xffd479).fillRect(8, 17, 2, 2);
    g.generateTexture('hut', 32, 32);
  }

  private registerWorldObjects(): void {
    this.state.world.nodes = {};
    for (const node of generateNodes(this.island, this.state.world.seed)) {
      this.state.world.nodes[node.id] = { x: node.x, y: node.y, type: node.type };
    }
    for (const landmark of this.island.landmarks) {
      if (landmark.kind === 'wreck') {
        this.state.world.nodes.chest_wreck = { x: landmark.x, y: landmark.y, type: 'chest' };
      } else if (landmark.kind === 'cave') {
        this.state.world.nodes.chest_cave = { x: landmark.x, y: landmark.y, type: 'chest' };
      }
    }
  }

  private syncNodes(initial = false): void {
    if (initial) {
      for (const [id, node] of Object.entries(this.state.world.nodes)) {
        const spec = nodeSprite(node.type, false);
        const shadow = this.add
          .ellipse(node.x, node.y - 2, 10, 4, 0x000000, 0.22)
          .setDepth(depthFor(node.y) - 1);
        const sprite = this.add
          .image(node.x, node.y, spec.texture, spec.frame)
          .setOrigin(0.5, 1)
          .setDepth(depthFor(node.y));
        this.nodeSprites.set(id, { shadow, sprite });
      }
    }

    for (const [id, view] of this.nodeSprites) {
      const node = this.state.world.nodes[id];
      if (!node) continue;
      const def = RESOURCE_NODES[node.type];
      const depleted = def ? (this.state.world.nodeStates[id]?.remaining ?? def.maxHits) <= 0 : false;
      const chestOpened = id.startsWith('chest_') && this.state.world.uniqueLoot.includes(id);
      const spec = nodeSprite(node.type, depleted || chestOpened);
      view.shadow.setVisible(!depleted);
      view.sprite.setTexture(spec.texture, spec.frame);
      view.sprite.setAlpha(depleted || chestOpened ? 0.35 : 1);
    }
  }

  private syncBuildings(): void {
    const ids = new Set(this.state.buildings.map((b) => b.id));
    for (const [id, sprite] of this.buildingSprites) {
      if (!ids.has(id)) {
        sprite.destroy();
        this.buildingSprites.delete(id);
        this.buildingLights.get(id)?.destroy();
        this.buildingLights.delete(id);
      }
    }
    for (const building of this.state.buildings) {
      if (this.buildingSprites.has(building.id)) continue;
      this.buildingSprites.set(building.id, new BuildingSprite(this, building));
      if (building.type === 'campfire') {
        const light = this.add
          .image(building.x * 16 + 8, building.y * 16 + 8, 'light')
          .setDisplaySize(96, 96)
          .setDepth(LIGHT_DEPTH)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false);
        this.buildingLights.set(building.id, light);
      }
    }
  }

  private syncSavages(): void {
    const ids = new Set(this.state.savages.map((s) => s.id));
    for (const [id, sprite] of this.savageSprites) {
      if (!ids.has(id)) {
        sprite.destroy();
        this.savageSprites.delete(id);
      }
    }
    const bob = bobOffset(this.time.now);
    for (const savage of this.state.savages) {
      let sprite = this.savageSprites.get(savage.id);
      if (!sprite) {
        sprite = this.add
          .image(savage.x, savage.y, SAVAGE_TEXTURE, SAVAGE_FRAME)
          .setOrigin(0.5, 1);
        this.savageSprites.set(savage.id, sprite);
      }
      sprite.setPosition(savage.x, savage.y - (savage.mode === 'dead' ? 0 : bob));
      sprite.setDepth(depthFor(savage.y));
      sprite.setAlpha(savage.mode === 'dead' ? 0.35 : 1);
      sprite.setFlipX(savage.x < this.state.player.x);
      if (savage.lastHitAgo < 0.08) sprite.setTintFill(0xffffff);
      else if (savage.mode === 'stunned') sprite.setTint(0x8fd4ff);
      else sprite.clearTint();
    }
  }

  private syncLaborers(): void {
    const ids = new Set(this.state.laborers.map((l) => l.id));
    for (const [id, sprite] of this.laborerSprites) {
      if (!ids.has(id)) {
        sprite.destroy();
        this.laborerSprites.delete(id);
      }
    }
    const bob = bobOffset(this.time.now);
    for (const laborer of this.state.laborers) {
      let sprite = this.laborerSprites.get(laborer.id);
      if (!sprite) {
        sprite = this.add
          .image(laborer.x, laborer.y, LABORER_TEXTURE, LABORER_FRAME)
          .setOrigin(0.5, 1);
        this.laborerSprites.set(laborer.id, sprite);
      }
      sprite.setPosition(laborer.x, laborer.y - bob).setDepth(depthFor(laborer.y));
    }
  }

  private createNightLayer(): void {
    const cam = this.cameras.main;
    this.nightOverlay = this.add
      .rectangle(0, 0, cam.width, cam.height, 0x081a33, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(NIGHT_DEPTH)
      .setVisible(false);
    this.light = this.add
      .image(this.player.x, this.player.y, 'light')
      .setDisplaySize(48, 48)
      .setDepth(LIGHT_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.vignette = this.add
      .image(0, 0, 'vignette')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(NIGHT_DEPTH + 1)
      .setAlpha(0);
  }

  private bindInput(): void {
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SHIFT,E') as unknown as Keys;
    const codes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
    ];
    this.numberKeys = codes.map((code) => this.input.keyboard!.addKey(code));

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.cancelBuild();
        return;
      }
      if (pointer.leftButtonDown()) this.handleLeftClick(pointer);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.updateBuildGhost(pointer);
    });
  }

  private bindGameEvents(): void {
    this.bus.on('save:requested', () => this.persist());
    this.bus.on('raid:started', () => {
      spawnRaid(this.state);
      this.syncSavages();
    });
    this.bus.on('raid:dawn', () => {
      const result = resolveRaidDawn(this.state);
      this.syncSavages();
      const lost = result.foodLost > 0 ? `，消耗口粮 ${result.foodLost}` : '';
      this.game.events.emit('ui:banner', `黎明：野人撤退了${lost}`);
    });
    this.bus.on('time:dayChanged', () => {
      respawnNodes(this.state);
      const rations = settleLaborRations(this.state);
      if (rations.fled.length > 0) {
        this.bus.emit('labor:fled', { ids: rations.fled });
      }
      refreshTutorial(this.state, this.bus);
      this.persist();
    });
  }

  private handleLeftClick(pointer: Phaser.Input.Pointer): void {
    const selected = this.registry.get('buildSelection') as string | null;
    if (selected) {
      this.placeSelectedBuilding(selected, pointer);
      return;
    }
    if (this.registry.get('uiOpen')) return;
    this.attack(pointer);
  }

  private placeSelectedBuilding(type: string, pointer: Phaser.Input.Pointer): void {
    if (!spendEnergy(this.state, 10)) {
      this.game.events.emit('ui:banner', '精力不足，先休息一下');
      return;
    }
    const tileX = Math.floor(pointer.worldX / 16);
    const tileY = Math.floor(pointer.worldY / 16);
    const building = placeBuilding(this.state, type, tileX, tileY, this.placementWorld());
    if (!building) {
      this.state.player.energy = Math.min(100, this.state.player.energy + 10);
      this.game.events.emit('ui:banner', '这里不能建造');
      return;
    }
    this.syncBuildings();
    this.registry.set('buildSelection', null);
    this.clearBuildPreview();
    this.game.events.emit('ui:banner', `建成了${this.buildingName(type)}`);
    checkCampUpgrade(this.state, this.bus);
    refreshTutorial(this.state, this.bus);
    this.bus.emit('save:requested', { reason: 'build' });
  }

  private buildingName(type: string): string {
    const names: Record<string, string> = {
      campfire: '营火',
      workbench: '工作台',
      cage: '囚笼',
      tent: '帐篷',
      storage: '储物箱',
      fence: '木栅栏',
      stone_wall: '石墙',
      drying_rack: '晾肉架',
    };
    return names[type] ?? type;
  }

  private placementWorld() {
    return {
      isWater: (tileX: number, tileY: number) => isWater(this.terrainAt(tileX, tileY)),
      hasNode: (tileX: number, tileY: number) =>
        Object.values(this.state.world.nodes).some(
          (node) => Math.floor(node.x / 16) === tileX && Math.floor(node.y / 16) === tileY,
        ),
      hasEnemy: (tileX: number, tileY: number) =>
        this.state.savages.some(
          (savage) =>
            savage.mode !== 'dead' &&
            Math.floor(savage.x / 16) === tileX &&
            Math.floor(savage.y / 16) === tileY,
        ),
    };
  }

  private updateBuildGhost(pointer: Phaser.Input.Pointer): void {
    const type = this.registry.get('buildSelection') as string | null;
    if (!type) {
      this.clearBuildPreview();
      return;
    }
    const spec = buildingSprite(type);
    if (!this.buildGhost) {
      this.buildGhost = this.add.image(0, 0, spec.texture, spec.frame).setOrigin(0.5, 1).setAlpha(0.65).setDepth(9000);
      this.buildMarker = this.add.graphics().setDepth(9001);
      this.buildReason = makeText(this, 0, 0, '', {
        origin: [0.5, 1],
        color: '#ff8f8f',
        shadow: true,
      })
        .setDepth(9002)
        .setVisible(false);
    }
    const tileX = Math.floor(pointer.worldX / 16);
    const tileY = Math.floor(pointer.worldY / 16);
    this.buildGhost.setTexture(spec.texture, spec.frame).setDisplaySize(spec.w, spec.h);
    this.buildGhost.setPosition(tileX * 16 + 8, tileY * 16 + 16);

    const check = canPlace(this.state, type, tileX, tileY, this.placementWorld());
    this.buildGhost.setTint(check.ok ? 0x9fff9f : 0xff9f9f);
    this.drawBuildMarker(tileX, tileY, check.ok);
    if (this.buildReason) {
      this.buildReason
        .setText(check.ok ? '' : (check.reason ?? '不能建造'))
        .setPosition(tileX * 16 + 8, tileY * 16 - 4)
        .setVisible(!check.ok);
    }
  }

  /** Green footprint + brackets when valid; red fill + X when blocked. */
  private drawBuildMarker(tileX: number, tileY: number, ok: boolean): void {
    const marker = this.buildMarker;
    if (!marker) return;
    const x = tileX * 16;
    const y = tileY * 16;
    marker.clear();
    if (ok) {
      marker.fillStyle(0x6fbf4f, 0.28).fillRect(x, y, 16, 16);
      marker.lineStyle(2, 0xd8f7b0, 0.95);
      const len = 5;
      marker.beginPath();
      marker.moveTo(x, y + len).lineTo(x, y).lineTo(x + len, y);
      marker.moveTo(x + 16 - len, y).lineTo(x + 16, y).lineTo(x + 16, y + len);
      marker.moveTo(x, y + 16 - len).lineTo(x, y + 16).lineTo(x + len, y + 16);
      marker.moveTo(x + 16 - len, y + 16).lineTo(x + 16, y + 16).lineTo(x + 16, y + 16 - len);
      marker.strokePath();
    } else {
      marker.fillStyle(0xc94f4f, 0.35).fillRect(x, y, 16, 16);
      marker.lineStyle(2, 0xff6b6b, 0.95);
      marker.beginPath();
      marker.moveTo(x + 2, y + 2).lineTo(x + 14, y + 14);
      marker.moveTo(x + 14, y + 2).lineTo(x + 2, y + 14);
      marker.strokePath();
      marker.lineStyle(1, 0xff6b6b, 0.8).strokeRect(x + 0.5, y + 0.5, 15, 15);
    }
  }

  private clearBuildPreview(): void {
    this.buildGhost?.destroy();
    this.buildGhost = undefined;
    this.buildMarker?.destroy();
    this.buildMarker = undefined;
    this.buildReason?.destroy();
    this.buildReason = undefined;
  }

  private cancelBuild(): void {
    if (!this.registry.get('buildSelection')) return;
    this.registry.set('buildSelection', null);
    this.clearBuildPreview();
    this.game.events.emit('ui:banner', '已取消建造');
  }

  private attack(pointer: Phaser.Input.Pointer): void {
    const now = this.time.now;
    if (now < this.nextAttackAt) return;
    const weapon = weaponFor(this.selectedWeaponBaseId());
    this.nextAttackAt = now + weapon.cooldownSec * 1000;

    const angle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
    const targets = this.state.savages
      .filter((savage) => savage.mode !== 'dead')
      .map((savage) => ({ id: savage.id, x: savage.x, y: savage.y }));
    const hitIds = computeHitTargets(
      { x: this.player.x, y: this.player.y, angle },
      weapon.pattern,
      targets,
    );
    for (const id of hitIds) {
      const savage = this.state.savages.find((entry) => entry.id === id);
      if (!savage) continue;
      const result = applyHitToSavage(savage, weapon, 0);
      if (result === 'stunned') {
        this.game.events.emit('ui:banner', '野人眩晕了！靠近按 E 用藤蔓捆绑');
      } else if (result === 'dead') {
        this.game.events.emit('ui:banner', '野人倒下了');
      }
    }
    if (hitIds.length > 0) this.damageWeapon();
    this.drawSwing(angle, weapon.pattern.range);
    this.syncSavages();
  }

  private selectedWeaponBaseId(): string | null {
    const equipped = this.state.equipment.weapon
      ? this.state.equipmentInstances.find((i) => i.instanceId === this.state.equipment.weapon)
      : null;
    if (equipped) return equipped.baseId;
    const hot = this.state.hotbar[this.state.hotbarIndex];
    return hot && WEAPONS[hot] ? hot : null;
  }

  private damageWeapon(): void {
    const equipped = this.state.equipment.weapon
      ? this.state.equipmentInstances.find((i) => i.instanceId === this.state.equipment.weapon)
      : null;
    if (equipped) {
      equipped.durability = Math.max(0, equipped.durability - 1);
      return;
    }
    const hot = this.state.hotbar[this.state.hotbarIndex];
    if (hot && WEAPONS[hot]) damageTool(this.state, hot, 1);
  }

  private drawSwing(angle: number, range: number): void {
    const g = this.add.graphics().setDepth(depthFor(this.player.y) + 1);
    g.lineStyle(2, 0xffe9a8, 0.9);
    g.beginPath();
    g.arc(this.player.x, this.player.y - 8, range, angle - 0.6, angle + 0.6);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);
    this.updateChunks();
    const uiOpen = Boolean(this.registry.get('uiOpen'));
    const buildSelection = Boolean(this.registry.get('buildSelection'));
    if (uiOpen && this.channel) this.cancelChannel();

    const dx = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
    const dy = Number(this.keys.S.isDown) - Number(this.keys.W.isDown);
    const moving = dx !== 0 || dy !== 0;
    if (moving && this.channel) this.cancelChannel();
    if (moving && uiOpen) this.player.setVelocity(0, 0);
    else if (this.channel || uiOpen || buildSelection) this.player.setVelocity(0, 0);
    else {
      const length = Math.hypot(dx, dy) || 1;
      const input = { x: dx / length, y: dy / length };
      if (this.terrainAtWorld(this.player.x + input.x * 12, this.player.y - 4) === TILE.deepWater) {
        input.x = 0;
      }
      if (this.terrainAtWorld(this.player.x, this.player.y - 4 + input.y * 12) === TILE.deepWater) {
        input.y = 0;
      }
      const tile = this.terrainAtWorld(this.player.x, this.player.y - 4);
      const terrain = terrainSpeedAt(tile);
      const sprint = this.keys.SHIFT.isDown ? 1.5 : 1;
      this.player.setVelocityFromInput(input, 90 * terrain * sprint);
      if (dx !== 0) this.state.player.facing = dx < 0 ? 'left' : 'right';
      else if (dy !== 0) this.state.player.facing = dy < 0 ? 'up' : 'down';
      if (this.keys.SHIFT.isDown) spendEnergy(this.state, 0.4 * dt);
    }
    this.player.setDepth(depthFor(this.player.y));
    this.light.setPosition(this.player.x, this.player.y - 8);
    this.light.setDepth(LIGHT_DEPTH);
    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;
    this.registry.set('nearStation', this.isNearStation());

    for (let i = 0; i < this.numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) {
        this.state.hotbarIndex = i;
        this.game.events.emit('ui:banner', `快捷栏 ${i + 1}：${this.hotbarLabel(i)}`);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      if (this.channel) this.cancelChannel();
      else if (!uiOpen && !buildSelection) this.beginInteraction();
    }

    this.tickChannel(dt);
    this.updatePrompt(uiOpen || buildSelection);
    this.syncSavages();
    this.syncLaborers();
    this.syncBuildings();
    if (this.time.now - this.lastNodeSync >= 250) {
      this.lastNodeSync = this.time.now;
      this.syncNodes();
    }

    const night = nightAlpha(this.state.time.clockMin);
    const isNight = night > 0.02;
    this.nightOverlay.setAlpha(night).setVisible(isNight);
    this.light.setVisible(isNight);
    const lightSize = this.torchLightSize();
    this.light.setDisplaySize(lightSize, lightSize);
    for (const light of this.buildingLights.values()) light.setVisible(isNight);
    this.vignette.setAlpha(lowHealthVignette(this.state.player.hp));

    this.accumulator += dt;
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      this.step(STEP);
    }
  }

  private hotbarLabel(index: number): string {
    const baseId = this.state.hotbar[index];
    if (!baseId) return '空';
    return ITEMS[baseId]?.name ?? baseId;
  }

  private isNearStation(): boolean {
    return this.state.buildings.some((building) => {
      if (!['workbench', 'campfire', 'drying_rack'].includes(building.type)) return false;
      const bx = building.x * 16 + 8;
      const by = building.y * 16 + 16;
      return Math.hypot(this.player.x - bx, this.player.y - by) <= 48;
    });
  }

  private step(dt: number): void {
    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;
    advanceTime(this.state, dt, this.bus);
    tickNeeds(this.state, dt);
    tickLabor(this.state, dt);
    respawnNodes(this.state);
    for (const savage of this.state.savages) {
      tickSavageStun(savage, dt);
      updateSavageAi(this.state, savage, dt);
    }
    tickTorchFuel(this.state, dt);
    this.discoverLandmarks();
    refreshTutorial(this.state, this.bus);
    checkCampUpgrade(this.state, this.bus);

    if (this.state.player.dead && !this.deathLaunched) {
      this.deathLaunched = true;
      this.scene.pause();
      this.scene.pause('UIScene');
      this.scene.launch('DeathScene');
    }
  }

  /** Walking within 120px of a landmark reveals it on the map for good. */
  private discoverLandmarks(): void {
    for (const landmark of this.island.landmarks) {
      if (this.state.world.discovered.includes(landmark.id)) continue;
      if (Math.hypot(this.player.x - landmark.x, this.player.y - landmark.y) > 120) continue;
      this.state.world.discovered.push(landmark.id);
      this.game.events.emit('ui:banner', `发现了${LANDMARK_NAMES[landmark.kind]}`);
    }
  }

  private updatePrompt(suppressed: boolean): void {
    if (suppressed) {
      this.registry.set('interactPrompt', null);
      this.registry.set('interactProgress', null);
      return;
    }
    if (this.channel) {
      this.registry.set('interactProgress', this.channel.elapsed / this.channel.target.durationSec);
      return;
    }
    const tile = this.terrainAtWorld(this.player.x, this.player.y - 4);
    const onWater = tile === TILE.shallowWater || tile === TILE.stream;
    const target = findInteractTarget(this.state, this.player.x, this.player.y, { onWater });
    this.registry.set('interactPrompt', target ? `E ${target.label}` : null);
    this.registry.set('interactProgress', null);
  }

  private beginInteraction(): void {
    const tile = this.terrainAtWorld(this.player.x, this.player.y - 4);
    const onWater = tile === TILE.shallowWater || tile === TILE.stream;
    const target = findInteractTarget(this.state, this.player.x, this.player.y, { onWater });
    if (!target) return;
    if (target.kind === 'node') {
      const def = RESOURCE_NODES[this.state.world.nodes[target.id]?.type ?? ''];
      const remaining = this.state.world.nodeStates[target.id]?.remaining ?? def?.maxHits ?? 0;
      if (remaining <= 0) {
        this.game.events.emit('ui:banner', '这里已经采空了，过几天再来');
        return;
      }
    }
    if (target.kind === 'chest' && this.state.world.uniqueLoot.includes(target.id)) {
      this.game.events.emit('ui:banner', '这个箱子已经打开过了');
      return;
    }
    if (target.kind === 'node') {
      const node = this.state.world.nodes[target.id];
      const cost = this.gatherEnergyCost(node?.type ?? '');
      if (this.state.player.energy < cost) {
        this.game.events.emit('ui:banner', '精力不足，先吃点东西或睡一觉');
        return;
      }
    }
    if (target.kind === 'building' && this.state.player.energy < 10) {
      const building = this.state.buildings.find((b) => b.id === target.id);
      if (building?.type === 'workbench' || building?.type === 'storage') {
        this.game.events.emit('ui:banner', '精力不足，先休息一下');
        return;
      }
    }
    const slow = this.state.player.energy < 10 && (target.kind === 'node' || target.kind === 'building');
    this.channel = {
      target: slow ? { ...target, durationSec: target.durationSec * 2 } : target,
      elapsed: 0,
    };
  }

  /** Torches widen the night light from 48px to 64px. */
  private torchLightSize(): number {
    const lit = this.state.inventory.some(
      (item) => item.baseId === 'torch' && (item.durability ?? 0) > 0,
    );
    return lit ? 64 : 48;
  }

  private gatherEnergyCost(nodeType: string): number {    if (nodeType === 'tree') return 5;
    if (nodeType === 'rock' || nodeType === 'clay') return 6;
    return 1;
  }

  private cancelChannel(): void {
    this.channel = null;
    this.registry.set('interactProgress', null);
  }

  private tickChannel(dt: number): void {
    if (!this.channel) return;
    const target = this.channel.target;
    const distance = Math.hypot(this.player.x - target.x, this.player.y - target.y);
    if (target.kind !== 'water' && distance > 48) {
      this.cancelChannel();
      return;
    }
    this.channel.elapsed += dt;
    if (this.channel.elapsed < target.durationSec) return;
    const finished = this.channel.target;
    this.channel = null;
    this.registry.set('interactProgress', null);
    this.performInteraction(finished);
  }

  private performInteraction(target: InteractTarget): void {
    switch (target.kind) {
      case 'node':
        this.gather(target);
        break;
      case 'chest':
        this.openChest(target);
        break;
      case 'water':
        drinkFreshWater(this.state);
        this.game.events.emit('ui:banner', '你喝了几口水，口渴 +40');
        break;
      case 'savage':
        this.capture(target);
        break;
      case 'laborer':
        this.game.events.emit('ui:panel', 'labor');
        break;
      case 'building':
        this.useBuilding(target);
        break;
      case 'groundLoot':
        if (pickUpGroundLoot(this.state, target.id)) {
          this.game.events.emit('ui:banner', `拾取了${ITEMS[target.id]?.name ?? target.id}`);
        } else {
          this.game.events.emit('ui:banner', '背包已经满了');
        }
        break;
    }
    refreshTutorial(this.state, this.bus);
  }

  private gather(target: InteractTarget): void {
    const node = this.state.world.nodes[target.id];
    if (!node) return;
    const def = RESOURCE_NODES[node.type];
    if (!def) return;
    if (!spendEnergy(this.state, this.gatherEnergyCost(node.type))) {
      this.game.events.emit('ui:banner', '精力不足，先吃点东西或睡一觉');
      return;
    }
    const result = gatherNode(this.state, target.id, this.rng);
    this.state.rngState = this.rng.state();
    if (result.items.length > 0) {
      const leftover = collectLoot(this.state, result.items, node.x, node.y);
      const names = result.items
        .map((item) => `${ITEMS[item.baseId]?.name ?? item.baseId}×${item.count}`)
        .join('、');
      this.game.events.emit(
        'ui:banner',
        leftover > 0 ? `采集到${names}，背包已满` : `采集到${names}`,
      );
      for (const item of result.items) ensureHotbar(this.state, item.baseId);
    } else if (result.depleted) {
      this.game.events.emit('ui:banner', `${def.name}被采空了`);
    } else {
      this.game.events.emit('ui:banner', `继续采集${def.name}`);
    }
    if (def.tool && hasToolFor(this.state, target.id)) {
      damageTool(this.state, def.tool, 1);
    }
    this.syncNodes();
  }

  private openChest(target: InteractTarget): void {
    const def = UNIQUE_CHESTS[target.id];
    if (!def) return;
    const items = openUniqueChest(this.state, target.id);
    if (!items) {
      this.game.events.emit(
        'ui:banner',
        def.requiresTorch ? '箱子里太黑，需要手持点燃的火把' : '这个箱子已经打开过了',
      );
      return;
    }
    const node = this.state.world.nodes[target.id];
    const leftover = collectLoot(this.state, items, node?.x ?? this.player.x, node?.y ?? this.player.y);
    const names = items
      .map((item) => `${ITEMS[item.baseId]?.name ?? item.baseId}×${item.count}`)
      .join('、');
    this.game.events.emit(
      'ui:banner',
      leftover > 0 ? `箱子里有${names}，部分装不下` : `打开箱子：${names}`,
    );
    this.syncNodes();
  }

  private capture(target: InteractTarget): void {
    const laborer = captureSavage(this.state, target.id);
    if (!laborer) {
      this.game.events.emit('ui:banner', '需要先击晕野人，并准备藤蔓与囚笼空间');
      return;
    }
    this.syncSavages();
    this.syncLaborers();
    this.game.events.emit('ui:banner', `${laborer.name}加入了营地`);
  }

  private useBuilding(target: InteractTarget): void {
    const building = this.state.buildings.find((b) => b.id === target.id);
    if (!building) return;
    if (building.type === 'tent') {
      const check = canSleep(this.state);
      if (!check.ok) {
        this.game.events.emit('ui:banner', check.reason ?? '现在不能睡觉');
        return;
      }
      sleep(this.state, this.bus);
      applySleepRecovery(this.state);
      this.game.events.emit('ui:banner', '你睡到了第二天清晨');
      this.persist();
      return;
    }
    if (building.type === 'workbench') {
      this.registry.set('nearStation', true);
      this.game.events.emit('ui:panel', 'craft');
      return;
    }
    if (building.type === 'storage') {
      const contents = (building.storage ?? [])
        .map((item) => `${ITEMS[item.baseId]?.name ?? item.baseId}×${item.count}`)
        .join('、');
      this.game.events.emit('ui:banner', contents ? `储物箱：${contents}` : '储物箱是空的');
      return;
    }
    if (building.type === 'campfire') {
      const bx = building.x * 16 + 8;
      const by = building.y * 16 + 16;
      const nearby = this.state.world.groundLoot.filter(
        (loot) => loot.x !== undefined && loot.y !== undefined && Math.hypot(loot.x - bx, loot.y - by) < 48,
      );
      if (nearby.length === 0) {
        this.game.events.emit('ui:banner', '营火噼啪作响');
        return;
      }
      for (const loot of nearby) pickUpGroundLoot(this.state, loot.baseId);
      this.game.events.emit('ui:banner', '拾取了营火旁的物资');
    }
  }

  private persist(): void {
    try {
      saveGame(this.state);
    } catch {
      // Storage may be unavailable (private mode); the game keeps running.
    }
  }
}
