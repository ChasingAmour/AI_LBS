import Phaser from 'phaser';
import { createNewGame, type GameState } from '../core/gameState';
import { CONFIG, WORLD } from '../core/config';
import { EventBus } from '../core/eventBus';
import { createRng, type Rng } from '../core/rng';
import { PlayerEntity } from '../entities/player';
import { BuildingSprite } from '../entities/building';
import { LABORER_TEXTURE, LABORER_FRAME } from '../entities/laborer';
import { SAVAGE_TEXTURE, SAVAGE_FRAME } from '../entities/savage';
import { LIGHT_DEPTH, NIGHT_DEPTH, depthFor } from '../world/depthSort';
import { bobOffset, carriedLight, lowHealthVignette, nightAlpha } from '../world/lighting';
import { TILE, terrainSpeedAt } from '../world/terrain';
import { generateIsland, type IslandData } from '../world/generate';
import { CHUNK_PX, CHUNK_TILES, chunkKey, chunkOf, visibleChunks } from '../world/chunks';
import { isWalkableTile, tileAt, LANDMARK_NAMES, WRECK_ENTRANCE_OFFSET_PX } from '../world/landmarks';
import { isWater, terrainSprite, variantFor } from '../world/terrainVisual';
import { decorForChunk } from '../world/decor';
import { generateNodes } from '../world/nodes';
import { DEPTH } from '../ui/theme';
import { buildingSprite, animalSprite, entranceSprite, nodeSprite, WRECK_TEXTURE } from '../ui/assets';
import { makeText } from '../ui/text';
import { decodeExplored, encodeExplored } from '../core/explored';
import { RESOURCE_NODES, UNIQUE_CHESTS } from '../data/spawns';
import { ANIMALS, ANIMAL_SPAWN } from '../data/animals';
import {
  applyHitToAnimal,
  pruneAnimals,
  spawnAnimals,
  updateAnimalAi,
  type AnimalWorld,
} from '../systems/animalSystem';
import { WEAPONS, weaponFor } from '../data/weapons';
import { advanceTime, canSleep, sleep } from '../systems/timeSystem';
import {
  applySleepRecovery,
  drinkFreshWater,
  spendEnergy,
  tickEnergyRegen,
  tickNeeds,
} from '../systems/needsSystem';
import { deriveStats, tickBootWear } from '../systems/statsSystem';
import { playSfx } from '../systems/audio';
import { isTouchControlPoint, isHotbarPoint } from '../ui/touchLayout';
import {
  FISHING_ROD_ID,
  rollCatch,
  startFishing,
  tapFishing,
  tickFishing,
  type FishingSession,
} from '../systems/fishingSystem';
import { cropDef } from '../data/farming';
import { cropStage, fillWaterskin, harvestCrop, tickFarms, waterCrop } from '../systems/farmingSystem';
import { cropTexture } from '../ui/farmArt';
import { damageTool, ensureHotbar } from '../systems/inventorySystem';
import {
  gatherNode,
  hasToolFor,
  openUniqueChest,
  respawnNodes,
  tickTorchFuel,
} from '../systems/resourceSystem';
import { BUILDINGS, campRingBounds, canPlace, hasCampFlag, placeBuilding, placementBanner } from '../systems/buildingSystem';
import { checkCampUpgrade } from '../systems/campSystem';
import { captureSavage } from '../systems/captureSystem';
import { settleLaborRations, tickLabor } from '../systems/laborSystem';
import { resolveRaidDawn, spawnRaid, updateSavageAi } from '../systems/raidSystem';
import {
  applyHitToSavage,
  autoAimAngle,
  computeHitTargets,
  tickSavageStun,
} from '../systems/combatSystem';
import {
  collectLoot,
  findInteractTarget,
  pickUpGroundLoot,
  shouldCancelChannel,
  type InteractTarget,
  type UiPanel,
} from '../systems/interactionSystem';
import { refreshTutorial } from '../systems/tutorialSystem';
import { saveGame } from '../systems/saveSystem';
import { tickWeekReset } from '../systems/dungeonReset';
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
  private chunkTextures = new Map<string, string[]>();
  private waterFrame = 0;
  private nextWaterAt = 0;
  private exploredSet = new Set<string>();
  private lastNodeSync = 0;
  private busHandlers: Array<{ event: string; handler: (payload?: unknown) => void }> = [];
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
  private animalSprites = new Map<string, Phaser.GameObjects.Image>();
  private animalDeadAt = new Map<string, number>();
  private animalRefillAt = 0;
  private laborerSprites = new Map<string, Phaser.GameObjects.Image>();
  private buildGhost?: Phaser.GameObjects.Image;
  private buildMarker?: Phaser.GameObjects.Graphics;
  private campRing?: Phaser.GameObjects.Graphics;
  private buildReason?: Phaser.GameObjects.Text;
  private slashes: Phaser.GameObjects.Image[] = [];
  private fishing: FishingSession | null = null;
  private fishingSpot: { x: number; y: number } | null = null;
  private fishingLine?: Phaser.GameObjects.Graphics;
  private fishingBobber?: Phaser.GameObjects.Arc;
  private fishingMark?: Phaser.GameObjects.Text;
  private cropSprites = new Map<string, Phaser.GameObjects.Image>();
  private channel: { target: InteractTarget; elapsed: number } | null = null;
  private accumulator = 0;
  private nextAttackAt = 0;
  private hasteUntil = 0;
  private lastHp = 100;
  private deathLaunched = false;

  constructor() {
    super('IslandScene');
  }

  create(): void {
    const registered = this.registry.get('state') as GameState | undefined;
    this.state = registered ?? createNewGame();
    this.bus = (this.registry.get('bus') as EventBus | undefined) ?? new EventBus();
    this.registry.set('state', this.state);
    this.registry.set('bus', this.bus);
    this.registry.set('nearStation', false);
    this.registry.set('buildSelection', null);
    this.registry.set('interactPrompt', null);
    this.registry.set('interactProgress', null);
    this.rng = createRng(this.state.rngState);
    this.deathLaunched = false;
    this.chunkLayers.clear();
    this.chunkTextures.clear();
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
    this.ensureWreckSprite();
    this.ensureEntranceSprite();
    this.syncBuildings();
    this.syncSavages();
    this.syncLaborers();
    this.syncAnimals();
    if (
      this.state.animals.length === 0 &&
      this.state.time.clockMin >= 360 &&
      this.state.time.clockMin < 1200
    ) {
      spawnAnimals(this.state, this.animalWorld(), this.rng);
      this.syncAnimals();
    }
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
    if (!hasCampFlag(this.state)) {
      this.state.camp.center = {
        x: Math.floor(this.island.campCenter.x / WORLD.tile),
        y: Math.floor(this.island.campCenter.y / WORLD.tile),
      };
    }
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

    const textures: string[] = [];
    for (let variant = 0; variant < 3; variant++) {
      textures.push(this.bakeChunkTexture(cx, cy, variant));
    }
    const layer = this.add
      .image(cx * CHUNK_PX, cy * CHUNK_PX, textures[0])
      .setOrigin(0, 0)
      .setDepth(DEPTH.world);
    this.chunkLayers.set(key, layer);
    this.chunkTextures.set(key, textures);
  }

  /** Bakes one water-animation variant of a chunk into a canvas texture. */
  private bakeChunkTexture(cx: number, cy: number, variant: number): string {
    const key = chunkKey(cx, cy);
    const textureKey = `chunk-${key}-${variant}`;
    if (this.textures.exists(textureKey)) this.textures.remove(textureKey);
    const canvasTexture = this.textures.createCanvas(textureKey, CHUNK_PX, CHUNK_PX);
    if (!canvasTexture) return textureKey;
    const ctx = canvasTexture.context;
    ctx.imageSmoothingEnabled = false;

    const seed = this.state.world.seed;
    const sources: Record<string, CanvasImageSource> = {
      town: this.textures.get('town').getSourceImage() as CanvasImageSource,
      battle: this.textures.get('battle').getSourceImage() as CanvasImageSource,
      farm: this.textures.get('farm').getSourceImage() as CanvasImageSource,
    };
    const water = this.textures.get(`water-${variant}`).getSourceImage() as CanvasImageSource;
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
        if (sprite.texture === 'battle') {
          ctx.drawImage(water, 0, 0, WORLD.tile, WORLD.tile, x, y, WORLD.tile, WORLD.tile);
        } else {
          drawFrame(sprite.texture, sprite.frame, x, y);
        }
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
      const tile = this.terrainAtWorld(decor.x, decor.y);
      if (tile !== TILE.grass && tile !== TILE.forest) continue;
      drawFrame(
        decor.texture,
        decor.frame,
        decor.x - cx * CHUNK_PX - WORLD.tile / 2,
        decor.y - cy * CHUNK_PX - WORLD.tile / 2,
      );
    }

    canvasTexture.refresh();
    return textureKey;
  }

  /** Bakes at most one chunk per frame, and frees chunks that left the view. */
  private updateChunks(initial = false): void {
    if (this.time.now >= this.nextWaterAt) {
      this.nextWaterAt = this.time.now + 450;
      this.waterFrame = (this.waterFrame + 1) % 3;
      for (const [key, layer] of this.chunkLayers) {
        const textures = this.chunkTextures.get(key);
        if (textures) layer.setTexture(textures[this.waterFrame]);
      }
    }
    const view = this.cameras.main.worldView;
    const wanted = visibleChunks(view.x, view.y, view.width, view.height);
    const wantedKeys = new Set(wanted.map((chunk) => chunkKey(chunk.cx, chunk.cy)));

    for (const [key, layer] of this.chunkLayers) {
      if (wantedKeys.has(key)) continue;
      layer.destroy();
      for (const texture of this.chunkTextures.get(key) ?? []) {
        if (this.textures.exists(texture)) this.textures.remove(texture);
      }
      this.chunkTextures.delete(key);
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
    if (this.textures.exists('palm') && this.textures.exists('hut') && this.textures.exists('flag')) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    this.drawPalm(g);
    g.clear();

    this.drawHut(g);
    g.clear();

    this.drawFlag(g);
    g.clear();

    this.drawHatch(g);
    g.clear();

    this.drawWreck(g);
    g.clear();

    this.drawAnimals(g);
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

  /** 16×16 shipwreck hatch: planked trapdoor with an iron ring. */
  private drawHatch(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x4a3320).fillRect(1, 6, 14, 10);
    g.fillStyle(0x6b4a2c).fillRect(2, 7, 12, 3);
    g.fillRect(2, 12, 12, 3);
    g.fillStyle(0x2b1d12).fillRect(2, 10, 12, 2);
    g.fillStyle(0x8a6a3c).fillRect(7, 9, 2, 4);
    g.fillStyle(0xc9c2b0).fillRect(7, 10, 2, 1);
    g.generateTexture('wreck-hatch', 16, 16);
  }

  /** Three 16×16 wildlife sprites drawn in code: fowl, hare and boar. */
  private drawAnimals(g: Phaser.GameObjects.Graphics): void {
    // chicken
    g.fillStyle(0xf2e6c8).fillRect(6, 8, 6, 6);
    g.fillStyle(0xe0d0aa).fillRect(6, 12, 6, 2);
    g.fillStyle(0xf7f0dc).fillRect(10, 5, 3, 4);
    g.fillStyle(0xd8452f).fillRect(12, 5, 2, 2);
    g.fillStyle(0x3a2a18).fillRect(11, 6, 1, 1);
    g.fillStyle(0xc9a227).fillRect(8, 14, 1, 2);
    g.fillRect(10, 14, 1, 2);
    g.generateTexture('animal-chicken', 16, 16);
    g.clear();

    // rabbit
    g.fillStyle(0xb9b3a8).fillRect(5, 10, 7, 5);
    g.fillStyle(0xd6d0c4).fillRect(6, 8, 4, 3);
    g.fillStyle(0xd6d0c4).fillRect(6, 3, 2, 6);
    g.fillRect(9, 4, 2, 5);
    g.fillStyle(0x3a2a18).fillRect(10, 8, 1, 1);
    g.fillStyle(0xf0ece0).fillRect(4, 12, 2, 2);
    g.generateTexture('animal-rabbit', 16, 16);
    g.clear();

    // boar
    g.fillStyle(0x5c4030).fillRect(3, 7, 10, 7);
    g.fillStyle(0x6f4e3a).fillRect(4, 5, 7, 4);
    g.fillStyle(0x3d2a1e).fillRect(11, 8, 4, 4);
    g.fillStyle(0xf0e0c0).fillRect(13, 9, 1, 1);
    g.fillStyle(0x2b1d14).fillRect(4, 14, 2, 2);
    g.fillRect(9, 14, 2, 2);
    g.fillStyle(0xe8dcc0).fillRect(15, 9, 1, 2);
    g.generateTexture('animal-boar', 16, 16);
    g.clear();

    // fish
    g.fillStyle(0x3f7f9a).fillEllipse(6, 4, 9, 5);
    g.fillStyle(0x5fa8bf).fillEllipse(6, 3, 7, 3);
    g.fillStyle(0x3f7f9a).fillTriangle(1, 4, 1, 8, 4, 4);
    g.fillStyle(0xf0f0e0).fillRect(8, 3, 1, 1);
    g.fillStyle(0x2b2118).fillRect(9, 3, 1, 1);
    g.generateTexture('animal-fish', 12, 8);
    g.clear();

    this.drawOres(g);
  }

  /** Three 16×16 ore rocks: copper flecks, iron veins and coal seams. */
  private drawOres(g: Phaser.GameObjects.Graphics): void {
    const rock = (base: number, shade: number, fleck: number): void => {
      g.fillStyle(shade).fillEllipse(8, 12, 14, 6);
      g.fillStyle(base).fillPoints(
        [
          new Phaser.Geom.Point(2, 12),
          new Phaser.Geom.Point(4, 5),
          new Phaser.Geom.Point(9, 2),
          new Phaser.Geom.Point(13, 6),
          new Phaser.Geom.Point(14, 12),
        ],
        true,
      );
      g.fillStyle(fleck).fillRect(6, 6, 2, 2);
      g.fillRect(9, 8, 2, 2);
      g.fillRect(11, 5, 1, 1);
      g.fillRect(5, 9, 1, 1);
    };
    rock(0x8a8378, 0x6f6a5f, 0xc9793a);
    g.generateTexture('ore-copper', 16, 16);
    g.clear();

    rock(0x7d8188, 0x62666c, 0xb9c2cc);
    g.generateTexture('ore-iron', 16, 16);
    g.clear();

    rock(0x5c5a56, 0x45443f, 0x24231f);
    g.generateTexture('ore-coal', 16, 16);
  }

  /** 64×40 beached shipwreck: broken hull, ribs, snapped mast and torn sail. */
  private drawWreck(g: Phaser.GameObjects.Graphics): void {
    // sand mound
    g.fillStyle(0xc9a06a, 1).fillEllipse(32, 35, 58, 10);
    g.fillStyle(0xb8905c, 1).fillEllipse(32, 36, 44, 6);
    // hull
    g.fillStyle(0x3f2a17, 1).fillPoints(
      [
        new Phaser.Geom.Point(3, 33),
        new Phaser.Geom.Point(9, 20),
        new Phaser.Geom.Point(52, 16),
        new Phaser.Geom.Point(61, 29),
        new Phaser.Geom.Point(55, 36),
        new Phaser.Geom.Point(9, 37),
      ],
      true,
    );
    g.fillStyle(0x6b4a2c, 1).fillPoints(
      [
        new Phaser.Geom.Point(8, 30),
        new Phaser.Geom.Point(12, 23),
        new Phaser.Geom.Point(50, 19),
        new Phaser.Geom.Point(57, 28),
        new Phaser.Geom.Point(50, 32),
        new Phaser.Geom.Point(12, 33),
      ],
      true,
    );
    // deck planks and ribs
    g.fillStyle(0x8a6a3c, 1).fillRect(12, 24, 38, 2);
    for (const x of [16, 24, 32, 40, 48]) {
      g.fillStyle(0x9c7a46, 1).fillRect(x, 21, 2, 10);
    }
    // broken ribs sticking out of the sand
    g.fillStyle(0x9c7a46, 1).fillRect(6, 30, 2, 6);
    g.fillRect(11, 28, 2, 8);
    // snapped mast leaning right
    g.fillStyle(0x5a3a1c, 1).fillPoints(
      [
        new Phaser.Geom.Point(34, 20),
        new Phaser.Geom.Point(50, 1),
        new Phaser.Geom.Point(52, 2),
        new Phaser.Geom.Point(36, 21),
      ],
      true,
    );
    // torn sail hanging off the mast
    g.fillStyle(0xd8cfb6, 1).fillPoints(
      [
        new Phaser.Geom.Point(47, 5),
        new Phaser.Geom.Point(60, 12),
        new Phaser.Geom.Point(53, 14),
        new Phaser.Geom.Point(56, 19),
        new Phaser.Geom.Point(46, 13),
      ],
      true,
    );
    g.fillStyle(0xbdb397, 1).fillRect(47, 9, 6, 1);
    // dark water line under the hull
    g.fillStyle(0x2f6b7a, 1).fillRect(4, 36, 54, 2);
    g.generateTexture('wreck-ship', 64, 40);
  }

  /** 12×20 camp flag: wooden pole with a red pennant. */
  private drawFlag(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x5a3a1c).fillRect(4, 4, 2, 16);
    g.fillStyle(0x7a5024).fillRect(4, 4, 1, 16);
    g.fillStyle(0xb03a2e).fillTriangle(6, 4, 12, 7, 6, 11);
    g.fillStyle(0xd4533f).fillTriangle(6, 5, 10, 7, 6, 10);
    g.fillStyle(0x3a2a18).fillRect(2, 19, 6, 1);
    g.generateTexture('flag', 14, 20);
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
        this.state.world.wreckEntrance = {
          x: landmark.x + WRECK_ENTRANCE_OFFSET_PX,
          y: landmark.y,
        };
      } else if (landmark.kind === 'cave') {
        this.state.world.nodes.chest_cave = { x: landmark.x, y: landmark.y, type: 'chest' };
      }
    }
  }

  /** Beached hull drawn behind the wreck chest and hatch. */
  private ensureWreckSprite(): void {
    const wreck = this.island.landmarks.find((entry) => entry.kind === 'wreck');
    if (!wreck) return;
    this.add
      .ellipse(wreck.x - 14, wreck.y + 2, 52, 12, 0x000000, 0.18)
      .setDepth(depthFor(wreck.y) - 2);
    this.add
      .image(wreck.x - 14, wreck.y + 4, WRECK_TEXTURE)
      .setOrigin(0.5, 1)
      .setDepth(depthFor(wreck.y) - 1);
  }

  /** Visible hatch beside the wreck chest so the dungeon entrance can be found. */
  private ensureEntranceSprite(): void {
    const entrance = this.state.world.wreckEntrance;
    if (!entrance || entrance.x <= 0) return;
    this.add
      .ellipse(entrance.x, entrance.y - 2, 14, 5, 0x000000, 0.25)
      .setDepth(depthFor(entrance.y) - 1);
    this.add
      .image(entrance.x, entrance.y, entranceSprite().texture)
      .setOrigin(0.5, 1)
      .setDepth(depthFor(entrance.y));
  }

  private syncNodes(initial = false): void {    if (initial) {
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

  /** Only nodes near the camera are drawn; the island has hundreds of them. */
  private cullNodes(): void {
    const view = this.cameras.main.worldView;
    const pad = 64;
    for (const [id, entry] of this.nodeSprites) {
      const node = this.state.world.nodes[id];
      if (!node) continue;
      const onScreen =
        node.x >= view.x - pad &&
        node.x <= view.right + pad &&
        node.y >= view.y - pad &&
        node.y <= view.bottom + pad;
      entry.sprite.setVisible(onScreen);
      const def = RESOURCE_NODES[node.type];
      const depleted = def ? (this.state.world.nodeStates[id]?.remaining ?? def.maxHits) <= 0 : false;
      entry.shadow.setVisible(onScreen && !depleted);
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

  private syncAnimals(): void {
    const ids = new Set(this.state.animals.map((a) => a.id));
    for (const [id, sprite] of this.animalSprites) {
      if (!ids.has(id)) {
        sprite.destroy();
        this.animalSprites.delete(id);
      }
    }
    const bob = bobOffset(this.time.now);
    for (const animal of this.state.animals) {
      if (animal.mode === 'dead') {
        const since = this.animalDeadAt.get(animal.id);
        if (since === undefined) this.animalDeadAt.set(animal.id, this.time.now);
        else if (this.time.now - since > 1200) {
          this.state.animals = this.state.animals.filter((entry) => entry.id !== animal.id);
          this.animalDeadAt.delete(animal.id);
          continue;
        }
      }
      let sprite = this.animalSprites.get(animal.id);
      if (!sprite) {
        sprite = this.add
          .image(animal.x, animal.y, animalSprite(animal.type).texture)
          .setOrigin(0.5, 1);
        this.animalSprites.set(animal.id, sprite);
      }
      sprite.setPosition(animal.x, animal.y - (animal.mode === 'dead' ? 0 : bob));
      sprite.setDepth(depthFor(animal.y));
      sprite.setScale(animal.type === 'boar' ? 1.4 : 1);
      sprite.setAlpha(animal.mode === 'dead' ? 0.35 : 1);
      sprite.setFlipX(animal.x < this.state.player.x);
      if (animal.mode === 'retaliate') sprite.setTint(0xffb4a0);
      else sprite.clearTint();
    }
  }

  private animalWorld(): AnimalWorld {
    return { tileAt: (tx, ty) => this.terrainAt(tx, ty) };
  }

  private syncSavages(): void {    const ids = new Set(this.state.savages.map((s) => s.id));
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
      if (isHotbarPoint(pointer.x, pointer.y)) return;
      if (this.registry.get('touchLayout') && isTouchControlPoint(pointer.x, pointer.y)) return;
      const selected = this.registry.get('buildSelection') as string | null;
      if (selected && this.registry.get('touchEnabled')) {
        if (!this.registry.get('uiOpen')) this.placeSelectedBuilding(selected, pointer);
        return;
      }
      if (pointer.rightButtonDown()) {
        this.cancelBuild();
        return;
      }
      if (pointer.leftButtonDown()) this.handleLeftClick(pointer);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.updateBuildGhost(pointer);
    });

    this.game.events.on('ui:touchAttack', this.onTouchAttack, this);
    this.game.events.on('ui:touchInteract', this.onTouchInteract, this);
    this.game.events.on('ui:cancelFishing', this.onCancelFishing, this);
    this.events.once('shutdown', () => {
      this.game.events.off('ui:touchAttack', this.onTouchAttack, this);
      this.game.events.off('ui:touchInteract', this.onTouchInteract, this);
      this.game.events.off('ui:cancelFishing', this.onCancelFishing, this);
    });
  }

  private onCancelFishing = (): void => {
    this.cancelFishing('已收竿');
  };

  private onBus(event: string, handler: (payload?: unknown) => void): void {
    this.bus.on(event, handler);
    this.busHandlers.push({ event, handler });
  }

  private bindGameEvents(): void {
    this.onBus('save:requested', () => this.persist());
    const teleport = (payload: { x: number; y: number }): void => {
      if (this.state.raid?.active) {
        this.game.events.emit('ui:banner', '野人入侵中，不能传送');
        return;
      }
      this.player.setPosition(payload.x, payload.y);
      this.cameras.main.centerOn(payload.x, payload.y);
      this.state.player.x = payload.x;
      this.state.player.y = payload.y;
      this.game.events.emit('ui:banner', '已传送');
      this.persist();
    };
    this.game.events.on('ui:teleport', teleport);
    this.events.once('shutdown', () => {
      this.game.events.off('ui:teleport', teleport);
      for (const { event, handler } of this.busHandlers) this.bus.off(event, handler);
      this.busHandlers = [];
      this.clearFishing();
    });
    this.onBus('raid:started', () => {
      spawnRaid(this.state);
      this.syncSavages();
    });
    this.onBus('raid:dawn', () => {
      const result = resolveRaidDawn(this.state);
      this.syncSavages();
      const lost = result.foodLost > 0 ? `，消耗口粮 ${result.foodLost}` : '';
      this.game.events.emit('ui:banner', `黎明：野人撤退了${lost}`);
    });
    this.onBus('time:dayChanged', () => {
      tickWeekReset(this.state, false);
      tickFarms(this.state, this.state.time.day - 1);
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
    const angle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
    this.attackAtAngle(angle);
  }

  private onTouchInteract(): void {
    if (
      this.registry.get('uiOpen') ||
      this.registry.get('buildSelection') ||
      this.channel ||
      this.state.player.dead
    ) {
      return;
    }
    if (this.fishing) {
      this.fishingTap();
      return;
    }
    this.beginInteraction();
  }

  private onTouchAttack(): void {
    if (this.registry.get('uiOpen') || this.channel || this.buildGhost) return;
    if (this.fishing) {
      this.cancelFishing('已收竿');
      return;
    }
    const targets = [
      ...this.state.savages
        .filter((savage) => savage.mode !== 'dead')
        .map((savage) => ({ x: savage.x, y: savage.y })),
      ...this.state.animals
        .filter((animal) => animal.mode !== 'dead')
        .map((animal) => ({ x: animal.x, y: animal.y })),
    ];
    this.attackAtAngle(autoAimAngle(this.player, targets, this.state.player.facing, 96));
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
    this.game.events.emit('ui:banner', placementBanner(type));
    if (type === 'flag') this.bus.emit('camp:flagPlaced', { x: building.x, y: building.y });
    checkCampUpgrade(this.state, this.bus);
    refreshTutorial(this.state, this.bus);
    this.bus.emit('save:requested', { reason: 'build' });
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
      this.campRing = this.add.graphics().setDepth(8999);
      this.buildReason = makeText(this, 0, 0, '', {
        origin: [0.5, 1],
        color: '#ff8f8f',
        shadow: true,
      })
        .setDepth(9002)
        .setVisible(false);
    }
    this.drawCampRing(type);
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

  /** Dashed camp radius ring around the flag, only while placing a building. */
  private drawCampRing(type: string): void {
    const ring = this.campRing;
    if (!ring) return;
    ring.clear();
    if (BUILDINGS[type]?.unique) return;
    const flag = this.state.buildings.find((b) => b.type === 'flag');
    if (!flag) return;
    const bounds = campRingBounds({ x: flag.x, y: flag.y }, CONFIG.campRadiusTiles);
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    const r = bounds.w / 2;
    ring.fillStyle(0xd8f7b0, 0.08).fillCircle(cx, cy, r);
    ring.lineStyle(1, 0xd8f7b0, 0.6);
    for (let i = 0; i < 48; i += 2) {
      const from = (i / 48) * Math.PI * 2;
      const to = ((i + 1) / 48) * Math.PI * 2;
      ring.beginPath();
      ring.arc(cx, cy, r, from, to);
      ring.strokePath();
    }
  }

  private clearBuildPreview(): void {
    this.buildGhost?.destroy();
    this.buildGhost = undefined;
    this.buildMarker?.destroy();
    this.buildMarker = undefined;
    this.campRing?.destroy();
    this.campRing = undefined;
    this.buildReason?.destroy();
    this.buildReason = undefined;
  }

  private cancelBuild(): void {
    if (!this.registry.get('buildSelection')) return;
    this.registry.set('buildSelection', null);
    this.clearBuildPreview();
    this.game.events.emit('ui:banner', '已取消建造');
  }

  private attackAtAngle(angle: number): void {
    const now = this.time.now;
    if (now < this.nextAttackAt) return;
    const weapon = weaponFor(this.selectedWeaponBaseId());
    const stats = deriveStats(this.state);
    const haste = now < this.hasteUntil ? 0.7 : 1;
    this.nextAttackAt = now + weapon.cooldownSec * 1000 * haste;

    const targets = [
      ...this.state.savages
        .filter((savage) => savage.mode !== 'dead')
        .map((savage) => ({ id: savage.id, x: savage.x, y: savage.y })),
      ...this.state.animals
        .filter((animal) => animal.mode !== 'dead')
        .map((animal) => ({ id: animal.id, x: animal.x, y: animal.y })),
    ];
    const hitIds = computeHitTargets(
      { x: this.player.x, y: this.player.y, angle },
      weapon.pattern,
      targets,
    );
    for (const id of hitIds) {
      const animal = this.state.animals.find((entry) => entry.id === id);
      if (animal) {
        const result = applyHitToAnimal(this.state, animal, weapon, this.rng, {
          attack: stats.attack,
          savageMul: stats.savageMul,
        });
        if (result === 'dead') {
          this.game.events.emit('ui:banner', `猎到了${ANIMALS[animal.type]?.name ?? '野兽'}`);
          playSfx(this, this.state, 'enemy_die');
          if (stats.killHaste) this.hasteUntil = now + 2000;
        }
        continue;
      }
      const savage = this.state.savages.find((entry) => entry.id === id);
      if (!savage) continue;
      const result = applyHitToSavage(savage, weapon, 0, {
        attack: stats.attack,
        stunMul: stats.stunMul,
        stunBonus: stats.stunBonus,
        savageMul: stats.savageMul,
        armorPierce: stats.armorPierce,
      });
      if (result === 'stunned') {
        this.game.events.emit('ui:banner', '野人眩晕了！靠近按 E 用藤蔓捆绑');
      } else if (result === 'dead') {
        this.game.events.emit('ui:banner', '野人倒下了');
        playSfx(this, this.state, 'enemy_die');
        if (stats.killHaste) this.hasteUntil = now + 2000;
      }
    }
    if (hitIds.length > 0) {
      playSfx(this, this.state, 'hit');
      this.damageWeapon();
    }
    this.drawSwing(angle, weapon.pattern.range);
    this.syncSavages();
    this.syncAnimals();
  }

  private selectedWeaponBaseId(): string | null {
    const equipped = this.state.equipment.weapon
      ? this.state.equipmentInstances.find((i) => i.instanceId === this.state.equipment.weapon)
      : null;
    if (equipped) return equipped.durability > 0 ? equipped.baseId : null;
    const hot = this.state.hotbar[this.state.hotbarIndex];
    return hot && WEAPONS[hot] ? hot : null;
  }

  private damageWeapon(): void {
    const equipped = this.state.equipment.weapon
      ? this.state.equipmentInstances.find((i) => i.instanceId === this.state.equipment.weapon)
      : null;
    if (equipped) {
      equipped.durability = Math.max(0, equipped.durability - 1);
      if (equipped.durability === 0) {
        this.game.events.emit('ui:banner', '武器耐久耗尽，攻击力下降');
      }
      return;
    }
    const hot = this.state.hotbar[this.state.hotbarIndex];
    if (hot && WEAPONS[hot]) damageTool(this.state, hot, 1);
  }

  private drawSwing(angle: number, range: number): void {
    const slash = this.add
      .image(this.player.x, this.player.y - 8, 'slash')
      .setRotation(angle)
      .setDepth(depthFor(this.player.y) + 2)
      .setBlendMode(Phaser.BlendModes.ADD);
    const size = Math.max(18, Math.round(range * 2 + 8));
    slash.setDisplaySize(size, size);
    this.slashes.push(slash);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 160,
      onComplete: () => {
        this.slashes = this.slashes.filter((item) => item !== slash);
        slash.destroy();
      },
    });
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);
    this.updateChunks();
    const uiOpen = Boolean(this.registry.get('uiOpen'));
    const uiPanel = (this.registry.get('uiPanel') ?? null) as UiPanel;
    const buildSelection = Boolean(this.registry.get('buildSelection'));
    if (this.channel && shouldCancelChannel(uiPanel)) this.cancelChannel();
    if (this.fishing && uiOpen) this.cancelFishing('已收竿');

    const kbDx = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
    const kbDy = Number(this.keys.S.isDown) - Number(this.keys.W.isDown);
    const touchMove = this.registry.get('touchMove') as { x: number; y: number } | undefined;
    const usingTouch = kbDx === 0 && kbDy === 0 && Boolean(touchMove);
    const dx = usingTouch ? touchMove!.x : kbDx;
    const dy = usingTouch ? touchMove!.y : kbDy;
    const rawLength = Math.hypot(dx, dy);
    const moving = rawLength > 0.05;
    const analog = usingTouch ? Math.min(1, rawLength) : 1;
    if (moving && this.channel) this.cancelChannel();
    if (moving && this.fishing) this.cancelFishing('已收竿');
    if (moving && uiOpen) this.player.setVelocity(0, 0);
    else if (this.channel || uiOpen || buildSelection) this.player.setVelocity(0, 0);
    else {
      const length = rawLength || 1;
      const input = { x: dx / length, y: dy / length };
      if (this.terrainAtWorld(this.player.x + input.x * 12, this.player.y - 4) === TILE.deepWater) {
        input.x = 0;
      }
      if (this.terrainAtWorld(this.player.x, this.player.y - 4 + input.y * 12) === TILE.deepWater) {
        input.y = 0;
      }
      const tile = this.terrainAtWorld(this.player.x, this.player.y - 4);
      const stats = deriveStats(this.state);
      const inWater = tile === TILE.shallowWater || tile === TILE.stream;
      const terrain = stats.shallowImmune && inWater
        ? stats.waveWalk
          ? 1.1
          : 1
        : terrainSpeedAt(tile);
      const sprintHeld = this.keys.SHIFT.isDown || this.registry.get('touchSprint') === true;
      const sprint = sprintHeld ? 1.5 : 1;
      const speed = 90 * terrain * stats.moveMul * sprint * analog;
      this.player.setVelocityFromInput(input, speed);
      if (dx !== 0) this.state.player.facing = dx < 0 ? 'left' : 'right';
      else if (dy !== 0) this.state.player.facing = dy < 0 ? 'up' : 'down';
      if (sprintHeld) {
        spendEnergy(this.state, 0.4 * stats.sprintEnergyMul * dt);
      }
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    tickBootWear(this.state, Math.hypot(body.deltaX(), body.deltaY()));
    const idle =
      Math.hypot(body.velocity.x, body.velocity.y) < 1 &&
      !this.channel &&
      !uiOpen &&
      !buildSelection &&
      this.time.now >= this.nextAttackAt;
    tickEnergyRegen(this.state, dt, idle);
    this.player.setDepth(depthFor(this.player.y));
    const velocity = this.player.body as Phaser.Physics.Arcade.Body;
    this.player.setWalking(Math.hypot(velocity.velocity.x, velocity.velocity.y) > 1, this.time.now);
    for (const slash of this.slashes) {
      slash.setPosition(this.player.x, this.player.y - 8);
      slash.setDepth(depthFor(this.player.y) + 2);
    }
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
      if (this.fishing) this.fishingTap();
      else if (this.channel) this.cancelChannel();
      else if (!uiOpen && !buildSelection) this.beginInteraction();
    }

    this.tickChannel(dt);
    this.updateFishing(dt);
    this.updatePrompt(uiOpen || buildSelection);
    this.syncSavages();
    this.syncLaborers();
    this.syncBuildings();
    for (const animal of this.state.animals) {
      updateAnimalAi(
        this.state,
        animal,
        dt,
        this.animalWorld(),
        uiOpen || Boolean(buildSelection),
      );
    }
    pruneAnimals(this.state, this.state.time.clockMin);
    if (
      this.time.now >= this.animalRefillAt &&
      this.state.time.clockMin >= 360 &&
      this.state.time.clockMin < 1200
    ) {
      this.animalRefillAt = this.time.now + ANIMAL_SPAWN.refillSec * 1000;
      spawnAnimals(this.state, this.animalWorld(), this.rng);
    }
    this.syncAnimals();
    if (this.time.now - this.lastNodeSync >= 250) {
      this.lastNodeSync = this.time.now;
      this.syncNodes();
      this.cullNodes();
      this.syncCrops();
    }

    const night = nightAlpha(this.state.time.clockMin);
    const isNight = night > 0.02;
    this.nightOverlay.setAlpha(night).setVisible(isNight);
    const carried = carriedLight(this.state.inventory);
    this.light.setVisible(isNight && carried !== null);
    if (carried) {
      this.light.setDisplaySize(carried.radius, carried.radius);
      this.light.setAlpha(carried.brightness);
    }
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
    if (this.state.player.hp < this.lastHp - 0.01) {
      playSfx(this, this.state, 'hurt');
      if (this.fishing) this.cancelFishing('受击，收竿了');
    }
    this.lastHp = this.state.player.hp;
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

  private enterDungeon(): void {
    if (this.state.raid?.active) {
      this.game.events.emit('ui:banner', '野人入侵中，不能进入沉船');
      return;
    }
    this.state.scene = 'dungeon';
    this.state.dungeonFloor = 1;
    this.registry.set('inDungeon', true);
    this.persist();
    this.scene.start('DungeonScene');
  }

  private updatePrompt(suppressed: boolean): void {
    if (this.fishing) {
      this.registry.set('interactPrompt', this.fishingPrompt());
      this.registry.set('interactProgress', null);
      return;
    }
    if (suppressed) {
      this.registry.set('interactPrompt', null);
      this.registry.set('interactProgress', null);
      return;
    }
    if (this.channel) {
      this.registry.set('interactProgress', this.channel.elapsed / this.channel.target.durationSec);
      return;
    }
    const target = findInteractTarget(this.state, this.player.x, this.player.y, this.interactOptions());
    this.registry.set('interactPrompt', target ? `E ${target.label}` : null);
    this.registry.set('interactProgress', null);
  }

  /** One source of truth for the HUD prompt and the actual E action. */
  private interactOptions(): {
    onWater: boolean;
    nearWater: boolean;
    hasRod: boolean;
    canFillWaterskin: boolean;
  } {
    const tile = this.terrainAtWorld(this.player.x, this.player.y - 4);
    return {
      onWater: tile === TILE.shallowWater || tile === TILE.stream,
      nearWater: Boolean(this.nearestWater(this.player.x, this.player.y)),
      hasRod: this.hasFishingRod(),
      canFillWaterskin: this.nearFreshWater() && this.hasPartialWaterskin(),
    };
  }

  private beginInteraction(): void {
    const target = findInteractTarget(this.state, this.player.x, this.player.y, this.interactOptions());
    if (!target) return;
    if (target.kind === 'fishing') {
      this.startFishingSession();
      return;
    }
    if (target.kind === 'farm') {
      this.useFarm(target.id);
      return;
    }
    if (target.kind === 'dungeon') {
      this.enterDungeon();
      return;
    }
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
        this.game.events.emit('ui:banner', '精力不足，采集变慢');
      }
    }
    if (target.kind === 'building' && this.state.player.energy < 10) {
      const building = this.state.buildings.find((b) => b.id === target.id);
      if (building?.type === 'workbench' || building?.type === 'storage') {
        this.game.events.emit('ui:banner', '精力不足，先休息一下');
        return;
      }
    }
    const nodeCost =
      target.kind === 'node'
        ? this.gatherEnergyCost(this.state.world.nodes[target.id]?.type ?? '')
        : 10;
    const slow =
      this.state.player.energy < nodeCost && (target.kind === 'node' || target.kind === 'building');
    this.channel = {
      target: slow ? { ...target, durationSec: target.durationSec * 2 } : target,
      elapsed: 0,
    };
  }

  private nearestWater(x: number, y: number, radius = 48): { x: number; y: number } | null {
    const tileX = Math.floor(x / WORLD.tile);
    const tileY = Math.floor(y / WORLD.tile);
    let best: { x: number; y: number } | null = null;
    let bestDist = radius;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const tile = this.terrainAt(tileX + dx, tileY + dy);
        if (tile !== TILE.shallowWater && tile !== TILE.stream && tile !== TILE.deepWater) continue;
        const wx = (tileX + dx) * WORLD.tile + WORLD.tile / 2;
        const wy = (tileY + dy) * WORLD.tile + WORLD.tile / 2;
        const dist = Math.hypot(wx - x, wy - y);
        if (dist <= bestDist) {
          best = { x: wx, y: wy };
          bestDist = dist;
        }
      }
    }
    return best;
  }

  private hasFishingRod(): boolean {
    if (this.state.hotbar[this.state.hotbarIndex] !== FISHING_ROD_ID) return false;
    return this.state.inventory.some(
      (item) => item.baseId === FISHING_ROD_ID && (item.durability ?? 0) > 0,
    );
  }

  private startFishingSession(): void {
    if (!this.hasFishingRod()) {
      this.game.events.emit('ui:banner', '快捷栏里需要选中鱼竿');
      return;
    }
    const spot = this.nearestWater(this.player.x, this.player.y);
    if (!spot) {
      this.game.events.emit('ui:banner', '这里离水面太远');
      return;
    }
    damageTool(this.state, FISHING_ROD_ID, 1);
    this.fishing = startFishing(this.rng);
    this.fishingSpot = spot;
    this.fishingLine = this.add.graphics().setDepth(depthFor(this.player.y) + 3);
    this.fishingBobber = this.add
      .circle(spot.x, spot.y, 3, 0xd8452f, 1)
      .setStrokeStyle(1, 0x2b2118, 1)
      .setDepth(depthFor(this.player.y) + 3);
    this.fishingMark = makeText(this, spot.x, spot.y - 8, '！', {
      size: 24,
      origin: [0.5, 1],
      color: '#ffd479',
      shadow: true,
    })
      .setDepth(depthFor(this.player.y) + 4)
      .setVisible(false);
    this.game.events.emit('ui:banner', '抛竿…');
  }

  private fishingTap(): void {
    if (!this.fishing) return;
    if (this.fishing.phase === 'bite' || this.fishing.phase === 'reeling') {
      tapFishing(this.fishing);
      playSfx(this, this.state, 'click');
      return;
    }
    this.game.events.emit('ui:banner', this.fishing.phase === 'waiting' ? '再等等…' : '收竿中');
  }

  private updateFishing(dt: number): void {
    if (!this.fishing) return;
    const before = this.fishing.phase;
    tickFishing(this.fishing, dt);
    if (before !== 'bite' && this.fishing.phase === 'bite') {
      playSfx(this, this.state, 'warning');
    }
    const spot = this.fishingSpot;
    if (this.fishingLine && spot) {
      this.fishingLine.clear();
      this.fishingLine.lineStyle(1, 0xf0e6d2, 0.75);
      this.fishingLine.lineBetween(this.player.x, this.player.y - 10, spot.x, spot.y);
    }
    if (this.fishingBobber && spot) {
      const bob = this.fishing.phase === 'waiting' ? Math.sin(this.time.now / 240) * 1.5 : 0;
      this.fishingBobber.setPosition(spot.x, spot.y + bob);
    }
    if (this.fishingMark) {
      this.fishingMark
        .setVisible(this.fishing.phase === 'bite' || this.fishing.phase === 'reeling')
        .setText(this.fishing.phase === 'reeling' ? `${this.fishing.taps}` : '！');
    }
    if (this.fishing.phase === 'done') {
      const items = rollCatch(this.rng);
      this.state.rngState = this.rng.state();
      collectLoot(this.state, items, this.player.x, this.player.y);
      const names = items
        .map((item) => `${ITEMS[item.baseId]?.name ?? item.baseId}×${item.count}`)
        .join('、');
      this.game.events.emit('ui:banner', `钓到了 ${names}`);
      playSfx(this, this.state, 'pickup');
      this.clearFishing();
      return;
    }
    if (this.fishing.phase === 'failed') {
      this.game.events.emit('ui:banner', '鱼跑了…');
      this.clearFishing();
    }
  }

  private cancelFishing(message = '已收竿'): void {
    if (!this.fishing) return;
    this.clearFishing();
    this.game.events.emit('ui:banner', message);
  }

  private clearFishing(): void {
    this.fishing = null;
    this.fishingSpot = null;
    this.fishingLine?.destroy();
    this.fishingBobber?.destroy();
    this.fishingMark?.destroy();
    this.fishingLine = undefined;
    this.fishingBobber = undefined;
    this.fishingMark = undefined;
    this.registry.set('interactProgress', null);
  }

  private fishingPrompt(): string | null {
    if (!this.fishing) return null;
    switch (this.fishing.phase) {
      case 'casting':
        return '抛竿…';
      case 'waiting':
        return '等待上钩…';
      case 'bite':
        return '提竿！';
      case 'reeling':
        return `收线 ${this.fishing.taps}/${this.fishing.needed}`;
      default:
        return null;
    }
  }

  private hasPartialWaterskin(): boolean {
    return this.state.inventory.some(
      (item) => item.baseId === 'waterskin' && (item.durability ?? 0) < 3,
    );
  }

  private nearFreshWater(): boolean {
    const spring = this.island.landmarks.find((landmark) => landmark.kind === 'spring');
    if (spring && Math.hypot(this.player.x - spring.x, this.player.y - spring.y) <= 64) {
      return true;
    }
    const tileX = Math.floor(this.player.x / WORLD.tile);
    const tileY = Math.floor(this.player.y / WORLD.tile);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (this.terrainAt(tileX + dx, tileY + dy) === TILE.stream) return true;
      }
    }
    return false;
  }

  private useFarm(buildingId: string): void {
    const building = this.state.buildings.find((entry) => entry.id === buildingId);
    if (!building || building.type !== 'farm_plot') return;
    if (!building.crop) {
      this.game.events.emit('ui:seedPicker', buildingId);
      return;
    }
    const def = cropDef(building.crop.seedId);
    if (!def) return;
    if (building.crop.growth >= def.growPoints) {
      const items = harvestCrop(this.state, buildingId, this.rng);
      if (items) {
        this.state.rngState = this.rng.state();
        collectLoot(this.state, items, this.player.x, this.player.y);
        const names = items
          .map((item) => `${ITEMS[item.baseId]?.name ?? item.baseId}×${item.count}`)
          .join('、');
        this.game.events.emit('ui:banner', `收获了 ${names}`);
        playSfx(this, this.state, 'pickup');
        this.syncCrops();
      }
      return;
    }
    if (building.crop.wateredDay === this.state.time.day) {
      this.game.events.emit('ui:banner', '今天已经浇过水了');
      return;
    }
    if (waterCrop(this.state, buildingId)) {
      this.game.events.emit('ui:banner', '浇了水，作物长得更快');
      playSfx(this, this.state, 'pickup');
    } else {
      this.game.events.emit('ui:banner', '水袋空了，去溪边装水');
    }
  }

  /** Keeps one crop overlay per farm plot in sync with its growth stage. */
  private syncCrops(): void {
    const farms = new Map(
      this.state.buildings
        .filter((building) => building.type === 'farm_plot')
        .map((building) => [building.id, building]),
    );
    for (const [id, sprite] of this.cropSprites) {
      const building = farms.get(id);
      if (!building?.crop) {
        sprite.destroy();
        this.cropSprites.delete(id);
      }
    }
    for (const building of farms.values()) {
      if (!building.crop) continue;
      const stage = cropStage(building.crop);
      const key = cropTexture(building.crop.seedId, stage);
      const x = building.x * 16 + 8;
      const y = building.y * 16 + 16;
      let sprite = this.cropSprites.get(building.id);
      if (!sprite) {
        sprite = this.add.image(x, y, key).setOrigin(0.5, 1);
        this.cropSprites.set(building.id, sprite);
      }
      if (sprite.texture.key !== key) sprite.setTexture(key);
      sprite.setPosition(x, y).setDepth(depthFor(y) + 1);
    }
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
        if (target.label === '装满水袋' && fillWaterskin(this.state)) {
          this.game.events.emit('ui:banner', '水袋装满了');
          playSfx(this, this.state, 'pickup');
        } else {
          drinkFreshWater(this.state);
          this.game.events.emit('ui:banner', '你喝了几口水，口渴 +40');
        }
        break;
      case 'farm':
        this.useFarm(target.id);
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
    spendEnergy(this.state, this.gatherEnergyCost(node.type));
    const result = gatherNode(this.state, target.id, this.rng);
    this.state.rngState = this.rng.state();
    if (result.items.length > 0) {
      playSfx(this, this.state, node.type === 'tree' ? 'chop' : node.type === 'rock' || node.type === 'clay' ? 'mine' : 'pickup');
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
    playSfx(this, this.state, 'chest');
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
