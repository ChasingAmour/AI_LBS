import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { decodeExplored } from '../core/explored';
import { WORLD } from '../core/config';
import { TILE } from '../world/terrain';
import type { IslandData } from '../world/generate';
import { LANDMARK_NAMES } from '../world/landmarks';
import { MAP_RECT, explorePercent, mapToWorld, worldToMap } from '../world/mapView';
import { CHUNK_PX } from '../world/chunks';
import { makeText } from './text';
import { COLORS, TINTS } from './theme';
import { panelRect } from './widgets/layout';
import { drawPanel } from './widgets/panel';

const CANVAS_W = 400;
const CANVAS_H = 240;

const TERRAIN_COLOR: Record<number, number> = {
  [TILE.deepWater]: 0x1c4f66,
  [TILE.shallowWater]: 0x2f7f96,
  [TILE.stream]: 0x3f9fd0,
  [TILE.sand]: 0xd9a05e,
  [TILE.grass]: 0x7ec850,
  [TILE.forest]: 0x4f8a3c,
  [TILE.rock]: 0x8a8478,
  [TILE.clay]: 0xb07a4f,
};

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Full-island parchment map with fog, trails, landmarks and a waypoint. */
export class MapPanel {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private open = false;
  private waypointGfx?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(9000).setScrollFactor(0).setVisible(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(state: GameState): void {
    if (this.open) {
      this.close();
      return;
    }
    this.open = true;
    this.root.setVisible(true);
    this.rebuild(state);
  }

  close(): void {
    this.open = false;
    this.root.setVisible(false);
    this.root.removeAll(true);
    this.waypointGfx = undefined;
  }

  private rebuild(state: GameState): void {
    this.root.removeAll(true);
    this.waypointGfx = undefined;
    const rect = panelRect('map');
    const chrome = this.scene.add.graphics();
    drawPanel(chrome, rect);
    this.root.add(chrome);

    const island = this.scene.registry.get('island') as IslandData | undefined;
    const explored = decodeExplored(state.world.explored);

    this.root.add(
      makeText(this.scene, rect.x + 16, rect.y + 8, '岛屿地图', {
        size: 24,
        color: COLORS.ink,
      }),
    );
    this.root.add(
      makeText(this.scene, rect.x + 16, rect.y + 38, '625 × 375 瓦片 · 10,000 × 6,000', {
        color: COLORS.inkSoft,
      }),
    );
    this.root.add(
      makeText(this.scene, rect.x + rect.w - 16, rect.y + 20, 'M / Esc 关闭', {
        origin: [1, 0],
        color: COLORS.inkSoft,
      }),
    );

    this.drawTerrain(island, explored);
    this.drawTrails(island, explored);
    this.drawLandmarks(state, island);
    this.drawPlayer(state);
    this.drawWaypoint(state);
    this.drawSidebar(state, island, explored);
    this.drawClickZone(state);
  }

  private drawTerrain(
    island: IslandData | undefined,
    explored: Set<string>,
  ): void {
    const key = 'island-map';
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    const texture = this.scene.textures.createCanvas(key, CANVAS_W, CANVAS_H);
    if (!texture) return;
    const ctx = texture.context;
    const parchment = 0xf0dfb8;

    if (island) {
      for (let py = 0; py < CANVAS_H; py++) {
        for (let px = 0; px < CANVAS_W; px++) {
          const worldX = (px / CANVAS_W) * WORLD.widthPx;
          const worldY = (py / CANVAS_H) * WORLD.heightPx;
          const tile = island.terrain[
            Math.floor(worldY / WORLD.tile) * WORLD.widthTiles + Math.floor(worldX / WORLD.tile)
          ];
          const base = TERRAIN_COLOR[tile] ?? TERRAIN_COLOR[TILE.grass];
          const cx = Math.floor(worldX / CHUNK_PX);
          const cy = Math.floor(worldY / CHUNK_PX);
          const seen = explored.has(`${cx},${cy}`);
          const sea = base === TERRAIN_COLOR[TILE.deepWater] || base === TERRAIN_COLOR[TILE.shallowWater];
          const color = seen ? base : mix(base, parchment, sea ? 0.22 : 0.74);
          ctx.fillStyle = css(color);
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }

    // coastline: a 1px dark brown edge wherever land meets water
    if (island) {
      const image = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
      ctx.fillStyle = 'rgba(74,47,24,0.85)';
      for (let py = 1; py < CANVAS_H - 1; py++) {
        for (let px = 1; px < CANVAS_W - 1; px++) {
          const i = (py * CANVAS_W + px) * 4;
          const left = (i - 4);
          const right = (i + 4);
          const up = (i - CANVAS_W * 4);
          const down = (i + CANVAS_W * 4);
          const isLand = image[i + 1] > image[i + 2] + 10;
          const neighborLand =
            image[left + 1] > image[left + 2] + 10 ||
            image[right + 1] > image[right + 2] + 10 ||
            image[up + 1] > image[up + 2] + 10 ||
            image[down + 1] > image[down + 2] + 10;
          if (isLand && !neighborLand) ctx.fillRect(px, py, 1, 1);
        }
      }
    }

    texture.refresh();
    this.root.add(
      this.scene.add.image(MAP_RECT.x, MAP_RECT.y, key).setOrigin(0, 0).setDisplaySize(MAP_RECT.w, MAP_RECT.h),
    );
    const border = this.scene.add.graphics();
    border.lineStyle(1, TINTS.woodDark, 1);
    border.strokeRect(MAP_RECT.x - 1, MAP_RECT.y - 1, MAP_RECT.w + 2, MAP_RECT.h + 2);
    this.root.add(border);
  }

  private drawTrails(island: IslandData | undefined, explored: Set<string>): void {
    if (!island) return;
    const g = this.scene.add.graphics();
    const lines = [...island.trails, ...island.rivers];
    lines.forEach((trail, index) => {
      const isRiver = index >= island.trails.length;
      g.lineStyle(isRiver ? 2 : 1, isRiver ? 0x3f9fd0 : 0x8a5a2b, isRiver ? 0.9 : 0.7);
      let previous: { x: number; y: number } | null = null;
      for (const point of trail.points) {
        const mapped = worldToMap(point.x, point.y, MAP_RECT);
        const cx = Math.floor(point.x / CHUNK_PX);
        const cy = Math.floor(point.y / CHUNK_PX);
        const seen = explored.has(`${cx},${cy}`);
        if (seen && previous) {
          g.beginPath();
          g.moveTo(previous.x, previous.y);
          g.lineTo(mapped.x, mapped.y);
          g.strokePath();
        }
        previous = mapped;
      }
    });
    this.root.add(g);
  }

  private drawLandmarks(state: GameState, island: IslandData | undefined): void {
    if (!island) return;
    const g = this.scene.add.graphics();
    for (const landmark of island.landmarks) {
      const point = worldToMap(landmark.x, landmark.y, MAP_RECT);
      const discovered = state.world.discovered.includes(landmark.id);
      if (discovered) {
        g.fillStyle(TINTS.gold, 1).fillCircle(point.x, point.y, 4);
        g.lineStyle(1, TINTS.woodDark, 1).strokeCircle(point.x, point.y, 4);
        this.root.add(
          makeText(this.scene, point.x, point.y - 8, LANDMARK_NAMES[landmark.kind], {
            origin: [0.5, 1],
            color: COLORS.ink,
          }).setShadow(1, 1, COLORS.parchment, 1),
        );
      } else {
        g.lineStyle(1, TINTS.wood, 0.9);
        g.strokePoints(
          [
            new Phaser.Geom.Point(point.x, point.y - 4),
            new Phaser.Geom.Point(point.x + 4, point.y),
            new Phaser.Geom.Point(point.x, point.y + 4),
            new Phaser.Geom.Point(point.x - 4, point.y),
          ],
          true,
          true,
        );
      }
    }
    this.root.add(g);
  }

  private drawPlayer(state: GameState): void {
    const point = worldToMap(state.player.x, state.player.y, MAP_RECT);
    const g = this.scene.add.graphics();
    g.lineStyle(1, 0xffffff, 0.7).strokeCircle(point.x, point.y, 7);
    g.fillStyle(0xffd479, 0.35).fillCircle(point.x, point.y, 6);
    const angle =
      state.player.facing === 'up'
        ? -Math.PI / 2
        : state.player.facing === 'down'
          ? Math.PI / 2
          : state.player.facing === 'left'
            ? Math.PI
            : 0;
    const tip = new Phaser.Geom.Point(point.x + Math.cos(angle) * 7, point.y + Math.sin(angle) * 7);
    const left = new Phaser.Geom.Point(
      point.x + Math.cos(angle + 2.5) * 4,
      point.y + Math.sin(angle + 2.5) * 4,
    );
    const right = new Phaser.Geom.Point(
      point.x + Math.cos(angle - 2.5) * 4,
      point.y + Math.sin(angle - 2.5) * 4,
    );
    g.fillStyle(0xfff3d6, 1);
    g.fillPoints([tip, left, right], true);
    g.lineStyle(1, TINTS.woodDark, 1);
    g.strokePoints([tip, left, right], true, true);
    this.root.add(g);
  }

  private drawWaypoint(state: GameState): void {
    this.waypointGfx?.destroy();
    this.waypointGfx = undefined;
    if (!state.world.waypoint) return;
    const point = worldToMap(state.world.waypoint.x, state.world.waypoint.y, MAP_RECT);
    const g = this.scene.add.graphics();
    g.lineStyle(2, TINTS.goldDark, 1);
    g.beginPath();
    g.moveTo(point.x - 4, point.y - 4);
    g.lineTo(point.x + 4, point.y + 4);
    g.moveTo(point.x + 4, point.y - 4);
    g.lineTo(point.x - 4, point.y + 4);
    g.strokePath();
    this.waypointGfx = g;
    this.root.add(g);
  }

  private drawSidebar(state: GameState, island: IslandData | undefined, explored: Set<string>): void {
    const x = 456;
    const percent = explorePercent(explored);
    const total = island?.landmarks.length ?? 7;
    const discovered = state.world.discovered.length;

    this.root.add(makeText(this.scene, x, 76, '探索度', { color: COLORS.inkSoft }));
    this.root.add(makeText(this.scene, x, 92, `${percent}%`, { size: 24, color: COLORS.ink }));
    this.root.add(makeText(this.scene, x, 126, `地标 ${discovered}/${total}`, { color: COLORS.ink }));
    this.root.add(makeText(this.scene, x, 144, '区域 5', { color: COLORS.ink }));

    const legend: Array<[number, string]> = [
      [0x2f7f96, '海洋'],
      [0x7ec850, '陆地'],
      [0xf0dfb8, '迷雾'],
      [0xffd479, '路标'],
    ];
    legend.forEach(([color, label], index) => {
      const y = 176 + index * 20;
      const g = this.scene.add.graphics();
      g.fillStyle(color, 1).fillRect(x, y, 12, 12);
      g.lineStyle(1, TINTS.woodDark, 1).strokeRect(x, y, 12, 12);
      this.root.add(g);
      this.root.add(makeText(this.scene, x + 18, y, label, { color: COLORS.ink }));
    });

    this.root.add(
      makeText(this.scene, x, 268, '点击地图设置路标\n右键清除路标', {
        color: COLORS.inkSoft,
      }).setLineSpacing(2),
    );
  }

  private drawClickZone(state: GameState): void {
    const zone = this.scene.add
      .zone(MAP_RECT.x + MAP_RECT.w / 2, MAP_RECT.y + MAP_RECT.h / 2, MAP_RECT.w, MAP_RECT.h)
      .setInteractive();
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        state.world.waypoint = null;
      } else {
        const point = mapToWorld(pointer.x, pointer.y, MAP_RECT);
        state.world.waypoint = {
          x: Phaser.Math.Clamp(point.x, 0, WORLD.widthPx),
          y: Phaser.Math.Clamp(point.y, 0, WORLD.heightPx),
        };
      }
      this.drawWaypoint(state);
    });
    this.root.add(zone);
  }
}
