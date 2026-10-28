# 视觉、UI 与 10000×6000 岛屿重做实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有 96×96 占位画面重做为 640×360 整数缩放的 Tiny 像素风游戏，并把岛屿升级为 10000×6000 世界像素的程序化多区域世界。

**Architecture:** 生成器（`src/world/generate.ts` 等）是纯函数，输出逻辑地形、区域、地标、河流与小径；`IslandScene` 只负责按 32×32 瓦片区块把逻辑地形烘焙成 `RenderTexture` 并管理实体。存档 v2 只存种子、探索位图与实体差异，载入时重建世界。UI 全部走 `src/ui` 的组件与 Fusion Pixel 12px。

**Tech Stack:** TypeScript 5.9、Vite 6、Phaser 3.90（锁定）、Vitest 3、ESLint 9、Node 22。

**Spec:** `docs/superpowers/specs/2026-10-28-visual-overhaul-design.md`

## Global Constraints

- 内部画布 **640×360**，16px 瓦片，相机 zoom 2；只允许整数倍缩放（3×/4×/6×），不能整除时黑边居中。
- 字体只用 **Fusion Pixel 12px**；字号只允许 **12px / 24px**；不再出现 8/9/10/11/13/14px。
- 世界 **10000×6000 世界像素 = 625×375 格**；区块 **32×32 格**；同种子生成结果必须完全一致。
- `src/core`、`src/data`、`src/systems`、`src/world` 禁止 `import Phaser`（`src/world/*.ts` 只放纯函数）。
- 存档 `version = 2`；localStorage + JSON 导入导出；v1 存档必须可迁移。
- 所有新增逻辑必须有 Vitest 单测；每个任务结束跑 `npm.cmd run test && npm.cmd run typecheck`。
- 中文 UI；桌面键鼠；60 FPS 目标。

## Review Focus

- **同种子重建一致性**：换浏览器/重新载入后，岛屿、地标、资源点必须落在同一位置；任何 `Math.random()`、`Date.now()` 或 `Set` 顺序进入生成器都会让存档错位。由 Task 2/3 的确定性测试覆盖。
- **出生点与地标可通行**：出生点、营地 5×5、7 个地标必须落在沙/草上且在世界边界内；生成器在海岸附近容易把点放进深水。由 Task 3 覆盖。
- **区块边界覆盖**：相机在任意位置（含世界四角）时，可见区块必须完整覆盖视口，否则出现黑缝。由 Task 4 覆盖。
- **探索位图编解码**：空存档、重复区块、越界坐标、损坏 base64 都不能让载入崩溃或丢探索度。由 Task 7 覆盖。
- **地图坐标与路径点**：world→map→world 往返误差 ≤ 1px；地图外点击不能生成越界路径点。由 Task 11 覆盖。

---

### Task 1: 资产、字体与整数缩放

**Files:**
- Create: `scripts/build-assets.mjs`
- Create: `src/core/scaling.ts`, `src/ui/theme.ts`, `src/ui/text.ts`, `src/style.css`
- Create: `public/assets/tiles/{town,battle,dungeon,farm}.png`, `public/assets/ui/{ui-large,ui-small}.png`, `public/assets/fonts/fusion-pixel-12px.woff2`, `public/assets/fonts/OFL.txt`
- Modify: `src/main.ts`, `src/core/config.ts`, `index.html`, `package.json`
- Test: `tests/unit/scaling.test.ts`

**Interfaces:**
- Produces: `integerScale(viewW: number, viewH: number): { scale: number; offsetX: number; offsetY: number }`
- Produces: `makeText(scene: Phaser.Scene, x: number, y: number, content: string, style?: Partial<Phaser.Types.GameObjects.Text.TextStyle>): Phaser.GameObjects.Text`
- Produces: `FONT_FAMILY`, `FONT_SIZE`, `COLORS`, `DEPTH` from `src/ui/theme.ts`

- [ ] **Step 1: 提交已批准的设计文档与截图**

```bash
git add docs/design docs/superpowers/specs
git commit -m "docs: approve visual and island overhaul design"
```

- [ ] **Step 2: Write the failing scaling test**

```ts
import { describe, it, expect } from 'vitest';
import { integerScale } from '../../src/core/scaling';

describe('integerScale', () => {
  it('uses 3x at 1920x1080', () => {
    expect(integerScale(1920, 1080)).toEqual({ scale: 3, offsetX: 0, offsetY: 0 });
  });
  it('letterboxes 1366x768 at 2x', () => {
    expect(integerScale(1366, 768)).toEqual({ scale: 2, offsetX: 43, offsetY: 24 });
  });
  it('uses 6x at 3840x2160', () => {
    expect(integerScale(3840, 2160)).toEqual({ scale: 6, offsetX: 0, offsetY: 0 });
  });
  it('never goes below 1x', () => {
    expect(integerScale(500, 300)).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/scaling.test.ts`
Expected: FAIL — cannot resolve `../../src/core/scaling`

- [ ] **Step 4: Implement `integerScale`**

`scale = max(1, floor(min(viewW / 640, viewH / 360)))`；`offsetX = floor((viewW - 640 * scale) / 2)`，`offsetY` 同理，负数夹到 0。

- [ ] **Step 5: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/scaling.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Add assets, font and asset script**

