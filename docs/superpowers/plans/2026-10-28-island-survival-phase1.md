# 阶段一：岛屿生存循环 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个可在 GitHub Pages 运行的单机像素生存游戏：手工小岛、昼夜与需求、采集合成、建造营地、周五入侵与捕获、劳工自动采集、本地存档。

**Architecture:** TypeScript + Phaser 3.90.0。`GameState` 是唯一可序列化真相；`src/systems/*` 尽量纯函数并被 Vitest 覆盖；`src/scenes/*` 只负责渲染、输入与把系统结果投影到精灵。数据表驱动内容，事件总线解耦系统。

**Tech Stack:** Node 22 LTS、Vite、TypeScript strict、Phaser 3.90.0、Vitest、ESLint、GitHub Actions + Pages。

**Spec:** `docs/superpowers/specs/2026-10-28-robinson-crusoe-survival-design.md`（阶段二装备/副本不在本计划内）

## Global Constraints

- TypeScript `strict: true`；`tsc --noEmit` 必须零错误；ESLint 零 error；`vitest run` 全绿。
- Phaser 锁定 `3.90.0`；不引入 Phaser 4、React、后端或云存档。
- Vite `base: '/AI_LBS/'`；部署目标 GitHub Pages；提交 `package-lock.json`。
- 渲染：16px 瓦片，基准 640×360，相机 zoom 2，`pixelArt: true`、`roundPixels: true`。
- 时间：一游戏日 900 秒；06:00–18:00 用 600 秒，18:00–06:00 用 300 秒；第 1 天周一，第 5 天周五。
- 周五 17:00 预警、18:00 入侵；17:00 至次日 06:00 禁止睡觉与进入副本；入侵中禁止存档。
- 需求：HP 100；饱食 -0.05/秒、口渴 -0.08/秒、精力上限 100；归零每 2 秒 -1 HP。
- 背包 24 格、快捷栏 8 格、堆叠 99；营地 Lv1/2/3 囚犯上限 1/3/6；等级只升不降。
- 所有物品/建筑/节点用稳定字符串 ID；存档 key `robinson.save.v1`，备份 `robinson.save.v1.bak`。
- `src/core`、`src/data`、`src/systems` 不得 import Phaser，保证 Vitest 能在 Node 环境直接跑纯逻辑。
- 提交信息用 Conventional Commits（`feat:`/`test:`/`chore:`/`fix:`）；每个任务结束单独提交。
- 本计划不实现：装备品级/词条、鞋子、沉船副本、其他岛屿；但 `GameState` 保留 spec 的对应空字段。

## Review Focus

1. **跨周五边界的睡觉/大时间步长**：17:00 后睡觉必须被拒；一次 `advanceTime` 跨过 18:00 也必须触发入侵。→ Task 3 的 `rejects sleep after Friday 17:00`、`emits raid:started when dt crosses 18:00`。
2. **死亡惩罚边界**：只清背包与快捷栏，保留已穿戴装备；没有营火/帐篷时回出生点。→ Task 4 的 `death clears backpack but keeps equipped gear`、`respawns at wreck when no camp`。
3. **存档不可信输入**：损坏 JSON、版本不符、缺字段必须抛错并允许回退 `.bak`，不能静默开新档。→ Task 14 的 `rejects corrupt save and falls back to backup`。
4. **捕获前置条件**：非眩晕、囚笼满、藤蔓不足都必须拒绝且不消耗材料。→ Task 13 的 `rejects capture when cage full or no vine`。
5. **劳工口粮顺序**：无储物箱=没饭吃；鱼干>烤鱼>椰子>浆果；初始忠诚 1 时一次断粮即逃跑，忠诚 3 时需连续三天。→ Task 13 的 `consumes food in priority order`、`laborer with loyalty 1 flees after the first unfed dawn`、`no storage means no ration`。

---

### Task 1: 项目脚手架与质量门

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `eslint.config.js`, `vitest.config.ts`
- Create: `src/main.ts`, `src/core/config.ts`, `src/scenes/BootScene.ts`, `src/scenes/IslandScene.ts`
- Create: `.github/workflows/deploy.yml`
- Test: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev`、`npm run build`、`npm run test`、`npm run typecheck`、`npm run lint`；Phaser 配置常量 `GAME_CONFIG`（640×360、zoom 2、pixelArt）。

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/smoke.test.ts
import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from '../../src/core/config';

describe('bootstrap', () => {
  it('uses the pixel-art resolution from the spec', () => {
    expect(GAME_CONFIG.width).toBe(640);
    expect(GAME_CONFIG.height).toBe(360);
    expect(GAME_CONFIG.pixelArt).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- smoke`
Expected: FAIL，`Cannot find module '../../src/main'`（先写好 package.json 与空 src 也可接受）。

- [ ] **Step 3: Implement the scaffold**

`src/core/config.ts` 导出 `GAME_CONFIG`；`src/main.ts` 引入它并创建 `new Phaser.Game({...GAME_CONFIG, scene: [BootScene, IslandScene]})`。BootScene 暂只 `this.scene.start('IslandScene')`；IslandScene 显示居中文字"AI_LBS"。workflow 在 push 到 main 时执行 `npm ci && npm run build`，把 `dist` 发布到 Pages。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test && npm.cmd run typecheck && npm.cmd run lint && npm.cmd run build`
Expected: 全绿；`dist/index.html` 存在，资源路径以 `/AI_LBS/` 开头。

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html eslint.config.js vitest.config.ts src .github tests
git commit -m "chore: scaffold Vite + Phaser + Vitest project"
```

### Task 2: 核心状态、事件总线、随机数与配置

**Files:**
- Create: `src/core/gameState.ts`, `src/core/eventBus.ts`, `src/core/rng.ts`, `src/core/config.ts`
- Test: `tests/unit/gameState.test.ts`, `tests/unit/rng.test.ts`

