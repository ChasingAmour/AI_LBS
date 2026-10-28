import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { EventBus } from '../core/eventBus';
import { createRng } from '../core/rng';
import { PlayerEntity } from '../entities/player';
import { ensurePlayerFrames } from '../entities/playerFrames';
import {
  applyPoison,
  applySlow,
  createDungeonEnemy,
  damageDungeonEnemy,
  enemyAttack,
  hazardEffect,
  tickDungeonEnemy,
  tickPoison,
  type DungeonEnemy,
} from '../entities/dungeonEnemy';
import { depthFor } from '../world/depthSort';
import {
  DUNGEON_TILE,
  generateDungeonFloor,
  isDungeonWalkable,
  type DungeonChest,
  type DungeonFloor,
  type DungeonHazard,
} from '../world/dungeonGen';
import { rollChestLoot } from '../systems/lootSystem';
import { addItem } from '../systems/inventorySystem';
import { EQUIPMENT } from '../data/equipment';
import { deriveStats, damageEquipped, tickBootWear } from '../systems/statsSystem';
import { applyDamage, tickNeeds } from '../systems/needsSystem';
import { tickTorchFuel } from '../systems/resourceSystem';
import { advanceTime } from '../systems/timeSystem';
import { tickLabor, settleLaborRations } from '../systems/laborSystem';
import { isFloorCleared, markFloorCleared, tickWeekReset } from '../systems/dungeonReset';
import { resolveRaidDawn } from '../systems/raidSystem';
import { saveGame } from '../systems/saveSystem';
import { playSfx } from '../systems/audio';

const STEP = 1 / 60;
const TILE = 16;

interface EnemyView {
  state: DungeonEnemy;
  sprite: Phaser.GameObjects.Image;
}

export class DungeonScene extends Phaser.Scene {
  private state!: GameState;
  private floorData!: DungeonFloor;
  private player!: PlayerEntity;
  private enemies: EnemyView[] = [];
  private hazardFlags = new Map<string, { triggered: boolean; at: number }>();
  private chestSprites = new Map<string, Phaser.GameObjects.Image>();
  private channel: { chest: DungeonChest; elapsed: number } | null = null;
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private accumulator = 0;
  private darkness!: Phaser.GameObjects.Rectangle;
  private light!: Phaser.GameObjects.Image;
  private closed = false;
  private beam?: Phaser.GameObjects.Rectangle;
  private bus = new EventBus();
  private lastHp = 100;

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    this.state = this.registry.get('state') as GameState;
    const level = (this.state.dungeonFloor ?? 1) as 1 | 2 | 3;
    this.state.scene = 'dungeon';
    this.state.dungeonFloor = level;
    this.registry.set('inDungeon', true);
    this.floorData = generateDungeonFloor(this.state.world.seed, level);

    ensurePlayerFrames(this);
    this.makeEnemyTextures();
    this.bakeFloor();

    const start = this.tileCenter(this.floorData.entry.x, this.floorData.entry.y);
    this.player = new PlayerEntity(this, start.x, start.y);
    this.player.setDepth(9003);