复制视觉稿里已打包的资源：

```bash
mkdir -p public/assets/tiles public/assets/ui public/assets/fonts
cp ../visual-mock/assets/sheets/town.png public/assets/tiles/town.png
cp ../visual-mock/assets/sheets/battle.png public/assets/tiles/battle.png
cp ../visual-mock/assets/sheets/dungeon.png public/assets/tiles/dungeon.png
cp ../visual-mock/assets/sheets/farm.png public/assets/tiles/farm.png
cp ../visual-mock/assets/sheets/ui-large.png public/assets/ui/ui-large.png
cp ../visual-mock/assets/sheets/ui-small.png public/assets/ui/ui-small.png
cp ../visual-mock/assets/fonts/fusion.woff2 public/assets/fonts/fusion-pixel-12px.woff2
cp ../visual-mock/assets/fonts/OFL.txt public/assets/fonts/OFL.txt
```

`scripts/build-assets.mjs` 只做校验与幂等复制：读取 `assets-src/manifest.json`（gitignored，可选），校验 4 张 tilesheet 为 192×176、UI 为 416×224 / 368×112、字体存在；缺文件时以非零码退出。`package.json` 增加 `"assets": "node scripts/build-assets.mjs"`。

- [ ] **Step 7: Implement theme, text, font and integer scaling wiring**

`src/ui/theme.ts`：

```ts
export const FONT_FAMILY = '"Fusion Pixel 12px", monospace';
export const FONT_SIZE = { body: 12, title: 24 } as const;
export const COLORS = {
  ink: '#2b2118', inkSoft: '#5a4630', cream: '#f0e6d2', parchment: '#f0dfb8',
  gold: '#ffd479', goldDark: '#b8792a', muted: '#8d7b5e',
  hp: '#c94f4f', hunger: '#e0913f', thirst: '#3f8fd0', energy: '#6fbf4f',
} as const;
export const DEPTH = { world: 0, canopy: 6000, hud: 8000, banner: 8500, panel: 9000, tooltip: 9500 } as const;
```

`src/ui/text.ts`：`makeText` 统一 `resolution: 1`、`roundPixels: true`、`fontFamily: FONT_FAMILY`，坐标 `Math.round`。

`src/style.css` 加 `@font-face`（`url('/AI_LBS/assets/fonts/fusion-pixel-12px.woff2')` 必须用 `import.meta.env.BASE_URL` 或相对路径），`canvas { image-rendering: pixelated; }`，`#app { display:flex; align-items:center; justify-content:center; }`。

`src/main.ts` 改成 async boot：先 `await document.fonts.load('12px "Fusion Pixel 12px"')`（失败 `console.warn`），再 `new Phaser.Game`；窗口 resize 时调用 `integerScale` 设置 canvas 的 `style.width/height` 与 `margin`。`GAME_CONFIG.scale.mode` 改为 `Phaser.Scale.NONE`。

- [ ] **Step 8: Verify and commit**

Run: `npm.cmd run test && npm.cmd run typecheck && npm.cmd run build`
Expected: 全部通过；构建成功。

```bash
git add public/assets scripts src package.json index.html tests/unit/scaling.test.ts
git commit -m "feat: add pixel assets, pixel font and integer scaling"
```

---

### Task 2: 世界生成 I — 噪声、形状、高度、区域

**Files:**
- Create: `src/core/noise.ts`, `src/world/regions.ts`, `src/world/generate.ts`
- Modify: `src/core/config.ts`
- Test: `tests/unit/worldgen.test.ts`

**Interfaces:**
- Produces: `WORLD = { widthPx: 10000, heightPx: 6000, tile: 16, widthTiles: 625, heightTiles: 375 }`
- Produces: `valueNoise2D(x: number, y: number, seed: number): number`、`fbm(x: number, y: number, seed: number, octaves?: number): number`
- Produces: `REGIONS: readonly RegionDef[]`、`regionIndexAt(seed: number, tileX: number, tileY: number): number`
- Produces: `generateTerrain(seed: number): { width: number; height: number; terrain: Uint8Array; regions: Uint8Array; hash: number }`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { WORLD } from '../../src/core/config';
import { generateTerrain } from '../../src/world/generate';

