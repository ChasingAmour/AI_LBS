import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { decodeExplored } from '../core/explored';
import { WORLD } from '../core/config';
import type { IslandData } from '../world/generate';
import { LANDMARK_NAMES } from '../world/landmarks';
import {
  MAP_RECT,
  MAX_MAP_ZOOM,
  MIN_MAP_ZOOM,
  clampMapView,
  defaultMapView,
  explorePercent,
  mapToWorld,
  panMap,
  worldToMap,
  zoomMapAt,
  type MapView,
} from '../world/mapView';
import { CHUNK_PX } from '../world/chunks';
import { makeText } from './text';
import { COLORS, TINTS } from './theme';
import { panelRect } from './widgets/layout';
import { drawPanel } from './widgets/panel';
import { renderIslandCanvas } from './islandCanvas';

const CANVAS_W = 400;
const CANVAS_H = 240;
const DRAG_THRESHOLD = 4;

/** Full-island parchment map with fog, trails, landmarks, zoom and panning. */
export class MapPanel {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private open = false;
  private view: MapView = defaultMapView();
  private waypointGfx?: Phaser.GameObjects.Graphics;
  /** Everything painted inside the map frame, so the mask can clip it. */
  private mapLayer?: Phaser.GameObjects.Container;
  private maskShape?: Phaser.GameObjects.Graphics;
  /** Cached exploration payload: avoids re-baking 234k tiles on every pan. */
  private renderedExplored: string | null = null;
  private drag: { startX: number; startY: number; lastX: number; lastY: number; moved: boolean } | null =
    null;
  /** A drag just ended, so the release must not drop a waypoint. */
  private suppressClick = false;
  /** Discovered-landmark click: fast travel. */
  onTeleport?: (x: number, y: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(9000).setScrollFactor(0).setVisible(false);
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    scene.input.on('pointerup', () => {
      this.drag = null;
      this.scene.time.delayedCall(250, () => {
        this.suppressClick = false;
      });
    });
    scene.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
        this.onWheel(pointer, dy);
      },
    );
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Dev/QA hooks and the zoom badge both use this. */
  setZoom(state: GameState, zoom: number): void {
    if (!this.open) return;
    const rect = panelRect('map');
    this.view = zoomMapAt(
      this.open
        ? { x: this.view.centerX, y: this.view.centerY }
        : { x: state.player.x, y: state.player.y },
      { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
      MAP_RECT,
      zoom,
    );
    this.rebuild(state);
  }

  toggle(state: GameState): void {
    if (this.open) {
      this.close();
      return;
    }
    this.open = true;
    this.root.setVisible(true);
    this.suppressClick = false;
    this.view = clampMapView({
      zoom: 1,
      centerX: state.player.x,
      centerY: state.player.y,
    });
    this.rebuild(state);
  }

  close(): void {
    this.open = false;
    this.drag = null;
    this.root.setVisible(false);
    this.root.removeAll(true);
    this.mapLayer = undefined;
    this.maskShape?.destroy();
    this.maskShape = undefined;
    this.waypointGfx = undefined;
  }

  private rebuild(state: GameState): void {
    this.maskShape?.destroy();
    this.maskShape = undefined;
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

    this.mapLayer = this.scene.add.container(0, 0);
    this.root.add(this.mapLayer);
    this.maskShape = this.scene.make.graphics({ x: 0, y: 0 }, false);
    this.maskShape.fillStyle(0xffffff, 1).fillRect(MAP_RECT.x, MAP_RECT.y, MAP_RECT.w, MAP_RECT.h);
    this.mapLayer.setMask(this.maskShape.createGeometryMask());

    this.drawTerrain(state, island, explored);
    this.drawTrails(island, explored);
    this.drawLandmarks(state, island);
    this.drawPlayer(state);
    this.drawWaypoint(state);
    this.drawSidebar(state, island, explored);
    this.drawZoomButton(state);
    this.drawClickZone(state, island);
    this.drawZoomButtons(state);
    this.drawCloseButton();
  }

  private drawTerrain(
    state: GameState,
    island: IslandData | undefined,
    explored: Set<string>,
  ): void {
    if (!this.mapLayer) return;
    if (this.renderedExplored !== state.world.explored || !this.scene.textures.exists('island-map')) {
      renderIslandCanvas(this.scene, 'island-map', CANVAS_W, CANVAS_H, island, explored);
      this.renderedExplored = state.world.explored;
    }
    const origin = worldToMap(0, 0, MAP_RECT, this.view);
    this.mapLayer.add(
      this.scene.add
        .image(origin.x, origin.y, 'island-map')
        .setOrigin(0, 0)
        .setDisplaySize(MAP_RECT.w * this.view.zoom, MAP_RECT.h * this.view.zoom),
    );

    const border = this.scene.add.graphics();
    border.lineStyle(1, TINTS.woodDark, 1);
    border.strokeRect(MAP_RECT.x - 1, MAP_RECT.y - 1, MAP_RECT.w + 2, MAP_RECT.h + 2);
    this.mapLayer.add(border);
  }

  private drawTrails(island: IslandData | undefined, explored: Set<string>): void {
    if (!island || !this.mapLayer) return;
    const g = this.scene.add.graphics();
    const lines = [...island.trails, ...island.rivers];
    lines.forEach((trail, index) => {
      const isRiver = index >= island.trails.length;
      g.lineStyle(isRiver ? 2 : 1, isRiver ? 0x3f9fd0 : 0x8a5a2b, isRiver ? 0.9 : 0.7);
      let previous: { x: number; y: number } | null = null;
      for (const point of trail.points) {
        const mapped = worldToMap(point.x, point.y, MAP_RECT, this.view);
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
    this.mapLayer.add(g);
  }

  private drawLandmarks(state: GameState, island: IslandData | undefined): void {
    if (!island || !this.mapLayer) return;
    const g = this.scene.add.graphics();
    const flag = state.buildings.find((b) => b.type === 'flag');
    if (flag) {
      const point = worldToMap(flag.x * 16 + 8, flag.y * 16 + 8, MAP_RECT, this.view);
      g.fillStyle(0xb03a2e, 1).fillTriangle(point.x - 4, point.y - 4, point.x + 4, point.y - 4, point.x - 4, point.y + 3);
      g.lineStyle(1, TINTS.woodDark, 1).strokeTriangle(
        point.x - 4,
        point.y - 4,
        point.x + 4,
        point.y - 4,
        point.x - 4,
        point.y + 3,
      );
    }
    const entrance = state.world.wreckEntrance;
    if (entrance && entrance.x > 0 && state.world.discovered.includes('wreck')) {
      const p = worldToMap(entrance.x, entrance.y, MAP_RECT, this.view);
      const ex = p.x + 5;
      const ey = p.y - 4;
      g.fillStyle(TINTS.woodDark, 1).fillRect(ex - 3, ey - 2, 6, 4);
      g.lineStyle(1, TINTS.gold, 1).strokeRect(ex - 3, ey - 2, 6, 4);
    }
    for (const landmark of island.landmarks) {
      const point = worldToMap(landmark.x, landmark.y, MAP_RECT, this.view);
      const discovered = state.world.discovered.includes(landmark.id);
      if (discovered) {
        g.fillStyle(TINTS.gold, 1).fillCircle(point.x, point.y, 4);
        g.lineStyle(1, TINTS.woodDark, 1).strokeCircle(point.x, point.y, 4);
        this.mapLayer.add(
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
    this.mapLayer.add(g);
  }

  private drawPlayer(state: GameState): void {
    if (!this.mapLayer) return;
    const point = worldToMap(state.player.x, state.player.y, MAP_RECT, this.view);
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
    this.mapLayer.add(g);
  }

  private drawWaypoint(state: GameState): void {
    this.waypointGfx?.destroy();
    this.waypointGfx = undefined;
    if (!state.world.waypoint || !this.mapLayer) return;
    const point = worldToMap(state.world.waypoint.x, state.world.waypoint.y, MAP_RECT, this.view);
    const g = this.scene.add.graphics();
    g.lineStyle(2, TINTS.goldDark, 1);
    g.beginPath();
    g.moveTo(point.x - 4, point.y - 4);
    g.lineTo(point.x + 4, point.y + 4);
    g.moveTo(point.x + 4, point.y - 4);
    g.lineTo(point.x - 4, point.y + 4);
    g.strokePath();
    this.waypointGfx = g;
    this.mapLayer.add(g);
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
      makeText(this.scene, x, 258, '滚轮 1× / 2× 缩放\n按住拖动平移\n点击已发现地标传送\n右键清除路标', {
        color: COLORS.inkSoft,
      }).setLineSpacing(1),
    );
  }

  private drawZoomButton(state: GameState): void {
    const rect = panelRect('map');
    const label = `${Math.round(this.view.zoom * 100)}%`;
    const x = rect.x + rect.w - 16;
    const y = rect.y + 40;
    const text = makeText(this.scene, x, y, `缩放 ${label}`, {
      origin: [1, 0],
      color: COLORS.goldDark,
    });
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      const next = this.view.zoom >= MAX_MAP_ZOOM ? MIN_MAP_ZOOM : MAX_MAP_ZOOM;
      this.setZoom(state, next);
    });
    this.root.add(text);
  }

  private drawZoomButtons(state: GameState): void {
    const buttons: Array<[string, number]> = [
      ['−', MAP_RECT.x + 10],
      ['+', MAP_RECT.x + 30],
    ];
    for (const [label, x] of buttons) {
      const text = makeText(this.scene, x, MAP_RECT.y + 2, label, {
        size: 24,
        color: COLORS.ink,
      });
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        const next = Math.max(
          MIN_MAP_ZOOM,
          Math.min(MAX_MAP_ZOOM, this.view.zoom + (label === '+' ? 0.5 : -0.5)),
        );
        this.setZoom(state, next);
      });
      this.root.add(text);
    }
  }

  private drawCloseButton(): void {
    const rect = panelRect('map');
    const close = makeText(this.scene, rect.x + rect.w - 24, rect.y + 6, '×', {
      size: 24,
      color: COLORS.ink,
    });
    close.setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.close());
    this.root.add(close);
  }

  private drawClickZone(state: GameState, island: IslandData | undefined): void {
    const zone = this.scene.add
      .zone(MAP_RECT.x + MAP_RECT.w / 2, MAP_RECT.y + MAP_RECT.h / 2, MAP_RECT.w, MAP_RECT.h)
      .setInteractive();
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        state.world.waypoint = null;
        this.drawWaypoint(state);
        return;
      }
      if (this.view.zoom > MIN_MAP_ZOOM) {
        this.drag = {
          startX: pointer.x,
          startY: pointer.y,
          lastX: pointer.x,
          lastY: pointer.y,
          moved: false,
        };
      }
    });
    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const drag = this.drag;
      this.drag = null;
      if (drag?.moved || this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      const point = mapToWorld(pointer.x, pointer.y, MAP_RECT, this.view);
      const landmark = island?.landmarks.find((entry) => {
        if (!state.world.discovered.includes(entry.id)) return false;
        const mapped = worldToMap(entry.x, entry.y, MAP_RECT, this.view);
        return Math.hypot(mapped.x - pointer.x, mapped.y - pointer.y) < 10;
      });
      if (landmark && this.onTeleport) {
        this.onTeleport(landmark.x, landmark.y);
        this.close();
        return;
      }
      state.world.waypoint = {
        x: Phaser.Math.Clamp(point.x, 0, WORLD.widthPx),
        y: Phaser.Math.Clamp(point.y, 0, WORLD.heightPx),
      };
      this.drawWaypoint(state);
    });
    this.root.add(zone);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.open || !this.drag) return;
    if (!pointer.isDown) {
      this.drag = null;
      return;
    }
    const dx = pointer.x - this.drag.lastX;
    const dy = pointer.y - this.drag.lastY;
    if (!this.drag.moved && Math.hypot(pointer.x - this.drag.startX, pointer.y - this.drag.startY) < DRAG_THRESHOLD) {
      return;
    }
    this.drag.moved = true;
    this.suppressClick = true;
    this.drag.lastX = pointer.x;
    this.drag.lastY = pointer.y;
    if (this.view.zoom <= MIN_MAP_ZOOM) return;
    this.view = panMap(this.view, dx, dy, MAP_RECT);
    const state = this.state();
    if (state) this.rebuild(state);
  }

  private onWheel(pointer: Phaser.Input.Pointer, dy: number): void {
    if (!this.open) return;
    if (
      pointer.x < MAP_RECT.x ||
      pointer.x > MAP_RECT.x + MAP_RECT.w ||
      pointer.y < MAP_RECT.y ||
      pointer.y > MAP_RECT.y + MAP_RECT.h
    ) {
      return;
    }
    const anchor = mapToWorld(pointer.x, pointer.y, MAP_RECT, this.view);
    const next = dy < 0 ? Math.min(MAX_MAP_ZOOM, this.view.zoom * 2) : Math.max(MIN_MAP_ZOOM, this.view.zoom / 2);
    if (next === this.view.zoom) return;
    this.view = zoomMapAt(anchor, pointer, MAP_RECT, next);
    const state = this.state();
    if (state) this.rebuild(state);
  }

  private state(): GameState | null {
    return (this.scene.registry.get('state') as GameState | undefined) ?? null;
  }
}