    this.physics.world.setBounds(0, 0, this.floorData.width * TILE, this.floorData.height * TILE);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.floorData.width * TILE, this.floorData.height * TILE);
    camera.setZoom(2);
    camera.centerOn(start.x, start.y);
    camera.startFollow(this.player, true, 0.18, 0.18);
    camera.preRender();

    this.spawnEnemies();
    this.spawnChests();
    this.createLighting();
    this.checkFloorCleared();

    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as unknown as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard?.on('keydown-E', () => this.interact());
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.attack(pointer);
    });

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this.bindTimeEvents();
    this.game.events.emit('ui:banner', `沉船第 ${level} 层`);
    this.save();
  }

  /** Time, needs, labour and the Friday raid abstraction keep running inside. */
  private bindTimeEvents(): void {
    this.bus.on('raid:warning', () => {
      this.game.events.emit('ui:banner', '周五 17:00：野人将在 18:00 来袭！');
    });
    this.bus.on('raid:started', () => {
      this.state.raid = { active: true, day: this.state.time.day };
      playSfx(this, this.state, 'warning');
      this.game.events.emit('ui:banner', '野人入侵了营地！你在沉船里，黎明结算');
    });
    this.bus.on('raid:dawn', () => {
      const result = resolveRaidDawn(this.state);
      const lost = result.foodLost > 0 ? `，消耗口粮 ${result.foodLost}` : '';
      this.game.events.emit('ui:banner', `黎明：野人撤退了${lost}`);
      this.save();
    });
    this.bus.on('time:dayChanged', () => {
      tickWeekReset(this.state, true);
      settleLaborRations(this.state);
      this.save();
    });
  }

  private tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE - 2 };
  }

  private tileAtWorld(x: number, y: number): number {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.floorData.width || ty >= this.floorData.height) {
      return DUNGEON_TILE.void;
    }
    return this.floorData.tiles[ty * this.floorData.width + tx];
  }

  private bakeFloor(): void {
    const key = 'dungeon-floor';
    if (this.textures.exists(key)) this.textures.remove(key);
    const width = this.floorData.width * TILE;
    const height = this.floorData.height * TILE;
    const texture = this.textures.createCanvas(key, width, height);
    if (!texture) return;
    const ctx = texture.context;
    ctx.imageSmoothingEnabled = false;
    const town = this.textures.get('town').getSourceImage() as CanvasImageSource;
    const draw = (frame: number, x: number, y: number) => {
      const offset = this.textures.get('town').get(frame);
      ctx.drawImage(town, offset.cutX, offset.cutY, TILE, TILE, x, y, TILE, TILE);
    };

    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, width, height);
    for (let ty = 0; ty < this.floorData.height; ty++) {
      for (let tx = 0; tx < this.floorData.width; tx++) {
        const tile = this.floorData.tiles[ty * this.floorData.width + tx];
        const x = tx * TILE;
        const y = ty * TILE;
        if (tile === DUNGEON_TILE.void) continue;
        if (tile === DUNGEON_TILE.wall) {
          draw(96, x, y);
          ctx.fillStyle = 'rgba(12,20,30,0.74)';
          ctx.fillRect(x, y, TILE, TILE);
          continue;
        }
        draw(60, x, y);
        ctx.fillStyle = 'rgba(138,90,43,0.45)';
        ctx.fillRect(x, y, TILE, TILE);
        if (tile === DUNGEON_TILE.hazard) {
          const hazard = this.floorData.hazards.find((item) => item.x === tx && item.y === ty);
          ctx.fillStyle =
            hazard?.kind === 'flooded'
              ? 'rgba(40,120,160,0.45)'
              : hazard?.kind === 'collapse'
                ? 'rgba(160,40,30,0.4)'
                : 'rgba(120,80,30,0.45)';
          ctx.fillRect(x, y, TILE, TILE);
        }
        if (tile === DUNGEON_TILE.stairs) {
          ctx.fillStyle = '#3a2412';
          ctx.fillRect(x + 4, y + 2, 8, 12);
          ctx.fillStyle = '#d8b25a';
          for (let r = 0; r < 4; r++) ctx.fillRect(x + 4, y + 4 + r * 3, 8, 1);
        }
        if (tile === DUNGEON_TILE.exit) {
          ctx.fillStyle = '#241a10';
          ctx.fillRect(x + 2, y + 2, 12, 12);
          ctx.fillStyle = '#8a6a3c';
          ctx.fillRect(x + 3, y + 3, 10, 2);
          ctx.fillRect(x + 3, y + 11, 10, 2);
          ctx.fillStyle = '#c9c2b0';
          ctx.fillRect(x + 7, y + 6, 2, 4);
          ctx.fillRect(x + 5, y + 5, 6, 1);
        }
      }
    }
    texture.refresh();
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(0);
  }

  private makeEnemyTextures(): void {
    if (this.textures.exists('dungeon-crab')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // crab
    g.fillStyle(0x9a3b2a).fillRect(2, 5, 10, 6);
    g.fillStyle(0xc94f3a).fillRect(3, 4, 8, 3);
    g.fillStyle(0x2b2118).fillRect(1, 4, 2, 2).fillRect(11, 4, 2, 2);
    g.generateTexture('dungeon-crab', 14, 12);
    g.clear();
    // hermit
    g.fillStyle(0x8a5a2b).fillCircle(7, 6, 5);
    g.fillStyle(0xc9a24a).fillCircle(5, 5, 2);
    g.fillStyle(0x2b2118).fillRect(9, 3, 2, 2).fillRect(9, 7, 2, 2);
    g.generateTexture('dungeon-hermit', 14, 12);
    g.clear();
    // snake
    g.fillStyle(0x3f8a4f).fillRect(2, 6, 10, 3);
    g.fillStyle(0x5fbf5f).fillRect(4, 4, 6, 2);
    g.fillStyle(0x2b2118).fillRect(11, 5, 2, 2);
    g.generateTexture('dungeon-snake', 14, 12);
    g.destroy();
  }

  private spawnEnemies(): void {
    if (isFloorCleared(this.state, this.floorData.floor)) return;
    this.floorData.enemies.forEach((spawn, index) => {
      const enemy = createDungeonEnemy(spawn.type, spawn.x * TILE + 8, spawn.y * TILE + 8, `d${this.floorData.floor}_e${index}`);
      const sprite = this.add
        .image(enemy.x, enemy.y, `dungeon-${enemy.type}`)
        .setOrigin(0.5, 1)
        .setDepth(9002);
      this.enemies.push({ state: enemy, sprite });
    });
  }

  private spawnChests(): void {
    const opened = new Set(this.state.dungeon.openedChestsThisWeek);
    for (const chest of this.floorData.chests) {
      const point = this.tileCenter(chest.x, chest.y);
      const sprite = this.add
        .image(point.x, point.y, 'dungeon', 101)
        .setOrigin(0.5, 1)
        .setDepth(9002)
        .setAlpha(opened.has(chest.id) ? 0.35 : 1);
      this.chestSprites.set(chest.id, sprite);
    }
  }

  private createLighting(): void {
    if (!this.textures.exists('light')) {
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
    const cam = this.cameras.main;
    this.darkness = this.add
      .rectangle(0, 0, cam.width, cam.height, 0x04070d, 0.86)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(9000);
    this.light = this.add
      .image(this.player.x, this.player.y - 8, 'light')
      .setDisplaySize(120, 120)
      .setDepth(9001)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.player.setDepth(9003);

    const stair = this.tileCenter(this.floorData.stairs.x, this.floorData.stairs.y);
    this.add
      .image(stair.x, stair.y, 'dungeon', 101)
      .setTint(0xffd479)
      .setOrigin(0.5, 1)
      .setDepth(9002)
      .setScale(0.35);
    this.updateExitMarker();
  }

  /** Cleared floors get a light beam over the stairs so the exit is obvious. */
  private updateExitMarker(): void {
    const cleared = isFloorCleared(this.state, this.floorData.floor);
    const stair = this.tileCenter(this.floorData.stairs.x, this.floorData.stairs.y);
    if (cleared && !this.beam) {
      this.beam = this.add
        .rectangle(stair.x, stair.y - 42, 10, 84, 0xffe6a0, 0.32)
        .setDepth(9001)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: this.beam,
        alpha: { from: 0.18, to: 0.45 },
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
    }
    if (!cleared && this.beam) {
      this.beam.destroy();
      this.beam = undefined;
    }
  }

  /** Marks the floor cleared once every enemy is down. */
  private checkFloorCleared(): void {
    if (isFloorCleared(this.state, this.floorData.floor)) return;
    if (this.enemies.some((view) => !view.state.dead)) return;
    markFloorCleared(this.state, this.floorData.floor);
    this.updateExitMarker();
    this.game.events.emit('ui:banner', '本层已清空，出口已标记');
    this.save();
  }

  private hasTorch(): boolean {
    return this.state.inventory.some((item) => item.baseId === 'torch' && (item.durability ?? 0) > 0);
  }

  update(_time: number, delta: number): void {
    if (this.closed) return;
    const dt = Math.min(delta / 1000, 0.1);

    if (this.state.player.dead) {
      this.closed = true;
      this.scene.pause();
      this.scene.pause('UIScene');
      this.scene.launch('DeathScene');
      return;
    }

    const stats = deriveStats(this.state);
    const hazard = this.hazardAt(this.player.x, this.player.y);
    const speedBase = 80 * stats.moveMul;
    const speed = hazard && hazardEffect(hazard).slow && !stats.shallowImmune ? speedBase * 0.5 : speedBase;

    if (this.channel) {
      this.player.setVelocity(0, 0);
      this.channel.elapsed += dt;
      if (this.channel.elapsed >= 1.5) {
        const chest = this.channel.chest;
        this.channel = null;
        this.openChest(chest);
      }
    } else {
      this.move(dt, speed);
    }

    if (hazard) this.applyHazard(hazard, dt);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const moved = Math.hypot(body.deltaX(), body.deltaY());
    tickBootWear(this.state, moved);
    this.player.setWalking(moved > 0.5, this.time.now);
    this.player.setDepth(9003);

    for (const view of this.enemies) {
      const enemy = view.state;
      if (enemy.dead) continue;
      tickDungeonEnemy(enemy, { x: this.player.x, y: this.player.y }, dt, this.time.now / 1000);
      tickPoison(enemy, this.time.now / 1000, dt);
      view.sprite.setPosition(enemy.x, enemy.y).setDepth(depthFor(enemy.y));
      view.sprite.setAlpha(enemy.dead ? 0.25 : 1);
      const hit = enemyAttack(enemy, Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y));
      if (hit > 0) applyDamage(this.state, hit);
    }

    this.darkness.setVisible(true);
    this.light.setPosition(this.player.x, this.player.y - 8);
    this.light.setDisplaySize(this.hasTorch() ? 120 : 40, this.hasTorch() ? 120 : 40);
    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;

    tickTorchFuel(this.state, dt);
    tickNeeds(this.state, dt);
    if (this.state.player.hp < this.lastHp - 0.01) playSfx(this, this.state, 'hurt');
    this.lastHp = this.state.player.hp;
    advanceTime(this.state, dt, this.bus);
    tickLabor(this.state, dt);

    this.accumulator += dt;
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
    }
  }

  private move(dt: number, speed: number): void {
    void dt;
    const dx = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
    const dy = Number(this.keys.S.isDown) - Number(this.keys.W.isDown);
    if (dx === 0 && dy === 0) {
      this.player.setVelocity(0, 0);
      return;
    }
    const length = Math.hypot(dx, dy) || 1;
    const input = { x: dx / length, y: dy / length };
    if (!isDungeonWalkable(this.tileAtWorld(this.player.x + input.x * 10, this.player.y - 4))) input.x = 0;
    if (!isDungeonWalkable(this.tileAtWorld(this.player.x, this.player.y - 4 + input.y * 10))) input.y = 0;
    this.player.setVelocityFromInput(input, speed);
  }

  private hazardAt(x: number, y: number): DungeonHazard | null {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return this.floorData.hazards.find((hazard) => hazard.x === tx && hazard.y === ty) ?? null;
  }

  private applyHazard(hazard: DungeonHazard, dt: number): void {
    const key = `${hazard.x},${hazard.y}`;
    const effect = hazardEffect(hazard);
    if (effect.energyPerSec > 0) {
      this.state.player.energy = Math.max(0, this.state.player.energy - effect.energyPerSec * dt);
      return;
    }
    const flag = this.hazardFlags.get(key);
    if (!flag) {
      this.hazardFlags.set(key, { triggered: false, at: this.time.now });
      if (hazard.kind === 'collapse') this.game.events.emit('ui:banner', '头顶传来木板断裂声…');
    }
    const state = this.hazardFlags.get(key)!;
    if (state.triggered) return;
    if (hazard.kind === 'loose') {
      state.triggered = true;
      applyDamage(this.state, 15);
      this.game.events.emit('ui:banner', '踩空了！受到 15 点伤害');
    } else if (hazard.kind === 'collapse' && this.time.now - state.at >= 1000) {
      state.triggered = true;
      applyDamage(this.state, 20);
      this.game.events.emit('ui:banner', '塌落的木板砸中了你！');
    }
  }

  private attack(pointer: Phaser.Input.Pointer): void {
    if (this.channel) return;
    const angle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
    const slash = this.add
      .image(this.player.x, this.player.y - 8, 'slash')
      .setRotation(angle)
      .setDisplaySize(72, 72)
      .setDepth(depthFor(this.player.y) + 2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: slash, alpha: 0, duration: 160, onComplete: () => slash.destroy() });

    const stats = deriveStats(this.state);
    const weapon = this.selectedWeapon();
    const range = weapon.range;
    const now = this.time.now / 1000;
    for (const view of this.enemies) {
      const enemy = view.state;
      if (enemy.dead) continue;
      const distance = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (distance > range) continue;
      const targetAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
      const diff = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
      if (Math.abs(diff) > Math.PI / 2) continue;
      const result = damageDungeonEnemy(enemy, weapon.damage + stats.attack, now, stats.armorPierce);
      if (stats.slowOnHit) applySlow(enemy, now);
      if (stats.poisonStacks > 0) applyPoison(enemy, now, stats.poisonStacks);
      playSfx(this, this.state, 'hit');
      if (result === 'dead') {
        playSfx(this, this.state, 'enemy_die');
        this.game.events.emit('ui:banner', '敌人倒下了');
      }
    }
    this.checkFloorCleared();
    damageEquipped(this.state, 'weapon', 1);
  }

  private selectedWeapon(): { damage: number; range: number } {
    const id = this.state.equipment.weapon;
    const instance = id ? this.state.equipmentInstances.find((item) => item.instanceId === id) : null;
    const base = instance && instance.durability > 0 ? instance.baseId : null;
    const map: Record<string, { damage: number; range: number }> = {
      club: { damage: 8, range: 36 },
      spear: { damage: 14, range: 52 },
      coral_dagger: { damage: 8, range: 26 },
      captain_cutlass: { damage: 16, range: 42 },
      sea_snake_spear: { damage: 18, range: 60 },
      anchor_hammer: { damage: 12, range: 40 },
    };
    return (base && map[base]) || { damage: 4, range: 24 };
  }

  private interact(): void {
    if (this.channel) return;
    const px = this.player.x;
    const py = this.player.y;

    const entry = this.tileCenter(this.floorData.entry.x, this.floorData.entry.y);
    if (Math.hypot(entry.x - px, entry.y - py) <= 28) {
      if (this.floorData.floor === 1) this.exitDungeon();
      else this.previousFloor();
      return;
    }

    const stair = this.tileCenter(this.floorData.stairs.x, this.floorData.stairs.y);
    if (Math.hypot(stair.x - px, stair.y - py) <= 28) {
      this.nextFloor();
      return;
    }

    const chest = this.floorData.chests.find((item) => {
      const point = this.tileCenter(item.x, item.y);
      return Math.hypot(point.x - px, point.y - py) <= 28;
    });
    if (chest) {
      if (this.state.dungeon.openedChestsThisWeek.includes(chest.id)) {
        this.game.events.emit('ui:banner', '这个箱子本周已经开过了');
        return;
      }
      this.channel = { chest, elapsed: 0 };
      return;
    }
  }

  /** Stairs up: back to the previous floor, which keeps its cleared state. */
  private previousFloor(): void {
    if (this.floorData.floor <= 1) {
      this.exitDungeon();
      return;
    }
    this.state.dungeonFloor = (this.floorData.floor - 1) as 1 | 2 | 3;
    this.save();
    this.scene.restart();
  }

  private openChest(chest: DungeonChest): void {
    const loot = rollChestLoot(this.state, chest.final ? 'final' : 'normal', createRng(this.state.lootSeed + this.state.lootRolls));
    this.state.equipmentInstances.push(loot.equipment);
    for (const material of loot.materials) addItem(this.state, material.baseId, material.count);
    this.state.dungeon.openedChestsThisWeek.push(chest.id);
    const sprite = this.chestSprites.get(chest.id);
    sprite?.setAlpha(0.35);
    this.game.events.emit(
      'ui:banner',
      `获得${loot.equipment.rarity === 'legendary' ? '传说' : ''}装备：${EQUIPMENT[loot.equipment.baseId]?.name ?? loot.equipment.baseId}（背包中点击穿戴）`,
    );
    playSfx(this, this.state, 'chest');
    if (loot.equipment.rarity === 'legendary') playSfx(this, this.state, 'legendary');
    this.game.events.emit('ui:panel', 'inventory');
    this.save();
  }

  private nextFloor(): void {
    if (this.floorData.floor >= 3) {
      this.exitDungeon();
      return;
    }
    this.state.dungeonFloor = (this.floorData.floor + 1) as 1 | 2 | 3;
    this.state.dungeon.clearedThisWeek = this.floorData.floor === 2;
    this.save();
    this.scene.restart();
  }

  private exitDungeon(): void {
    if (this.floorData.floor === 3) this.state.dungeon.clearedThisWeek = true;
    this.state.scene = 'island';
    this.state.dungeonFloor = null;
    this.registry.set('inDungeon', false);
    if (this.state.dungeon.pendingReset) {
      this.state.dungeon.openedChestsThisWeek = [];
      this.state.dungeon.clearedThisWeek = false;
      this.state.dungeon.clearedFloors = [];
      this.state.dungeon.pendingReset = false;
    }
    this.state.player.x = this.state.world.wreckSpawn.x;
    this.state.player.y = this.state.world.wreckSpawn.y;
    this.save();
    this.scene.start('IslandScene');
  }

  private save(): void {
    try {
      saveGame(this.state);
    } catch {
      // private mode: keep playing
    }
  }
}