**Interfaces:**
- Produces:
  - `createNewGame(seed?: number): GameState`
  - `class EventBus { on(event: string, cb: (p: any) => void): void; emit(event: string, p?: any): void }`
  - `createRng(seed: number): { next(): number; int(min: number, max: number): number; state(): number; restore(s: number): void }`
  - `CONFIG = { tileSize: 16, daySeconds: 900, daySegmentSeconds: 600, nightSegmentSeconds: 300, startClockMin: 360, raidHour: 18, warnHour: 17, campRadiusTiles: 12, inventorySlots: 24, hotbarSlots: 8, stackMax: 99 }`
  - 类型 `GameState/ItemStack/EquipInstance/BuildingInstance/LaborerState`（字段同 spec 15.2；`ItemStack` 增加 `durability?: number` 用于工具）。`GameState` 额外包含 `raid: { active: boolean; day: number } | null`（初始 null）、`world.wreckSpawn: {x,y}`（默认出生点）、`world.groundLoot: ItemStack[]`（初始空）。

- [ ] **Step 1: Write the failing test**

```ts
it('new game starts on Monday day 1 at 06:00 on the beach', () => {
  const s = createNewGame(123);
  expect(s.time).toEqual({ day: 1, clockMin: 360, phase: 'day' });
  expect(s.camp.level).toBe(0);
  expect(s.inventory).toHaveLength(0);
  expect(s.player.hp).toBe(100);
});

it('same seed reproduces the same sequence', () => {
  const a = createRng(42), b = createRng(42);
  expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- gameState rng`
Expected: FAIL，模块不存在。

- [ ] **Step 3: Implement core modules**

`createNewGame` 返回 spec 的 SaveV1 结构：`scene:'island'`、`dungeonFloor:null`、装备三槽为 null、`equipmentInstances:[]`、`dungeon:{openedChestsThisWeek:[],clearedThisWeek:false,firstClearDone:false,resetDay:1}`。RNG 用 mulberry32；`createNewGame` 若不传 seed 用 `Date.now()` 并写入 `rngState`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- gameState rng`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/core tests/unit/gameState.test.ts tests/unit/rng.test.ts
git commit -m "feat: add serializable game state, event bus and seeded rng"
```

### Task 3: 时间系统（昼夜、星期、周五锁定、睡觉）

**Files:**
- Create: `src/systems/timeSystem.ts`
- Test: `tests/unit/timeSystem.test.ts`

**Interfaces:**
- Consumes: `GameState`, `EventBus`, `CONFIG`（Task 2）。
- Produces:
  - `advanceTime(state: GameState, dtSec: number, bus: EventBus): void`
  - `getWeekday(day: number): 1|2|3|4|5|6|7`
  - `isRaidLock(state: GameState): boolean`（周五 17:00–次日 06:00）
  - `canSleep(state: GameState): { ok: boolean; reason?: string }`
  - `sleep(state: GameState, bus: EventBus): void`
  - 事件：`time:dayChanged`、`raid:warning`、`raid:started`、`dungeon:weekReset`、`save:requested`。

- [ ] **Step 1: Write the failing test**

```ts
it('maps day 1 to Monday and day 5 to Friday', () => {
  expect(getWeekday(1)).toBe(1);
  expect(getWeekday(5)).toBe(5);
  expect(getWeekday(8)).toBe(1);
});

it('rejects sleep after Friday 17:00', () => {
  const s = createNewGame(1);
  s.buildings.push({ id: 'tent', type: 'tent', x: 0, y: 0, hp: 80 });
  s.time = { day: 5, clockMin: 17 * 60, phase: 'day' };
  expect(canSleep(s).ok).toBe(false);
});

it('rejects sleep without a tent', () => {
  const s = createNewGame(1);
  expect(canSleep(s).ok).toBe(false);
});

it('emits raid:started when dt crosses 18:00', () => {
  const s = createNewGame(1);
  s.time = { day: 5, clockMin: 17 * 60 + 59, phase: 'day' };
  const bus = new EventBus();
  const seen: string[] = [];
  bus.on('raid:started', () => seen.push('raid'));
  advanceTime(s, 120, bus); // 跨过 18:00
  expect(seen).toContain('raid');
});

it('sleep advances to next day 06:00 and emits dayChanged', () => {
  const s = createNewGame(1);
  s.buildings.push({ id: 'tent', type: 'tent', x: 0, y: 0, hp: 80 });
  const bus = new EventBus();
  let days = 0;
  bus.on('time:dayChanged', () => days++);
  sleep(s, bus);
  expect(s.time).toEqual({ day: 2, clockMin: 360, phase: 'day' });
  expect(days).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- timeSystem`
Expected: FAIL，模块不存在。

- [ ] **Step 3: Implement `timeSystem.ts`**

白天速率 1.2 游戏分钟/现实秒，夜晚 2.4；按小时边界切片推进，保证跨 17:00/18:00/06:00 不丢事件。06:00 依次发出 `time:dayChanged` →（周一）`dungeon:weekReset` → `save:requested`。`canSleep` 在没有帐篷、`isRaidLock` 或 `state.raid?.active` 时返回 false。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- timeSystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/systems/timeSystem.ts tests/unit/timeSystem.test.ts
git commit -m "feat: add day/night clock, Friday raid schedule and sleep"
```

### Task 4: 需求、死亡与重生

**Files:**
- Create: `src/systems/needsSystem.ts`
- Test: `tests/unit/needsSystem.test.ts`

**Interfaces:**
- Consumes: `GameState`, `EventBus`, `advanceTime` 的 `time:dayChanged`（Task 3）。
- Produces:
  - `tickNeeds(state: GameState, dtSec: number): void`
  - `consumeFood(state: GameState, baseId: string): boolean`
  - `drinkFreshWater(state: GameState): void`
  - `applyDamage(state: GameState, amount: number): void`
  - `respawnAfterDeath(state: GameState, bus: EventBus): void`
  - 食物效果表：`coconut {hunger:10,thirst:15}`、`berries {hunger:8}`、`cooked_fish {hunger:35}`、`dried_fish {hunger:25}`、`bandage {healOverSec:8,heal:30}`。

- [ ] **Step 1: Write the failing test**

```ts
it('drains hunger and thirst at spec rates', () => {
  const s = createNewGame(1);
  tickNeeds(s, 100);
  expect(s.player.hunger).toBeCloseTo(95);
  expect(s.player.thirst).toBeCloseTo(92);
});