describe('generateTerrain', () => {
  it('has the world dimensions', () => {
    expect(WORLD.widthTiles).toBe(625);
    expect(WORLD.heightTiles).toBe(375);
    const island = generateTerrain(42);
    expect(island.terrain).toHaveLength(625 * 375);
    expect(island.regions).toHaveLength(625 * 375);
  });

  it('is deterministic for the same seed', () => {
    const a = generateTerrain(42);
    const b = generateTerrain(42);
    expect(a.hash).toBe(b.hash);
    expect(Array.from(a.terrain.slice(0, 5000))).toEqual(Array.from(b.terrain.slice(0, 5000)));
  });

  it('differs for a different seed', () => {
    expect(generateTerrain(42).hash).not.toBe(generateTerrain(43).hash);
  });

  it('has a playable land ratio', () => {
    const island = generateTerrain(42);
    const land = island.terrain.filter((t) => t >= 3).length;
    const ratio = land / island.terrain.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.6);
  });

  it('assigns one of five regions', () => {
    const island = generateTerrain(42);
    expect(new Set(Array.from(island.regions)).size).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/worldgen.test.ts`
Expected: FAIL — cannot resolve `generateTerrain`

- [ ] **Step 3: Implement noise, regions and terrain generation**

- `src/core/noise.ts`：32-bit 整数哈希 + 双线性插值的 value noise；`fbm` 4 个八度，振幅 0.5/0.25/0.125/0.0625。
- `src/world/regions.ts`：5 个区域锚点（世界像素）：海岸平原 `(5200, 4900)`、雨林 `(7100, 3700)`、高地 `(4700, 1500)`、潮汐湾 `(2100, 3700)`、石阵荒野 `(7700, 1700)`。`regionIndexAt` 用“每锚点独立噪声扰动”的最近距离，边界必须有机。
- `src/world/generate.ts`：6 个椭圆瓣取并集（主岛 5200,3400 / 南岸 5200,4900 / 东雨林 7150,3700 / 西湾 2700,3750 / 北高地 4800,1950 / 东北石阵 7250,2100），叠 2 层 domain warp（±500px）与 fBm；`h = 0.52 + 0.30 * shape + noise`；阈值：`<0.455` 深水、`<0.50` 浅水、`<0.535` 沙、`<0.575` 浅滩、否则陆地；`>0.74` 且属高地时 `TILE.rock`。`hash` 用 FNV-1a 遍历 `terrain`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/worldgen.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/noise.ts src/world/regions.ts src/world/generate.ts src/core/config.ts tests/unit/worldgen.test.ts
git commit -m "feat: add deterministic island terrain generator"
```

---

### Task 3: 世界生成 II — 地标、河流、小径、出生点

**Files:**
- Create: `src/world/landmarks.ts`, `src/world/paths.ts`
- Modify: `src/world/generate.ts`
- Test: `tests/unit/landmarks.test.ts`

**Interfaces:**
- Produces: `type LandmarkKind = 'camp' | 'wreck' | 'spring' | 'lookout' | 'ruins' | 'cave' | 'oldcamp'`
- Produces: `interface Landmark { id: string; kind: LandmarkKind; region: number; x: number; y: number }`
- Produces: `generateIsland(seed: number): IslandData`，`IslandData` 增加 `landmarks: Landmark[]`、`trails: Trail[]`、`rivers: Trail[]`、`spawn: Vec2`、`campCenter: Vec2`
- Consumes: Task 2 的 `generateTerrain`、`WORLD`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { TILE } from '../../src/world/terrain';
import { generateIsland } from '../../src/world/generate';

const island = generateIsland(42);
const tileAt = (x: number, y: number) =>
  island.terrain[Math.floor(y / 16) * island.width + Math.floor(x / 16)];
const walkable = (x: number, y: number) => {
  const t = tileAt(x, y);
  return t === TILE.sand || t === TILE.grass || t === TILE.forest || t === TILE.rock || t === TILE.clay;
};

describe('generateIsland', () => {
  it('places all seven landmarks on walkable land', () => {
    expect(island.landmarks.map((l) => l.kind).sort()).toEqual(
      ['camp', 'cave', 'lookout', 'oldcamp', 'ruins', 'spring', 'wreck'],
    );
    for (const l of island.landmarks) expect(walkable(l.x, l.y)).toBe(true);
  });

  it('keeps the camp and spring near the wreck', () => {
    const wreck = island.landmarks.find((l) => l.kind === 'wreck')!;
    const camp = island.landmarks.find((l) => l.kind === 'camp')!;
    const spring = island.landmarks.find((l) => l.kind === 'spring')!;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    expect(dist(wreck, camp)).toBeLessThanOrEqual(640);
    expect(dist(camp, spring)).toBeGreaterThanOrEqual(480);
    expect(dist(camp, spring)).toBeLessThanOrEqual(640);
  });

  it('spawns the player on the beach near the wreck', () => {
    const wreck = island.landmarks.find((l) => l.kind === 'wreck')!;
    expect(Math.hypot(island.spawn.x - wreck.x, island.spawn.y - wreck.y)).toBeLessThanOrEqual(96);
    expect(walkable(island.spawn.x, island.spawn.y)).toBe(true);
  });

  it('keeps a flat 5x5 camp clearing', () => {
    const cx = Math.floor(island.campCenter.x / 16);
    const cy = Math.floor(island.campCenter.y / 16);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const t = island.terrain[(cy + dy) * island.width + (cx + dx)];
        expect([TILE.grass, TILE.sand, TILE.clay]).toContain(t);
      }
    }
  });

  it('connects every landmark with trails', () => {
    expect(island.trails.length).toBeGreaterThanOrEqual(6);
    expect(island.rivers.length).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic', () => {
    expect(generateIsland(42).hash).toBe(island.hash);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/landmarks.test.ts`
Expected: FAIL — `generateIsland` is not exported

- [ ] **Step 3: Implement landmark placement and paths**

- `src/world/landmarks.ts`：模板表（kind → 区域、最小间距、搜索半径）。放置顺序：wreck → camp → spring → cave → lookout → ruins → oldcamp；每个候选点必须在目标区域内、可行走、与已放置点距离 ≥ 320px；找不到就螺旋扩大搜索半径（步长 32px，最多 2048px）。
- 营地：从 wreck 向岛屿中心方向搜索 320–640px，找到 5×5 全为草/沙/黏土的点，把 5×5 内统一成 `TILE.grass`。
- 出生点：wreck 旁 48–96px、可行走的点。
- `src/world/paths.ts`：`buildTrails(landmarks)` 用 Prim 最小生成树连接 7 个地标，每段用 4 段折线 + 噪声偏移；`carveRiver(island, spring, bay)` 从淡水泉沿高度梯度下降到潮汐湾，宽 1–3 格，写入 `TILE.stream`。
- 小径不写地形，只输出 `Trail[]` 供渲染与移速加成。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/landmarks.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/world/landmarks.ts src/world/paths.ts src/world/generate.ts tests/unit/landmarks.test.ts
git commit -m "feat: place landmarks, trails and rivers on the island"
```

---

### Task 4: 区块管理与地形视觉层

**Files:**
- Create: `src/world/chunks.ts`, `src/world/terrainVisual.ts`, `src/world/decor.ts`
- Modify: `src/scenes/IslandScene.ts`, `src/scenes/BootScene.ts`
- Test: `tests/unit/chunks.test.ts`

**Interfaces:**
- Produces: `CHUNK_TILES = 32`
- Produces: `chunkOf(tileX: number, tileY: number): { cx: number; cy: number }`
- Produces: `visibleChunks(cameraX: number, cameraY: number, viewW: number, viewH: number): { cx: number; cy: number }[]`
- Produces: `terrainFrame(tile: number, neighbors: { n: boolean; e: boolean; s: boolean; w: boolean }, variant: number): number`
- Produces: `decorForChunk(seed: number, cx: number, cy: number): { x: number; y: number; frame: number }[]`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { CHUNK_TILES, chunkOf, visibleChunks } from '../../src/world/chunks';
import { terrainFrame } from '../../src/world/terrainVisual';
import { TILE } from '../../src/world/terrain';

describe('chunks', () => {
  it('maps tiles to 32x32 chunks', () => {
    expect(CHUNK_TILES).toBe(32);
    expect(chunkOf(0, 0)).toEqual({ cx: 0, cy: 0 });
    expect(chunkOf(31, 31)).toEqual({ cx: 0, cy: 0 });
    expect(chunkOf(32, 33)).toEqual({ cx: 1, cy: 1 });
  });

  it('covers the viewport at the world origin', () => {
    const chunks = visibleChunks(0, 0, 320, 180);
    expect(chunks).toContainEqual({ cx: 0, cy: 0 });
    expect(chunks.length).toBeGreaterThanOrEqual(4);
  });

  it('covers the viewport at the bottom-right corner', () => {
    const chunks = visibleChunks(10000 - 320, 6000 - 180, 320, 180);
    expect(chunks).toContainEqual({ cx: Math.floor((10000 - 320) / 512), cy: Math.floor((6000 - 180) / 512) });
  });

  it('has no duplicate chunks', () => {
    const chunks = visibleChunks(4321, 2100, 320, 180);
    expect(new Set(chunks.map((c) => `${c.cx},${c.cy}`)).size).toBe(chunks.length);
  });
});

describe('terrainFrame', () => {
  it('uses different frames for coast and inland', () => {
    const coast = terrainFrame(TILE.sand, { n: false, e: true, s: true, w: true }, 0);
    const inland = terrainFrame(TILE.sand, { n: true, e: true, s: true, w: true }, 0);
    expect(coast).not.toBe(inland);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/chunks.test.ts`
Expected: FAIL — cannot resolve `../../src/world/chunks`

- [ ] **Step 3: Implement chunk math, frame selection and decor**

- `visibleChunks`：把相机可视矩形按 512px 区块展开，`floor` 起点、`floor` 终点，去重。
- `terrainFrame`：`tile * 16 + variant * 4 + coastBits`，其中 `coastBits` 由 4-bit 邻居位计算；同一 tile/variant/邻居组合必须稳定。
- `decorForChunk`：每个 32×32 区块用 `seed ^ cx ^ cy` 生成 1–2 个装饰（草簇/花/石子/贝壳），返回世界坐标与 frame。

- [ ] **Step 4: Wire the visual layer into `IslandScene`**

- `BootScene.preload` 加载 `town/battle/dungeon/farm` 四张 tilesheet 与 `terrain` atlas，移除 `island.tmj` 与 `placeholder.png`。
- `IslandScene`：`create()` 调 `generateIsland(state.world.seed)`；`makeMap()` 删除 Tiled 逻辑，改为 `this.terrainType` 数组 + `chunks` Map。
- 区块首次可见时创建 512×512 `RenderTexture`，把地面帧与装饰画进去；离开 3×3 范围时 `destroy()`。
- 每帧最多烘焙 1 个区块；`this.cameras.main` 移动时更新可见区块。
- `placementWorld()` 与 `terrainSpeedAt()` 改读 `terrainType` 数组。

- [ ] **Step 5: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/chunks.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/world/chunks.ts src/world/terrainVisual.ts src/world/decor.ts src/scenes tests/unit/chunks.test.ts
git commit -m "feat: stream 32x32 terrain chunks with baked render textures"
```

---

### Task 5: 资源节点与建筑贴图

**Files:**
- Create: `src/ui/assets.ts`
- Modify: `src/entities/resourceNode.ts`, `src/entities/building.ts`, `src/scenes/IslandScene.ts`
- Test: `tests/unit/assets.test.ts`

**Interfaces:**
- Produces: `nodeSprite(type: string, depleted: boolean): { texture: string; frame?: number }`
- Produces: `buildingSprite(type: string): { texture: string; frame?: number; w: number; h: number }`
- Produces: `TEXTURE = { town: 'town', battle: 'battle', dungeon: 'dungeon', farm: 'farm', uiLarge: 'ui-large', uiSmall: 'ui-small' } as const`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { buildingSprite, nodeSprite } from '../../src/ui/assets';

describe('sprite mapping', () => {
  it('maps every resource node type', () => {
    for (const type of ['tree', 'palm', 'rock', 'vine', 'berry', 'tide', 'clay']) {
      expect(nodeSprite(type, false).texture).toBeTruthy();
      expect(nodeSprite(type, true).texture).toBeTruthy();
    }
  });

  it('uses a 2x2 hut for the camp shelter', () => {
    expect(buildingSprite('shelter')).toEqual({ texture: 'hut', w: 64, h: 64 });
  });

  it('falls back to a visible placeholder texture', () => {
    expect(nodeSprite('unknown', false).texture).toBe('farm');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/assets.test.ts`
Expected: FAIL — cannot resolve `../../src/ui/assets`

- [ ] **Step 3: Implement sprite mapping and hand-drawn hut**

- `src/ui/assets.ts`：节点映射用视觉稿索引：树 `town 3/27/28`、松树 `farm 15/27`、棕榈手绘、岩石 `farm 89`、藤蔓 `farm 39/64`、浆果 `farm 78`、潮池 `battle 73`、黏土 `town 39`、宝箱 `dungeon 101`。
- 棚屋：在 `IslandScene` 用 32×32 离屏 canvas 画 2×2（木墙 + 茅草顶 + 石基 + 烟囱 + 暖光门），`generateTexture('hut', 32, 32)` 后按 2× 显示为 64×64。
- `resourceNode`/`building` 改为 `Phaser.GameObjects.Image`，原点 `(0.5, 1)`，脚下阴影 10×4。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/assets.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/assets.ts src/entities src/scenes/IslandScene.ts tests/unit/assets.test.ts
git commit -m "feat: replace graphics nodes and buildings with pixel sprites"
```

---

### Task 6: 角色、光照与低状态提示

**Files:**
- Create: `src/world/lighting.ts`
- Modify: `src/entities/player.ts`, `src/entities/laborer.ts`, `src/entities/savage.ts`, `src/scenes/IslandScene.ts`
- Test: `tests/unit/lighting.test.ts`

**Interfaces:**
- Produces: `nightAlpha(clockMin: number): number`（0–0.55）
- Produces: `lowHealthVignette(hp: number): number`（0–0.2）
- Produces: `bobOffset(elapsedMs: number): number`（0 或 1）

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { bobOffset, lowHealthVignette, nightAlpha } from '../../src/world/lighting';

describe('lighting', () => {
  it('is dark at midnight and clear at noon', () => {
    expect(nightAlpha(0)).toBeCloseTo(0.55, 2);
    expect(nightAlpha(720)).toBeCloseTo(0, 2);
  });
  it('ramps through dusk', () => {
    expect(nightAlpha(1080)).toBeGreaterThan(0);
    expect(nightAlpha(1080)).toBeLessThan(0.55);
  });
  it('only shows the vignette below 30 hp', () => {
    expect(lowHealthVignette(100)).toBe(0);
    expect(lowHealthVignette(20)).toBeGreaterThan(0);
    expect(lowHealthVignette(0)).toBeLessThanOrEqual(0.2);
  });
  it('bobs by at most one pixel', () => {
    expect([0, 1]).toContain(bobOffset(0));
    expect([0, 1]).toContain(bobOffset(125));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/lighting.test.ts`
Expected: FAIL — cannot resolve `../../src/world/lighting`

- [ ] **Step 3: Implement lighting helpers and character sprites**

- `nightAlpha`：06:00–18:00 为 0；18:00–20:00 线性升到 0.55；20:00–04:00 为 0.55；04:00–06:00 线性降回 0。
- `lowHealthVignette(hp)`：`hp >= 30` → 0；否则 `0.2 * (1 - hp / 30)`。
- `bobOffset`：`Math.floor(elapsedMs / 160) % 2`。
- 玩家/劳工/野人改用 `farm 109` / `farm 110` / `dungeon 88` 等帧；水平翻转 + `bobOffset`；受击白色 flash 80ms。
- 夜间叠加 `#081a33`，营火光圈 96px、火把 64px，玩家光圈 48px。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/lighting.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/world/lighting.ts src/entities src/scenes/IslandScene.ts tests/unit/lighting.test.ts
git commit -m "feat: add pixel characters, day-night tint and low-health vignette"
```

---

### Task 7: 存档 v2 与 v1 迁移

**Files:**
- Create: `src/core/explored.ts`
- Modify: `src/core/gameState.ts`, `src/systems/saveSystem.ts`
- Test: `tests/unit/saveV2.test.ts`

**Interfaces:**
- Produces: `SAVE_VERSION = 2`
- Produces: `encodeExplored(chunks: Iterable<string>): string`、`decodeExplored(raw: string): Set<string>`
- Produces: `migrateV1(old: unknown): GameState`
- `GameState.world` 增加 `seed: number`、`hash: number`、`explored: string`、`discovered: string[]`、`waypoint: { x: number; y: number } | null`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { decodeExplored, encodeExplored } from '../../src/core/explored';
import { SAVE_VERSION, importSave, serializeSave, validateSave } from '../../src/systems/saveSystem';

describe('save v2', () => {
  it('creates version 2 with a seed and empty exploration', () => {
    const s = createNewGame(7);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.world.seed).toBe(7);
    expect(s.world.explored).toBe('');
    expect(s.world.discovered).toEqual([]);
  });

  it('round-trips explored chunks', () => {
    const chunks = ['0,0', '1,0', '12,7'];
    expect([...decodeExplored(encodeExplored(chunks))].sort()).toEqual(chunks.sort());
  });

  it('rejects corrupt exploration data', () => {
    expect(() => decodeExplored('not-base64!!')).toThrow();
  });

  it('round-trips a v2 save', () => {
    const s = createNewGame(11);
    s.world.explored = encodeExplored(['0,0']);
    expect(validateSave(JSON.parse(serializeSave(s)))).toEqual(s);
  });

  it('migrates a v1 save', () => {
    const old = { ...createNewGame(5), version: 1 } as Record<string, unknown>;
    delete (old.world as Record<string, unknown>).seed;
    const migrated = importSave(JSON.stringify(old));
    expect(migrated.version).toBe(2);
    expect(migrated.world.seed).toBeTypeOf('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/saveV2.test.ts`
Expected: FAIL — `SAVE_VERSION` is not exported

- [ ] **Step 3: Implement v2 schema, exploration codec and migration**

- `explored.ts`：每个区块 1 bit，索引 `cy * 20 + cx`（625/32 → 20 列，375/32 → 12 行）；base64 编码 30 字节；解码时校验长度与字符集，非法抛 `SaveError`。
- `createNewGame(seed)`：`world.seed = seed`，`hash` 延迟到首次生成后写入；`camp.center` 与 `wreckSpawn` 改为由生成器提供（先保留占位，Task 4 接入后替换）。
- `saveSystem.validateSave`：接受 v1 与 v2；v1 走 `migrateV1`（保留 inventory/hotbar/equipment/camp/time/flags，世界重新生成，建筑/劳工按比例映射到新营地 320px 内）。
- `SAVE_KEY` 保持 `robinson.save.v1` 以免旧档读不到；备份键不变。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/saveV2.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the existing save tests**

Run: `npm.cmd run test -- tests/unit/saveSystem.test.ts`
Expected: PASS（如有断言 `version === 1`，改为 `SAVE_VERSION`）

- [ ] **Step 6: Commit**

```bash
git add src/core src/systems/saveSystem.ts tests/unit/saveV2.test.ts tests/unit/saveSystem.test.ts
git commit -m "feat: save v2 with seed, explored bitmap and v1 migration"
```

---

### Task 8: HUD 重写

**Files:**
- Create: `src/ui/widgets/panel.ts`, `src/ui/widgets/bar.ts`, `src/ui/widgets/slot.ts`, `src/ui/icons.ts`
- Modify: `src/ui/hud.ts`, `src/scenes/UIScene.ts`
- Test: `tests/unit/uiLayout.test.ts`

**Interfaces:**
- Produces: `barWidth(value: number, max: number, width: number): number`
- Produces: `hotbarSlotRect(index: number): { x: number; y: number; size: number }`
- Produces: `panelRect(kind: 'inventory' | 'map' | 'pause'): { x: number; y: number; w: number; h: number }`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { barWidth, hotbarSlotRect, panelRect } from '../../src/ui/widgets/layout';

describe('ui layout', () => {
  it('clamps bar fill', () => {
    expect(barWidth(50, 100, 86)).toBe(43);
    expect(barWidth(-5, 100, 86)).toBe(0);
    expect(barWidth(200, 100, 86)).toBe(86);
  });
  it('lays out eight hotbar slots', () => {
    expect(hotbarSlotRect(0)).toEqual({ x: 162, y: 312, size: 36 });
    expect(hotbarSlotRect(7)).toEqual({ x: 162 + 7 * 40, y: 312, size: 36 });
  });
  it('uses the approved panel rectangles', () => {
    expect(panelRect('inventory')).toEqual({ x: 40, y: 12, w: 560, h: 336 });
    expect(panelRect('map')).toEqual({ x: 24, y: 16, w: 592, h: 328 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/uiLayout.test.ts`
Expected: FAIL — cannot resolve `../../src/ui/widgets/layout`

- [ ] **Step 3: Implement layout constants and HUD**

- `src/ui/widgets/layout.ts`：上面三个函数与 HUD 矩形常量（时钟 8,8,168,30；横幅 184,8,296,30；营地 492,8,140,30；状态 8,44,176,104；目标 8,156,176,26；提示 426,230,88,24）。
- `panel.ts`：九宫格面板 + 标题栏 + 关闭按钮 + 遮罩。
- `bar.ts`：12px 图标 + 标签 + 8px 条 + 数值。
- `slot.ts`：36/48 两档，数量右下、耐久 3px、选中金色 2px。
- `hud.ts` 重写：使用 `makeText`、`FONT_SIZE.body/title`；文本 200ms 节流；横幅队列。
- `UIScene` 适配新 Hud API；`registry` 字段保持不变。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/uiLayout.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui src/scenes/UIScene.ts tests/unit/uiLayout.test.ts
git commit -m "feat: rebuild HUD with pixel theme, icons and 12/24px type"
```

---

### Task 9: 背包与 tooltip

**Files:**
- Create: `src/ui/widgets/tooltip.ts`
- Modify: `src/ui/inventoryPanel.ts`
- Test: `tests/unit/tooltip.test.ts`

**Interfaces:**
- Produces: `clampTooltip(x: number, y: number, w: number, h: number, screenW: number, screenH: number): { x: number; y: number }`
- Consumes: Task 8 的 `panelRect('inventory')`、`slot.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { clampTooltip } from '../../src/ui/widgets/tooltip';

describe('clampTooltip', () => {
  it('keeps the tooltip inside the screen', () => {
    expect(clampTooltip(630, 350, 200, 92, 640, 360)).toEqual({ x: 440, y: 268 });
  });
  it('leaves room when the cursor is near the top-left', () => {
    expect(clampTooltip(0, 0, 200, 92, 640, 360)).toEqual({ x: 0, y: 0 });
  });
  it('flips to the left of the cursor when needed', () => {
    const out = clampTooltip(600, 100, 200, 92, 640, 360);
    expect(out.x).toBeLessThanOrEqual(440);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/tooltip.test.ts`
Expected: FAIL — cannot resolve `../../src/ui/widgets/tooltip`

- [ ] **Step 3: Implement tooltip and inventory panel**

- `clampTooltip`：`x = min(x, screenW - w)`，`y = min(y, screenH - h)`，再 `max(0, ...)`。
- `inventoryPanel.ts`：560×336 面板；左栏 176px（64 头像、名字/等级、4 状态、3 装备槽 y=256）；右栏 6×4 48px 格（x=248,y=56,gap6）；容量文本；tooltip 跟随鼠标 + 边界钳制。
- 点击食物食用、点击装备显示 tooltip；阶段一装备槽显示“阶段二开放”。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/tooltip.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/widgets/tooltip.ts src/ui/inventoryPanel.ts tests/unit/tooltip.test.ts
git commit -m "feat: rebuild inventory panel with equipment slots and clamped tooltip"
```

---

### Task 10: 合成、建造、劳工面板

**Files:**
- Create: `src/ui/widgets/scrollList.ts`
- Modify: `src/ui/craftPanel.ts`, `src/ui/buildMenu.ts`, `src/ui/laborPanel.ts`
- Test: `tests/unit/scrollList.test.ts`

**Interfaces:**
- Produces: `visibleRows(total: number, scroll: number, rows: number): { start: number; end: number }`
- Consumes: Task 8 的 `panel.ts`、`button` 样式、`slot.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { visibleRows } from '../../src/ui/widgets/scrollList';

describe('visibleRows', () => {
  it('returns all rows when they fit', () => {
    expect(visibleRows(4, 0, 6)).toEqual({ start: 0, end: 4 });
  });
  it('windows long lists', () => {
    expect(visibleRows(20, 3, 6)).toEqual({ start: 3, end: 9 });
  });
  it('clamps overscroll', () => {
    expect(visibleRows(20, 99, 6)).toEqual({ start: 14, end: 20 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/scrollList.test.ts`
Expected: FAIL — cannot resolve `../../src/ui/widgets/scrollList`

- [ ] **Step 3: Implement scroll list and the three panels**

- `visibleRows`：`start = clamp(scroll, 0, max(0, total - rows))`，`end = min(total, start + rows)`。
- 合成：左侧 4 个 28px 标签，右侧 40px 行；材料不足整行灰化；连续合成不关闭。
- 建造：2×4 卡片 256×64；锁定态灰化 + `营地 LvN 解锁`；点击后进入放置预览。
- 劳工：最多 3 张 520×72 卡片；任务循环与指派按钮；空状态提示。
- 三个面板都用 `panel.ts` + `makeText`，正文 12px。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/scrollList.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/widgets/scrollList.ts src/ui/craftPanel.ts src/ui/buildMenu.ts src/ui/laborPanel.ts tests/unit/scrollList.test.ts
git commit -m "feat: rebuild craft, build and labor panels"
```

---

### Task 11: 全岛地图（M）

**Files:**
- Create: `src/ui/mapPanel.ts`, `src/world/mapView.ts`
- Modify: `src/scenes/UIScene.ts`, `src/systems/saveSystem.ts`（waypoint 校验）
- Test: `tests/unit/mapView.test.ts`

**Interfaces:**
- Produces: `worldToMap(wx: number, wy: number, rect: MapRect): { x: number; y: number }`
- Produces: `mapToWorld(mx: number, my: number, rect: MapRect): { x: number; y: number }`
- Produces: `explorePercent(explored: Set<string>): number`
- Produces: `mapRect = { x: 40, y: 70, w: 400, h: 240 }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { MAP_RECT, explorePercent, mapToWorld, worldToMap } from '../../src/world/mapView';

describe('mapView', () => {
  it('round-trips world and map coordinates', () => {
    const p = worldToMap(5000, 3000, MAP_RECT);
    const back = mapToWorld(p.x, p.y, MAP_RECT);
    expect(back.x).toBeCloseTo(5000, 0);
    expect(back.y).toBeCloseTo(3000, 0);
  });
  it('puts the world origin at the map top-left', () => {
    expect(worldToMap(0, 0, MAP_RECT)).toEqual({ x: 40, y: 70 });
  });
  it('computes exploration percentage over 240 chunks', () => {
    expect(explorePercent(new Set())).toBe(0);
    const all = new Set<string>();
    for (let cy = 0; cy < 12; cy++) for (let cx = 0; cx < 20; cx++) all.add(`${cx},${cy}`);
    expect(explorePercent(all)).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- tests/unit/mapView.test.ts`
Expected: FAIL — cannot resolve `../../src/world/mapView`

- [ ] **Step 3: Implement map math and map panel**

- `mapView.ts`：`MAP_RECT = { x: 40, y: 70, w: 400, h: 240 }`；`worldToMap` 线性映射；`mapToWorld` 逆映射；`explorePercent` 以 20×12=240 区块为分母。
- `mapPanel.ts`：
  - 592×328 面板；标题栏 + `625 × 375 格 · 10,000 × 6,000`。
  - 200×120 离屏画布绘制岛屿：海面深青、陆地羊皮纸、已探索恢复地表色、海岸 1px 深棕、河流青色、小径棕色虚线。
  - 迷雾：未探索陆地 74% 羊皮纸、海面 22%，边缘 3px 模糊。
  - 地标：已发现金色图标 + 名称（深棕 + 羊皮纸描边）；未发现棕色空心菱形。
  - 玩家箭头 + 光环；侧栏 144px（探索度、5 区域、地标计数、图例）。
  - 点击地标设置 `state.world.waypoint`；滚轮 1×–3× 缩放；拖动平移。
- `UIScene`：`M` 开关地图并暂停世界；`Esc` 关闭；地图打开时仍显示时钟与状态。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- tests/unit/mapView.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/mapPanel.ts src/world/mapView.ts src/scenes/UIScene.ts src/systems/saveSystem.ts tests/unit/mapView.test.ts
git commit -m "feat: add parchment island map with fog, landmarks and waypoints"
```

---

### Task 12: 暂停/死亡、打磨与验收

**Files:**
- Modify: `src/scenes/PauseScene.ts`, `src/scenes/DeathScene.ts`, `README.md`, `LICENSES.md`, `docs/superpowers/specs/2026-10-28-visual-overhaul-design.md`（勾选批准项）
- Test: 全量回归

**Interfaces:**
- Consumes: Task 8 的 `panel.ts`、`makeText`、`FONT_SIZE`

- [ ] **Step 1: Rebuild pause and death panels**

- 暂停：360×260 居中；24px 标题；4 个 200×32 按钮（继续/保存/导出/导入）；底部 12px 说明。
- 死亡：420×240 居中；24px 标题；两行 12px 说明；200×36 按钮“第二天清晨醒来”；红色 vignette。
- 两个场景都使用统一面板组件与字体，不再用 `monospace`。

- [ ] **Step 2: Update licenses and README**

- `LICENSES.md`：Kenney Tiny Town/Dungeon/Farm/Battle、UI Pack Pixel Adventure（CC0 1.0，下载日期）、Fusion Pixel 12px（OFL-1.1）。
- `README.md`：新增 `M 地图`、`I 背包`、整数缩放说明、岛屿规模 10000×6000。

- [ ] **Step 3: Run the full verification**

Run: `npm.cmd run test && npm.cmd run typecheck && npm.cmd run lint && npm.cmd run build`
Expected: 全部通过；构建成功（chunk 警告可接受）。

- [ ] **Step 4: Screenshot acceptance**

用 `npm.cmd run dev` 启动，headless Chrome 生成 1920×1080 截图：

```bash
chrome --headless=new --disable-gpu --window-size=1920,1080 \
  --virtual-time-budget=12000 --screenshot=shots/camp.png http://127.0.0.1:5173/AI_LBS/
```

逐张检查：白天营地、夜晚营地、背包、合成、建造、劳工、全岛地图、暂停、死亡。文字必须为 Fusion Pixel、无重叠、无分数缩放。

- [ ] **Step 5: Commit**

```bash
git add src README.md LICENSES.md docs
git commit -m "feat: finish pause/death panels and visual acceptance"
```

---

## 验收清单

- [ ] 1920×1080 = 3×，1366×768 = 2× + 黑边，无分数缩放。
- [ ] 无 `monospace`、无 `placeholder.png`、无 `makeTextures()` 矩形贴图。
- [ ] 世界 625×375 格；同种子同 `hash`。
- [ ] 7 个地标可达；出生点/营地/淡水泉满足距离规则。
- [ ] 区块 3×3 上限，切换无明显卡顿。
- [ ] 地图可开/关、迷雾、探索度、地标、路径点、缩放。
- [ ] 存档 v2 往返；v1 可迁移。
- [ ] HUD/面板 12px 正文、24px 标题，无重叠。
- [ ] 114+ 项测试通过；typecheck/lint/build 通过。
- [ ] 截图九张验收通过。
