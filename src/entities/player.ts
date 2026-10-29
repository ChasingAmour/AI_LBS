import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { WEAPONS } from '../data/weapons';
import { walkFrame, type PlayerFrame } from './playerFrames';

/** Pixel hero from Tiny Farm; 16×16 frame, feet-anchored, two-frame walk cycle. */
export const PLAYER_TEXTURE = 'player-idle';
export const PLAYER_FRAME = 109;

type GearSlot = 'weapon' | 'armor' | 'boots';

export class PlayerEntity extends Phaser.Physics.Arcade.Sprite {
  private currentFrame: PlayerFrame = 'player-idle';
  private readonly gameState?: GameState;
  private readonly armorOverlay: Phaser.GameObjects.Image;
  private readonly bootsOverlay: Phaser.GameObjects.Image;
  private readonly weaponOverlay: Phaser.GameObjects.Image;
  private armorId: string | null = null;
  private bootsId: string | null = null;
  private weaponId: string | null = null;
  private swingUntil = 0;
  private swingAngle = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, state?: GameState) {
    super(scene, x, y, PLAYER_TEXTURE);
    this.gameState = state;
    scene.add.existing(this);
    scene.sys.updateList.add(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(3, 8);

    this.armorOverlay = scene.add
      .image(x, y, 'gear-armor-vine_armor')
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.bootsOverlay = scene.add
      .image(x, y, 'gear-boots-straw_shoes')
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.weaponOverlay = scene.add
      .image(x, y, 'icon-club')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(13, 13)
      .setVisible(false);
  }

  setVelocityFromInput(input: { x: number; y: number }, speed: number): void {
    if (input.x === 0 && input.y === 0) {
      this.setVelocity(0, 0);
      return;
    }
    this.setVelocity(input.x * speed, input.y * speed);
    if (input.x !== 0) this.setFlipX(input.x < 0);
  }

  /** Swaps idle/walk textures at 8 fps while the body is moving. */
  setWalking(moving: boolean, elapsedMs: number): void {
    const frame = walkFrame(elapsedMs, moving);
    if (frame === this.currentFrame) return;
    this.currentFrame = frame;
    this.setTexture(frame);
  }

  /** Rotates the held weapon toward the attack direction for a short swing. */
  swingWeapon(angle: number): void {
    this.swingAngle = angle;
    this.swingUntil = this.scene.time.now + 180;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.syncGear(time);
  }

  private syncGear(time: number): void {
    const armor = this.equippedBase('armor');
    const boots = this.equippedBase('boots');
    const weapon = this.equippedBase('weapon');

    if (armor !== this.armorId) {
      this.armorId = armor;
      if (armor) {
        this.armorOverlay.setTexture(`gear-armor-${armor}`).setVisible(true);
      } else {
        this.armorOverlay.setVisible(false);
      }
    }
    if (boots !== this.bootsId) {
      this.bootsId = boots;
      if (boots) {
        this.bootsOverlay.setTexture(`gear-boots-${boots}`).setVisible(true);
      } else {
        this.bootsOverlay.setVisible(false);
      }
    }
    if (weapon !== this.weaponId) {
      this.weaponId = weapon;
      if (weapon) {
        this.weaponOverlay.setTexture(`icon-${weapon}`).setVisible(true);
      } else {
        this.weaponOverlay.setVisible(false);
      }
    }

    const depth = this.depth;
    this.armorOverlay
      .setPosition(this.x, this.y)
      .setDepth(depth + 1)
      .setFlipX(this.flipX);
    this.bootsOverlay
      .setPosition(this.x, this.y)
      .setDepth(depth + 1)
      .setFlipX(this.flipX);

    if (!this.weaponOverlay.visible) return;
    this.weaponOverlay.setDepth(depth + 2).setFlipX(this.flipX);
    if (time < this.swingUntil) {
      const dx = Math.cos(this.swingAngle) * 7;
      const dy = Math.sin(this.swingAngle) * 7;
      this.weaponOverlay
        .setPosition(this.x + dx, this.y - 8 + dy)
        .setRotation(this.swingAngle + Math.PI / 2);
      return;
    }
    this.weaponOverlay
      .setPosition(this.x + (this.flipX ? -8 : 8), this.y - 10)
      .setRotation(0);
  }

  private equippedBase(slot: GearSlot): string | null {
    const id = this.gameState?.equipment[slot];
    if (id) {
      const instance = this.gameState?.equipmentInstances.find((item) => item.instanceId === id);
      if (instance) {
        if (slot === 'weapon' && instance.durability <= 0) return null;
        return instance.baseId;
      }
    }
    if (slot === 'weapon' && this.gameState) {
      const hot = this.gameState.hotbar[this.gameState.hotbarIndex];
      if (hot && WEAPONS[hot]) return hot;
    }
    return null;
  }

  override destroy(fromScene?: boolean): void {
    this.armorOverlay.destroy();
    this.bootsOverlay.destroy();
    this.weaponOverlay.destroy();
    super.destroy(fromScene);
  }
}
