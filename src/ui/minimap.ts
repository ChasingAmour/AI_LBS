import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { decodeExplored } from '../core/explored';
import type { IslandData } from '../world/generate';
import { worldToMap, type MapRect } from '../world/mapView';
import { TINTS } from './theme';
import { renderIslandCanvas } from './islandCanvas';

const FRAME = { x: 496, y: 42, w: 136, h: 104 };
const IMAGE = { x: 500, y: 46, w: 128, h: 96 };
const MINI_RECT: MapRect = { x: IMAGE.x, y: IMAGE.y, w: IMAGE.w, h: IMAGE.h };

/** Always-on HUD minimap: fogged island, player dot, waypoint, landmarks. */
export class Minimap {
  private scene: Phaser.Scene;
  private image?: Phaser.GameObjects.Image;
  private overlay: Phaser.GameObjects.Graphics;
  private explored = new Set<string>();
  private lastRaw: string | null = null;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private shown = true;

  constructor(scene: Phaser.Scene, onOpen: () => void) {
    this.scene = scene;
    const frame = scene.add.graphics().setDepth(8100).setScrollFactor(0);
    frame.fillStyle(0x1b120b, 0.92).fillRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
    frame.lineStyle(2, TINTS.woodDark, 1).strokeRect(FRAME.x + 1, FRAME.y + 1, FRAME.w - 2, FRAME.h - 2);
    const border = scene.add.graphics().setDepth(8101).setScrollFactor(0);
    border.lineStyle(1, TINTS.goldDark, 0.9);
    border.strokeRect(FRAME.x + 4, FRAME.y + 4, FRAME.w - 8, FRAME.h - 8);
    this.overlay = scene.add.graphics().setDepth(8102).setScrollFactor(0);

    const zone = scene.add
      .zone(FRAME.x + FRAME.w / 2, FRAME.y + FRAME.h / 2, FRAME.w, FRAME.h)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', onOpen);
    this.objects.push(frame, border, this.overlay, zone);
  }

  setVisible(visible: boolean): void {
    if (visible === this.shown) return;
    this.shown = visible;
    for (const object of this.objects) {
      if (!object.active) continue;
      (object as unknown as { setVisible: (v: boolean) => void }).setVisible(visible);
    }
  }

  update(state: GameState): void {
    if (!this.shown) return;
    const island = this.scene.registry.get('island') as IslandData | undefined;
    if (state.world.explored !== this.lastRaw) {
      this.lastRaw = state.world.explored;
      this.explored = decodeExplored(state.world.explored);
      renderIslandCanvas(this.scene, 'minimap', IMAGE.w, IMAGE.h, island, this.explored);
      this.image?.destroy();
      this.image = this.scene.add
        .image(IMAGE.x, IMAGE.y, 'minimap')
        .setOrigin(0, 0)
        .setDisplaySize(IMAGE.w, IMAGE.h)
        .setDepth(8100)
        .setScrollFactor(0);
      this.objects.push(this.image);
    }
    this.drawOverlay(state, island);
  }

  private drawOverlay(state: GameState, island: IslandData | undefined): void {
    const g = this.overlay;
    g.clear();

    if (island) {
      g.fillStyle(TINTS.gold, 1);
      for (const landmark of island.landmarks) {
        if (!state.world.discovered.includes(landmark.id)) continue;
        const p = worldToMap(landmark.x, landmark.y, MINI_RECT);
        g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
      }
    }

    const flag = state.buildings.find((b) => b.type === 'flag');
    if (flag) {
      const p = worldToMap(flag.x * 16 + 8, flag.y * 16 + 8, MINI_RECT);
      g.fillStyle(0xb03a2e, 1).fillRect(Math.round(p.x) - 1, Math.round(p.y) - 2, 3, 3);
    }

    if (state.world.waypoint) {
      const p = worldToMap(state.world.waypoint.x, state.world.waypoint.y, MINI_RECT);
      g.lineStyle(1, TINTS.gold, 1);
      g.beginPath();
      g.moveTo(p.x - 2, p.y - 2);
      g.lineTo(p.x + 2, p.y + 2);
      g.moveTo(p.x + 2, p.y - 2);
      g.lineTo(p.x - 2, p.y + 2);
      g.strokePath();
    }

    const player = worldToMap(state.player.x, state.player.y, MINI_RECT);
    g.fillStyle(0x2b2118, 1).fillCircle(player.x, player.y, 3.5);
    g.fillStyle(0xfff3d6, 1).fillCircle(player.x, player.y, 2.5);
    g.fillStyle(TINTS.gold, 1).fillCircle(player.x, player.y, 1.5);
  }
}