it('death clears backpack but keeps equipped gear', () => {
  const s = createNewGame(1);
  s.inventory = [{ baseId: 'wood', count: 5 }];
  s.hotbar[0] = 'stone_axe';
  s.equipment.weapon = 'eq_1';
  s.equipmentInstances = [{ instanceId: 'eq_1', baseId: 'club', slot: 'weapon', rarity: 'common', affixes: [], durability: 10, maxDurability: 10 }];
  s.player.hp = 0;
  respawnAfterDeath(s, new EventBus());
  expect(s.inventory).toHaveLength(0);
  expect(s.hotbar.every((x) => x === null)).toBe(true);
  expect(s.equipment.weapon).toBe('eq_1');
  expect(s.player.hp).toBe(50);
  expect(s.time.clockMin).toBe(360);
});

it('respawns at wreck when no camp', () => {
  const s = createNewGame(1);
  respawnAfterDeath(s, new EventBus());
  expect(s.player.x).toBe(s.world.wreckSpawn.x);
  expect(s.player.y).toBe(s.world.wreckSpawn.y);
});
```

（`world.wreckSpawn` 已在 Task 2 定义，由 Task 6 的地图对象层写入准确坐标；此处测试直接赋值也可。）

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- needsSystem`
Expected: FAIL。

- [ ] **Step 3: Implement `needsSystem.ts`**

精力消耗接口 `spendEnergy(state, amount): boolean` 一并导出（砍树 5、挖矿 6、采集 1、建造 10）。HP 归零只设置死亡标记，由场景调用 `respawnAfterDeath`；重生时若存在营火/帐篷用其坐标，否则用 `world.wreckSpawn`，并把时间推进到次日 06:00。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- needsSystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/systems/needsSystem.ts src/core/gameState.ts tests/unit/needsSystem.test.ts
git commit -m "feat: add hunger thirst energy and death respawn rules"
```

### Task 5: 物品数据与背包

**Files:**
- Create: `src/data/items.ts`, `src/systems/inventorySystem.ts`
- Test: `tests/unit/inventorySystem.test.ts`

**Interfaces:**
- Produces:
  - `ITEMS: Record<string, ItemDef>`（`kind: 'material'|'food'|'tool'|'weapon'|'consumable'`；工具含 `maxDurability`）
  - `addItem(state, baseId, count): { added: number; leftover: number }`
  - `removeItem(state, baseId, count): boolean`
  - `countItem(state, baseId): number`
  - `addTool(state, baseId): boolean`（写入 `durability = maxDurability`，count 固定 1）
  - `damageTool(state, baseId, amount = 1): void`（归零删除并返回提示事件）
- 首版 ID：`wood stone flint vine clay cloth shell coconut berries raw_fish cooked_fish dried_fish stick rope torch bandage stone_axe stone_pick club spear`。

- [ ] **Step 1: Write the failing test**

```ts
it('stacks up to 99 then opens a new slot', () => {
  const s = createNewGame(1);
  addItem(s, 'wood', 120);
  expect(s.inventory.filter((i) => i.baseId === 'wood').map((i) => i.count)).toEqual([99, 21]);
});

it('refuses pickup when all 24 slots are full', () => {
  const s = createNewGame(1);
  for (let i = 0; i < 24; i++) addItem(s, `item_${i}`, 1);
  expect(addItem(s, 'wood', 1)).toEqual({ added: 0, leftover: 1 });
});

it('tool loses durability and disappears at zero', () => {
  const s = createNewGame(1);
  addTool(s, 'stone_axe');
  damageTool(s, 'stone_axe', 60);
  expect(countItem(s, 'stone_axe')).toBe(0);
});
```

（测试用的 `item_${i}` 需在 ITEMS 中注册为通用材料，或改用 24 个真实 ID 加 `makeTestItem` 工厂。）

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- inventorySystem`
Expected: FAIL。

- [ ] **Step 3: Implement items and inventory**

先填满同类堆叠再开新格；`addItem` 返回实际入包数量；`removeItem` 不足时返回 false 且不改动。`damageTool` 只作用于带 `durability` 的堆叠。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- inventorySystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/data/items.ts src/systems/inventorySystem.ts tests/unit/inventorySystem.test.ts
git commit -m "feat: add item data, stacked inventory and tool durability"
```

### Task 6: 占位岛地图、玩家移动、相机与 2.5D 遮挡

**Files:**
- Create: `scripts/generate-island-map.mjs`, `public/assets/maps/island.tmj`, `public/assets/tiles/placeholder.png`
- Create: `src/world/terrain.ts`, `src/world/depthSort.ts`, `src/entities/player.ts`, `src/scenes/IslandScene.ts`
- Test: `tests/unit/terrain.test.ts`

**Interfaces:**
- Produces:
  - `terrainSpeedAt(tileId: number): number`（草地 1.0、沙滩 0.9、树林 0.85、浅水 0.6、深水 0）
  - `depthFor(y: number): number`（返回 y）
  - `PlayerEntity.setVelocityFromInput(input: {x:number,y:number}, speed: number): void`
  - 地图对象层名称：`spawn_wreck`、`camp_center`、`node_*`、`chest_wreck`、`chest_cave`、`dungeon_entrance`。
- Consumes: `CONFIG`、`GameState`（Task 2）。

- [ ] **Step 1: Write the failing test**

```ts
it('applies terrain speed multipliers', () => {
  expect(terrainSpeedAt(TILE.grass)).toBe(1);
  expect(terrainSpeedAt(TILE.sand)).toBe(0.9);
  expect(terrainSpeedAt(TILE.shallowWater)).toBe(0.6);
  expect(terrainSpeedAt(TILE.deepWater)).toBe(0);
});

it('sorts depth by feet y', () => {
  expect(depthFor(120)).toBeLessThan(depthFor(121));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- terrain`
Expected: FAIL。

- [ ] **Step 3: Implement map and movement**

用 `scripts/generate-island-map.mjs` 生成 96×96 占位岛（西沙滩出生点、中央营地、东沙滩副本入口、树林/岩石/溪流/潮池），后续可在 Tiled 精修；稳定 ID 用 `tree_001` 这类格式。Arcade 物理碰撞用 collision 图层；基础移速 90 px/s，Shift ×1.5；每帧设置玩家/树冠/建筑 depth。树冠单独精灵，depth = 树底 y + 8。夜晚叠加冷色暗化，玩家周围保留暖色光照半径。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- terrain && npm.cmd run build`
Expected: PASS；`npm run dev` 中 WASD 可走动、被深水阻挡、走到树后被树冠遮住。

- [ ] **Step 5: Commit**

```bash
git add scripts public src/world src/entities/player.ts src/scenes/IslandScene.ts tests/unit/terrain.test.ts
git commit -m "feat: add placeholder island, player movement and y-sort occlusion"
```

### Task 7: 资源节点、再生与唯一宝箱

**Files:**
- Create: `src/data/spawns.ts`, `src/entities/resourceNode.ts`, `src/systems/resourceSystem.ts`
- Test: `tests/unit/resourceSystem.test.ts`

**Interfaces:**
- Consumes: `addItem`、`countItem`（Task 5），`time:dayChanged`（Task 3），地图 `node_*` 对象（Task 6）。
- Produces:
  - `RESOURCE_NODES: Record<string, ResourceNodeDef>`（树 4 次/3 日、岩石 4 次/5 日、藤蔓 2 次/2 日、灌木 2 次/2 日、椰子树 2 次/2 日、潮池 1 次/1 日、黏土坑 3 次/3 日）
  - `gatherNode(state, nodeId, rng): { items: ItemStack[]; depleted: boolean }`
  - `respawnNodes(state): void`
  - `openUniqueChest(state, chestId): ItemStack[] | null`
  - `gatherChannelMs(baseMs: number, hasTool: boolean): number`（无对应工具 ×3）
  - `tickTorchFuel(state: GameState, dtSec: number): void`（点燃的火把每秒 -1 燃料，180 秒耗尽熄灭）

- [ ] **Step 1: Write the failing test**

```ts
it('depletes a tree after four hits and respawns after three days', () => {
  const s = createNewGame(7);
  for (let i = 0; i < 4; i++) gatherNode(s, 'tree_001', createRng(7));
  expect(s.world.nodeStates['tree_001'].remaining).toBe(0);
  s.time.day = 4;
  respawnNodes(s);
  expect(s.world.nodeStates['tree_001'].remaining).toBe(4);
});

it('unique chest can only be opened once', () => {
  const s = createNewGame(1);
  expect(openUniqueChest(s, 'chest_wreck')).not.toBeNull();
  expect(openUniqueChest(s, 'chest_wreck')).toBeNull();
});

it('tide pool can yield shell with seeded rng', () => {
  const s = createNewGame(1);
  const result = gatherNode(s, 'tide_001', createRng(3));
  expect(result.items.every((i) => ['raw_fish', 'shell'].includes(i.baseId))).toBe(true);
});

it('torch burns out after 180 seconds', () => {
  const s = createNewGame(1);
  addTool(s, 'torch');
  tickTorchFuel(s, 180);
  expect(countItem(s, 'torch')).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- resourceSystem`
Expected: FAIL。

- [ ] **Step 3: Implement resource system and node entity**

产量：树木头 3–5、岩石石头 2–3 + 30% 燧石、藤蔓 2、浆果 2–3、椰子 1、潮池生鱼 1 + 50% 贝壳、黏土 2。节点耗尽写入 `respawnDay = day + respawnDays`；`respawnNodes` 在 06:00 把 `respawnDay <= day` 的节点恢复满耐久并播放再生表现。`gatherNode` 遇到未初始化的节点时先按 `RESOURCE_NODES` 默认值写入 `nodeStates`。破船箱给布 4 + 绷带 2；山洞箱给燧石 5 + 布 2，需点燃火把。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- resourceSystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/data/spawns.ts src/entities/resourceNode.ts src/systems/resourceSystem.ts tests/unit/resourceSystem.test.ts
git commit -m "feat: add destructible resource nodes, respawn and unique chests"
```

### Task 8: 合成与工具耐久消耗

**Files:**
- Create: `src/data/recipes.ts`, `src/systems/craftingSystem.ts`
- Test: `tests/unit/craftingSystem.test.ts`

**Interfaces:**
- Consumes: `addItem/removeItem/countItem/addTool`（Task 5），营地等级（Task 10 的 `state.camp.level`，先用字段）。
- Produces:
  - `RECIPES: Recipe[]`（spec 7.3 核心配方；`station: 'hand'|'workbench'|'campfire'|'dryingRack'`）
  - `canCraft(state, recipeId, nearStation): { ok: boolean; reason?: string }`
  - `craft(state, recipeId, nearStation): boolean`（扣料并产出；工具走 `addTool`）
  - `craftDurationSec(recipeId): number`
- 关键成本：木棒 木2+绳1；石斧 木2+石3；石镐 木2+石4；石矛 木3+石2+绳1；火把 木1+藤1；烤鱼 生鱼1；绷带 布1。

- [ ] **Step 1: Write the failing test**

```ts
it('crafts a stone axe and consumes exact materials', () => {
  const s = createNewGame(1);
  s.camp.level = 1;
  addItem(s, 'wood', 2); addItem(s, 'stone', 3);
  expect(craft(s, 'stone_axe', true)).toBe(true);
  expect(countItem(s, 'wood')).toBe(0);
  expect(countItem(s, 'stone_axe')).toBe(1);
});

it('rejects recipe locked above camp level', () => {
  const s = createNewGame(1);
  addItem(s, 'wood', 10); addItem(s, 'stone', 10);
  expect(canCraft(s, 'stone_axe', true).ok).toBe(false);
});

it('rejects workbench recipe when not near station', () => {
  const s = createNewGame(1);
  s.camp.level = 1;
  addItem(s, 'wood', 2); addItem(s, 'stone', 3);
  expect(canCraft(s, 'stone_axe', false).ok).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- craftingSystem`
Expected: FAIL。

- [ ] **Step 3: Implement crafting**

`canCraft` 依次校验解锁等级、站点、材料；`craft` 只在全部通过后一次性扣料产出，失败不产生部分扣除。配方 `unlockLevel` 默认 0，石斧/石镐/石矛/帐篷为 1，护甲/晾肉架为 2，帆布衣为 3。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- craftingSystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/data/recipes.ts src/systems/craftingSystem.ts tests/unit/craftingSystem.test.ts
git commit -m "feat: add data-driven crafting stations and recipes"
```

### Task 9: 建筑放置、拆除与耐久

**Files:**
- Create: `src/data/buildings.ts`, `src/systems/buildingSystem.ts`, `src/entities/building.ts`
- Test: `tests/unit/buildingSystem.test.ts`

**Interfaces:**
- Consumes: `removeItem/addItem`（Task 5），地图 `camp_center` 与碰撞层（Task 6）。
- Produces:
  - `BUILDINGS: Record<string, BuildingDef>`（ID：`campfire workbench cage tent storage fence stone_wall drying_rack`；成本/耐久同 spec 8.2；营火 100、工作台 80、囚笼 120、帐篷 80、储物箱 80、栅栏 60、石墙 200、晾肉架 60）
  - `canPlace(state, type, tileX, tileY): { ok: boolean; reason?: string }`
  - `placeBuilding(state, type, tileX, tileY): BuildingInstance | null`
  - `demolishBuilding(state, id): void`（返还 50%）
  - `damageBuilding(state, id, amount): void`（储物箱被毁掉落内容）
  - `getStorage(state): BuildingInstance | null`

- [ ] **Step 1: Write the failing test**

```ts
it('places campfire inside camp radius and spends materials', () => {
  const s = createNewGame(1);
  addItem(s, 'wood', 10); addItem(s, 'stone', 8);
  const b = placeBuilding(s, 'campfire', 48, 48);
  expect(b).not.toBeNull();
  expect(countItem(s, 'wood')).toBe(0);
});

it('rejects placement outside camp radius', () => {
  const s = createNewGame(1);
  addItem(s, 'wood', 10); addItem(s, 'stone', 8);
  expect(canPlace(s, 'campfire', 5, 5).ok).toBe(false);
});

it('destroyed storage spills its contents', () => {
  const s = createNewGame(1);
  addItem(s, 'wood', 15); addItem(s, 'vine', 4);
  const box = placeBuilding(s, 'storage', 48, 48)!;
  box.storage = [{ baseId: 'cooked_fish', count: 3 }];
  damageBuilding(s, box.id, 999);
  expect(s.buildings.find((b) => b.id === box.id)).toBeUndefined();
  expect(s.world.groundLoot.some((g) => g.baseId === 'cooked_fish')).toBe(true);
});
```

（`world.groundLoot` 已在 Task 2 定义；地图 `camp_center` 默认 48,48。）

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- buildingSystem`
Expected: FAIL。

- [ ] **Step 3: Implement building system and ghost preview**

放置校验：营地 12 格内、不压水/资源点/建筑/敌人。`placeBuilding` 扣料并生成 `BuildingInstance`；场景负责蓝图绿/红与 2–5 秒施工表现，受击中断退 50%。`damageBuilding` 归零时移除；储物箱把 `storage` 写入 `world.groundLoot`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- buildingSystem && npm.cmd run build`
Expected: PASS；dev 中 `B` 可放营火，红绿提示正确。

- [ ] **Step 5: Commit**

```bash
git add src/data/buildings.ts src/systems/buildingSystem.ts src/entities/building.ts src/core/gameState.ts tests/unit/buildingSystem.test.ts
git commit -m "feat: add building placement, demolition and destructible storage"
```

### Task 10: 营地等级与目标清单

**Files:**
- Create: `src/data/campLevels.ts`, `src/systems/campSystem.ts`
- Test: `tests/unit/campSystem.test.ts`

**Interfaces:**
- Consumes: `state.buildings`（Task 9）。
- Produces:
  - `CAMP_LEVELS: CampLevelDef[]`（Lv1 营火+工作台+囚笼→上限 1；Lv2 帐篷+储物箱+栅栏×8→上限 3；Lv3 石墙×12+晾肉架→上限 6）
  - `checkCampUpgrade(state, bus): 0|1|2|3`（只升不降，升级发 `camp:levelUp` 与 `save:requested`）
  - `getCampChecklist(state): { label: string; have: number; need: number; done: boolean }[]`
  - `getCaptiveCap(state): number`

- [ ] **Step 1: Write the failing test**

```ts
it('upgrades to lv1 with campfire workbench and cage', () => {
  const s = createNewGame(1);
  for (const type of ['campfire', 'workbench', 'cage']) {
    s.buildings.push({ id: type, type, x: 0, y: 0, hp: 100 });
  }
  expect(checkCampUpgrade(s, new EventBus())).toBe(1);
  expect(getCaptiveCap(s)).toBe(1);
});

it('never downgrades when a building is demolished', () => {
  const s = createNewGame(1);
  s.camp.level = 2;
  s.buildings = [];
  expect(checkCampUpgrade(s, new EventBus())).toBe(2);
});

it('reports partial fence progress', () => {
  const s = createNewGame(1);
  s.camp.level = 1;
  s.buildings = Array.from({ length: 3 }, (_, i) => ({ id: `f${i}`, type: 'fence', x: 0, y: 0, hp: 60 }));
  const row = getCampChecklist(s).find((r) => r.label.includes('木栅栏'));
  expect(row).toMatchObject({ have: 3, need: 8, done: false });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- campSystem`
Expected: FAIL。

- [ ] **Step 3: Implement camp system**

`checkCampUpgrade` 从当前等级 +1 开始逐级检查；满足即写入 `state.camp.level`，可连升但通常只升一级。清单永远显示"下一级"的需求，Lv3 时显示"营地已满级"。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- campSystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/data/campLevels.ts src/systems/campSystem.ts tests/unit/campSystem.test.ts
git commit -m "feat: add camp levels, captive caps and upgrade checklist"
```

### Task 11: 武器数据与战斗判定（含眩晕）

**Files:**
- Create: `src/data/weapons.ts`, `src/systems/combatSystem.ts`, `src/entities/savage.ts`
- Test: `tests/unit/combatSystem.test.ts`

**Interfaces:**
- Produces:
  - `WEAPONS: Record<string, WeaponDef>`（数值同 spec 9.2；拳头 arc 24px/60°/伤4/晕12/0.45s，木棒 arc 36px/90°/伤8/晕20/0.65s，石矛 thrust 52px 宽14/伤14/晕6/0.8s）
  - `computeHitTargets(origin: {x:number;y:number;angle:number}, pattern: AttackPattern, targets: {id:string;x:number;y:number}[]): string[]`
  - `applyHitToSavage(savage: SavageState, weapon: WeaponDef, dtSec: number): 'hit'|'stunned'|'dead'`
  - `tickSavageStun(savage: SavageState, dtSec: number): void`（脱战 5 秒后眩晕值 -10/秒；满 100 眩晕 8 秒）
- 预留 `projectile` 类型但不实现弹道。

- [ ] **Step 1: Write the failing test**

```ts
it('arc hits targets inside angle but not behind', () => {
  const pattern = WEAPONS.club.pattern;
  const targets = [
    { id: 'front', x: 20, y: 0 },
    { id: 'back', x: -20, y: 0 },
  ];
  expect(computeHitTargets({ x: 0, y: 0, angle: 0 }, pattern, targets)).toEqual(['front']);
});

it('thrust hits multiple targets in a line', () => {
  const targets = [{ id: 'a', x: 20, y: 0 }, { id: 'b', x: 40, y: 0 }, { id: 'c', x: 20, y: 40 }];
  expect(computeHitTargets({ x: 0, y: 0, angle: 0 }, WEAPONS.spear.pattern, targets)).toEqual(['a', 'b']);
});

it('club stuns before it kills, spear kills before stun', () => {
  const make = () => ({ id: 's', x: 0, y: 0, hp: 60, stun: 0, stunnedUntil: null, lastHitAgo: 0, mode: 'attack' as const });
  const a = make();
  for (let i = 0; i < 5; i++) applyHitToSavage(a, WEAPONS.club, 1);
  expect(a.hp).toBe(20);
  expect(a.stunnedUntil).not.toBeNull();

  const b = make();
  for (let i = 0; i < 5; i++) applyHitToSavage(b, WEAPONS.spear, 1);
  expect(b.hp).toBeLessThanOrEqual(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- combatSystem`
Expected: FAIL。

- [ ] **Step 3: Implement combat geometry and stun**

`computeHitTargets` 只做几何：arc 用距离 + 角度差，thrust 用朝向矩形，combo 复用 arc 但由场景按 3 段调用。每次挥击在场景里维护命中集合去重。`applyHitToSavage` 先扣 HP 再加眩晕；HP≤0 标死；眩晕值≥100 且未死时 `stunnedUntil = now + 8`。场景接线：鼠标左键挥击、朝向鼠标、攻击期间移速 ×0.4，攻击不伤害己方建筑与劳工。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- combatSystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/data/weapons.ts src/systems/combatSystem.ts src/entities/savage.ts tests/unit/combatSystem.test.ts
git commit -m "feat: add arc thrust combo hit detection and savage stun meter"
```

### Task 12: 周五入侵、野人 AI 与寻路

**Files:**
- Create: `src/world/pathfinding.ts`, `src/data/raidWaves.ts`, `src/systems/raidSystem.ts`
- Test: `tests/unit/pathfinding.test.ts`, `tests/unit/raidSystem.test.ts`

**Interfaces:**
- Consumes: `raid:started`（Task 3）、`computeHitTargets/applyHitToSavage`（Task 11）、`damageBuilding/getStorage`（Task 9）、营地等级（Task 10）。
- Produces:
  - `findPath(grid: number[][], start: {x:number;y:number}, end: {x:number;y:number}): {x:number;y:number}[]`（A*，0 可走 1 阻挡）
  - `spawnRaid(state): SavageState[]`（Lv0/Lv1=2、Lv2=3、Lv3=4；东侧沙滩登陆点）
  - `updateSavageAi(state, savage, dtSec): void`（有墙优先拆墙，伤害 20/次；否则冲玩家/储物箱）
  - `resolveRaidDawn(state): { foodLost: number; damagedBuildingId?: string }`
  - 写入 `state.raid: { active: boolean; day: number } | null`（字段已在 Task 2 定义）

- [ ] **Step 1: Write the failing test**

```ts
it('finds a path around a wall', () => {
  const grid = [[0,0,0],[1,1,0],[0,0,0]];
  const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
  expect(path.at(-1)).toEqual({ x: 2, y: 0 });
  expect(path.length).toBeGreaterThan(3);
});

it('spawns two savages at lv1 and four at lv3', () => {
  const s = createNewGame(1);
  s.camp.level = 1;
  expect(spawnRaid(s)).toHaveLength(2);
  s.camp.level = 3;
  expect(spawnRaid(s)).toHaveLength(4);
});

it('dawn takes five food per survivor and damages a building when food is short', () => {
  const s = createNewGame(1);
  const box = { id: 'box', type: 'storage', x: 0, y: 0, hp: 80, storage: [{ baseId: 'cooked_fish', count: 3 }] };
  s.buildings.push(box as any);
  const result = resolveRaidDawnWith(s, 1);
  expect(result.foodLost).toBe(3);
  expect(result.damagedBuildingId).toBe('box');
});
```

（`resolveRaidDawnWith(state, survivorCount)` 为便于测试的内部函数，`resolveRaidDawn` 用存活野人数调用它。）

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- pathfinding raidSystem`
Expected: FAIL。

- [ ] **Step 3: Implement raid and AI**

`raid:started` 时 `spawnRaid`，每秒或目标变化时用 `findPath` 重算；建筑 20 伤害/次，储物箱 80 HP。06:00 先 `resolveRaidDawn` 再允许 `save:requested`。每名存活野人优先拿 5 份食物，不足则随机可破坏建筑（栅栏/石墙/储物箱/晾肉架）耐久 -30。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- pathfinding raidSystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/world/pathfinding.ts src/data/raidWaves.ts src/systems/raidSystem.ts tests/unit/pathfinding.test.ts tests/unit/raidSystem.test.ts
git commit -m "feat: add Friday raid waves, savage ai and dawn settlement"
```

### Task 13: 捕获与劳工（口粮、忠诚、逃跑）

**Files:**
- Create: `src/systems/captureSystem.ts`, `src/systems/laborSystem.ts`, `src/entities/laborer.ts`
- Test: `tests/unit/captureSystem.test.ts`, `tests/unit/laborSystem.test.ts`

**Interfaces:**
- Consumes: `SavageState.stunnedUntil`（Task 11）、`getCaptiveCap`（Task 10）、`removeItem/addItem`（Task 5）、`getStorage`（Task 9）、`time:dayChanged`（Task 3）。
- Produces:
  - `canCapture(state, savage): { ok: boolean; reason?: string }`
  - `captureSavage(state, savageId): LaborerState | null`（消耗藤蔓 1，2 秒引导由场景处理；首位劳工命名"星期五"）
  - `assignLaborer(state, laborerId, nodeType, x, y): void`
  - `tickLabor(state, dtSec): void`（4 秒 1 份、容量 10、卸货到储物箱或营火旁 `groundLoot`）
  - `settleLaborRations(state): { fed: string[]; fled: string[] }`（优先级 鱼干>烤鱼>椰子>浆果；无储物箱=断粮；初始忠诚 1）

- [ ] **Step 1: Write the failing test**

```ts
it('rejects capture when cage full or no vine', () => {
  const s = createNewGame(1);
  s.camp.level = 1;
  const savage = { id: 's1', x: 0, y: 0, hp: 20, stun: 100, stunnedUntil: 8, lastHitAgo: 0, mode: 'stunned' as const };
  addItem(s, 'vine', 1);
  s.laborers.push({ id: 'l1', name: '星期五', x: 0, y: 0, loyalty: 1, task: null, carrying: 0, carryingType: null });
  expect(canCapture(s, savage).ok).toBe(false);

  s.laborers = [];
  s.inventory = [];
  expect(canCapture(s, savage).ok).toBe(false);
});

it('consumes food in priority order', () => {
  const s = createNewGame(1);
  s.laborers.push({ id: 'l1', name: '星期五', x: 0, y: 0, loyalty: 1, task: null, carrying: 0, carryingType: null });
  s.buildings.push({ id: 'box', type: 'storage', x: 0, y: 0, hp: 80, storage: [
    { baseId: 'berries', count: 2 }, { baseId: 'dried_fish', count: 1 }, { baseId: 'cooked_fish', count: 1 },
  ] });
  settleLaborRations(s);
  const box = s.buildings[0].storage!;
  expect(box.find((i) => i.baseId === 'dried_fish')).toBeUndefined();
  expect(box.find((i) => i.baseId === 'cooked_fish')?.count).toBe(1);
  expect(s.laborers[0].loyalty).toBe(2);
});

it('laborer with loyalty 1 flees after the first unfed dawn', () => {
  const s = createNewGame(1);
  s.laborers.push({ id: 'l1', name: '星期五', x: 0, y: 0, loyalty: 1, task: null, carrying: 0, carryingType: null });
  expect(settleLaborRations(s).fled).toEqual(['l1']);
  expect(s.laborers).toHaveLength(0);
});

it('no storage means no ration', () => {
  const s = createNewGame(1);
  s.laborers.push({ id: 'l1', name: '星期五', x: 0, y: 0, loyalty: 3, task: null, carrying: 0, carryingType: null });
  settleLaborRations(s);
  expect(s.laborers[0].loyalty).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- captureSystem laborSystem`
Expected: FAIL。

- [ ] **Step 3: Implement capture and labor**

`captureSavage` 只在 `canCapture` 通过时执行：藤蔓 -1、野人移除、新增劳工（忠诚 1）。劳工移动用 Task 12 的 `findPath`，采集目标为半径 8 格内最近同类节点，耗尽自动换；卸货优先储物箱，否则营火旁 `groundLoot`。06:00 在 `respawnNodes` 之后调用 `settleLaborRations`，并发 `labor:fled`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- captureSystem laborSystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/systems/captureSystem.ts src/systems/laborSystem.ts src/entities/laborer.ts tests/unit/captureSystem.test.ts tests/unit/laborSystem.test.ts
git commit -m "feat: add savage capture, labor assignment, rations and loyalty"
```

### Task 14: 存档、备份与导入导出

**Files:**
- Create: `src/systems/saveSystem.ts`
- Test: `tests/unit/saveSystem.test.ts`

**Interfaces:**
- Consumes: 全部 `GameState`（Tasks 2–13），`save:requested`（Task 3）。
- Produces:
  - `serializeSave(state: GameState): string`
  - `validateSave(data: unknown): GameState`（失败抛 `SaveError`）
  - `saveGame(state: GameState, storage?: Storage): void`（旧档进 `.bak`）
  - `loadGame(storage?: Storage): GameState | null`（主档坏则试备份；都没有返回 null）
  - `exportSave(state: GameState): void`、`importSave(json: string): GameState`
  - `canManualSave(state): boolean`（`state.raid?.active` 时 false）

- [ ] **Step 1: Write the failing test**

```ts
it('round-trips a populated state without losing fields', () => {
  const s = createNewGame(9);
  addItem(s, 'wood', 12);
  s.laborers.push({ id: 'l1', name: '星期五', x: 1, y: 2, loyalty: 2, task: null, carrying: 0, carryingType: null });
  const restored = validateSave(JSON.parse(serializeSave(s)));
  expect(restored).toEqual(s);
});

it('rejects corrupt save and falls back to backup', () => {
  const store = new MemoryStorage();
  store.setItem('robinson.save.v1', '{bad json');
  store.setItem('robinson.save.v1.bak', serializeSave(createNewGame(3)));
  const loaded = loadGame(store);
  expect(loaded).not.toBeNull();
  expect(loaded!.time.day).toBe(1);
});

it('rejects unknown save version', () => {
  expect(() => validateSave({ version: 99 })).toThrow(SaveError);
});

it('blocks manual save during raid', () => {
  const s = createNewGame(1);
  s.raid = { active: true, day: 5 };
  expect(canManualSave(s)).toBe(false);
});
```

（`MemoryStorage` 是测试内实现的 `Storage` 最小替身：`getItem/setItem/removeItem`。）

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- saveSystem`
Expected: FAIL。

- [ ] **Step 3: Implement save system**

`validateSave` 手写校验：`version===1`、必需字段存在、数值在范围内（HP/需求 0–100、`camp.level` 0–3）、数组类型正确、装备 `instanceId` 引用一致。`saveGame` 先把现有主档复制到 `.bak` 再写入。导入用同一 `validateSave`，通过后覆盖并重载。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- saveSystem`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/systems/saveSystem.ts tests/unit/saveSystem.test.ts
git commit -m "feat: add versioned local save, backup fallback and import export"
```

### Task 15: HUD、面板与新手引导

**Files:**
- Create: `src/scenes/UIScene.ts`, `src/scenes/PauseScene.ts`, `src/scenes/DeathScene.ts`
- Create: `src/ui/hud.ts`, `src/ui/inventoryPanel.ts`, `src/ui/craftPanel.ts`, `src/ui/buildMenu.ts`, `src/ui/laborPanel.ts`, `src/ui/format.ts`
- Test: `tests/unit/format.test.ts`

**Interfaces:**
- Consumes: `getCampChecklist`（Task 10）、`canCraft/craft`（Task 8）、`canPlace`（Task 9）、`canCapture`（Task 13）、`canManualSave/exportSave/importSave`（Task 14）。
- Produces:
  - `formatClock(clockMin: number): string`（`06:00`）
  - `formatDay(day: number): string`（`第 5 天 · 周五`）
  - `getInteractPrompt(state): string | null`
  - 场景键：`UIScene`、`PauseScene`、`DeathScene`

- [ ] **Step 1: Write the failing test**

```ts
it('formats clock and weekday in Chinese', () => {
  expect(formatClock(360)).toBe('06:00');
  expect(formatClock(18 * 60 + 5)).toBe('18:05');
  expect(formatDay(1)).toBe('第 1 天 · 周一');
  expect(formatDay(5)).toBe('第 5 天 · 周五');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- format`
Expected: FAIL。

- [ ] **Step 3: Implement UI**

HUD：左上日期/时钟/昼夜、四条需求、底部 8 格快捷栏（工具耐久条）、右上营地清单、中下交互提示与进度环；事件横幅覆盖周五预警、入侵、劳工逃跑。面板：`I` 背包、`C` 合成（手工/工作台/营火/晾肉架）、`B` 建造、`L` 劳工、`Esc` 暂停（存档/导出/导入/音量）。交互器统一处理采集/喝水/睡觉/开箱/捆绑，以及营火旁 `groundLoot` 的按 E 取回。DeathScene 显示"你失去了一切，但还活着"。第一天目标链：破船箱→木棍→营火→工作台→囚笼→准备周五。中文使用 Fusion Pixel，字体加载失败时用系统无衬线并记录警告。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test && npm.cmd run typecheck && npm.cmd run lint && npm.cmd run build`
Expected: 全绿；dev 中所有面板可开关，Esc 暂停时时间与需求停止。

- [ ] **Step 5: Commit**

```bash
git add src/scenes src/ui tests/unit/format.test.ts public/assets
git commit -m "feat: add HUD, crafting building labor panels and tutorial goals"
```

### Task 16: 集成验收与 Pages 发布

**Files:**
- Modify: `src/scenes/IslandScene.ts`, `src/scenes/BootScene.ts`
- Create: `README.md`, `LICENSES.md`
- Test: `tests/unit/dataIntegrity.test.ts`

**Interfaces:**
- Consumes: 全部系统。
- Produces: `validateGameData(): string[]`（返回错误列表，空数组为通过）；README 包含本地运行、操作表、存档位置。

- [ ] **Step 1: Write the failing test**

```ts
it('all data references are valid', () => {
  expect(validateGameData()).toEqual([]);
});
```

校验：配方输入/产物存在于 ITEMS；建筑成本引用存在；营地升级条件引用存在；配方 `unlockLevel` 不超过 3；营地等级与囚犯上限递增；资源节点产出引用存在。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- dataIntegrity`
Expected: FAIL（函数不存在，或故意制造一条坏引用确认测试有效）。

- [ ] **Step 3: Implement integration and data validation**

BootScene 顺序：加载资源 → `validateGameData` → `loadGame`（失败给"使用备份/新游戏"选项）→ 启动 Island/UIScene。IslandScene 每帧按固定步长调用 `advanceTime/tickNeeds/tickLabor/updateSavageAi`，并把 `save:requested` 接到 `saveGame`。补齐 LICENSES.md（贴图/字体/音频来源）。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test && npm.cmd run typecheck && npm.cmd run lint && npm.cmd run build`
Expected: 全绿。随后按 spec 16.3 的阶段一相关条目人工验收：完整过完一天、建造 Lv1、第 5 天捕获 1 人、劳工断粮逃跑、刷新后状态一致。

- [ ] **Step 5: Commit**

```bash
git add src tests README.md LICENSES.md
git commit -m "feat: integrate island survival loop and validate game data"
```

---

## 后续计划（不在本文档）

- 阶段二计划：装备三槽与品级/词条、鞋子移速、三层沉船副本、宝箱周重置与传说保底（对应 spec M6–M8）。
- 阶段三候选：其他岛屿/大陆、投射武器、天气与钓鱼（需重新 brainstorm）。
