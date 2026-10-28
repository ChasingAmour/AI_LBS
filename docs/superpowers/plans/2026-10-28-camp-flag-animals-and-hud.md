# 据点旗、野生动物与 HUD 收起 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让玩家自己插旗决定据点、岛上出现可猎杀的野生动物并产出肉类，同时修掉采集/精力/光源/食物数值/沉船入口/HUD 占地这些手感问题。

**Architecture:** 数据与纯逻辑先落在 `src/data` 与 `src/systems`（不依赖 Phaser，可直接单测），Phaser 场景只做渲染与输入接线；动物用与 `savages` 并列的独立 `state.animals` + 纯函数 AI；存档升到 v4 并保留 v1/v2/v3 迁移链。

**Tech Stack:** TypeScript 5.9、Phaser 3.90、Vite 6、Vitest 3、ESLint 9。

**Spec:** `docs/superpowers/specs/2026-10-28-camp-flag-and-balance-design.md`

## Global Constraints

- Node.js ≥ 22.8.0；`npm run test` / `typecheck` / `lint` / `build` 必须全部通过。
- 存档键名固定 `robinson.save.v1`；`SAVE_VERSION` 从 3 升到 4。
- `src/core` 不得 import Phaser；纯逻辑放 `systems/`、`data/`、`entities/`。
- 画面基准 640×360，相机 2× 缩放，可视区 320×180 世界像素。
- 同时存在的动物上限：小型 6 只、大型 3 只。
- 所有新增中文文案与现有风格一致（简短、无标点堆叠）。
- 提交信息沿用 `feat: ...` / `fix: ...` / `test: ...` 风格。

## Review Focus

1. **旧档（v1/v2/v3）读入**：迁移后必须能继续建造、教程不跳步、动物数组存在——否则老玩家一进游戏就卡死。
2. **没有旗子的状态**：建造、营地升级、入侵刷怪、地图全都要能跑，不能崩溃或无限刷野人。
3. **精力为 0 时连续采集/攻击/建造**：精力不能变负、引导不能卡住、提示不能重复刷屏。
4. **动物在玩家远离、入夜、读档时的生成与清理**：数量不能无限增长，动物不能隔着屏幕造成伤害。
5. **HUD 收起后读档/重开**：目标条位置不能重叠、箭头按钮不能失效、存档字段缺失时默认展开。

---

### Task 1: 物品数据——食物效果、光源、肉类与烹饪

**Files:**
- Modify: `src/data/items.ts`
- Modify: `src/data/recipes.ts`
- Modify: `src/systems/needsSystem.ts`（删除 `FOOD_EFFECTS`，`consumeFood` 改读数据）
- Modify: `src/systems/raidSystem.ts`（导出并扩展 `FOOD_PRIORITY`）
- Modify: `src/ui/format.ts`（新增 `foodEffectLines`）
- Modify: `src/ui/inventoryPanel.ts`（tooltip 追加效果行）
- Test: `tests/unit/items.test.ts`（新建）、`tests/unit/format.test.ts`、`tests/unit/needsSystem.test.ts`、`tests/unit/craftingSystem.test.ts`

**Interfaces:**
- Produces:
  - `export interface FoodEffect { hunger?: number; thirst?: number; heal?: number; healOverSec?: number }`
  - `export interface LightSpec { radius: number; brightness: number }`
  - `ItemDef.food?: FoodEffect`、`ItemDef.light?: LightSpec`
  - `export function foodEffectLines(baseId: string): string[]`
  - `export const FOOD_PRIORITY: string[]`（从 `raidSystem` 导出）
- 数值（写死，测试会断言）：椰子 `{hunger:10, thirst:15}`、浆果 `{hunger:8}`、烤鱼 `{hunger:35}`、鱼干 `{hunger:25}`、绷带 `{heal:30, healOverSec:8}`、烤肉 `{hunger:40}`、肉干 `{hunger:30}`、火把 `light: {radius:64, brightness:0.85}`。

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/items.test.ts
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../src/data/items';
import { foodEffectLines } from '../../src/ui/format';

describe('物品食物与光源数据', () => {
  it('椰子同时回饱食与口渴', () => {
    expect(ITEMS.coconut.food).toEqual({ hunger: 10, thirst: 15 });
  });
  it('烤肉与肉干是食物且生肉不是', () => {
    expect(ITEMS.cooked_meat.food).toEqual({ hunger: 40 });
    expect(ITEMS.dried_meat.food).toEqual({ hunger: 30 });
    expect(ITEMS.raw_meat.kind).toBe('material');
    expect(ITEMS.raw_meat.food).toBeUndefined();
  });
  it('火把带光源参数', () => {
    expect(ITEMS.torch.light).toEqual({ radius: 64, brightness: 0.85 });
  });
  it('tooltip 行只列非零项', () => {
    expect(foodEffectLines('coconut')).toEqual(['饱食 +10', '口渴 +15']);
    expect(foodEffectLines('bandage')).toEqual(['回复 30 生命（8 秒）']);
    expect(foodEffectLines('raw_meat')).toEqual([]);
  });
});
```

```ts
// tests/unit/format.test.ts 追加
it('foodEffectLines 对未知物品返回空数组', () => {
  expect(foodEffectLines('wood')).toEqual([]);
});
```

```ts
// tests/unit/needsSystem.test.ts 追加
it('consumeFood 按物品数据生效', () => {
  const state = createNewGame(1);
  state.inventory = [{ baseId: 'cooked_meat', count: 1 }];
  state.player.hunger = 50;
  expect(consumeFood(state, 'cooked_meat')).toBe(true);
  expect(state.player.hunger).toBe(90);
});
```

```ts
// tests/unit/craftingSystem.test.ts 追加
it('生肉可在篝火烤、在晾肉架做肉干', () => {
  expect(RECIPES.cooked_meat).toMatchObject({ station: 'campfire', output: 'cooked_meat', inputs: [{ baseId: 'raw_meat', count: 1 }] });
  expect(RECIPES.dried_meat).toMatchObject({ station: 'dryingRack', output: 'dried_meat', inputs: [{ baseId: 'raw_meat', count: 1 }] });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/items.test.ts tests/unit/format.test.ts tests/unit/needsSystem.test.ts tests/unit/craftingSystem.test.ts`
Expected: FAIL —— `foodEffectLines` 未导出、`cooked_meat` 未定义。

- [ ] **Step 3: 实现**

`src/data/items.ts`：加两个接口与可选字段；给 5 个既有食物/消耗品补 `food`；加 `raw_meat`（material，名「生肉」）、`cooked_meat`（food，名「烤肉」）、`dried_meat`（food，名「肉干」）；给 `torch` 加 `light`。

`src/data/recipes.ts`：加 `cooked_meat`（campfire，`durationSec: 2`）与 `dried_meat`（dryingRack，`durationSec: 900`），`unlockLevel: 0`。

`src/systems/needsSystem.ts`：删掉 `FOOD_EFFECTS` 常量，`consumeFood` 改为 `const effect = ITEMS[baseId]?.food`，其余分支保持不变（`heal`/`healOverSec` 走 `p.healing`）。

`src/ui/format.ts`：`foodEffectLines(baseId)` 读 `ITEMS[baseId]?.food`，按「饱食 +N」「口渴 +N」「回复 N 生命（M 秒）」生成，`heal` 无 `healOverSec` 时输出「回复 N 生命」。

`src/ui/inventoryPanel.ts`：`showStackTooltip` 里把 `foodEffectLines(baseId)` 追加到 `lines`。

`src/systems/raidSystem.ts`：`export const FOOD_PRIORITY = ['dried_meat', 'cooked_meat', 'dried_fish', 'cooked_fish', 'coconut', 'berries', 'raw_fish']`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/items.test.ts tests/unit/format.test.ts tests/unit/needsSystem.test.ts tests/unit/craftingSystem.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/data/items.ts src/data/recipes.ts src/systems/needsSystem.ts src/systems/raidSystem.ts src/ui/format.ts src/ui/inventoryPanel.ts tests/unit/items.test.ts tests/unit/format.test.ts tests/unit/needsSystem.test.ts tests/unit/craftingSystem.test.ts
git commit -m "feat: move food effects into item data and add meat recipes"
```

---

### Task 2: 资源密度与再生

**Files:**
- Modify: `src/world/nodes.ts`
- Modify: `src/data/spawns.ts`
- Test: `tests/unit/nodes.test.ts`、`tests/unit/resourceSystem.test.ts`

**Interfaces:**
- Produces: `generateNodes(island, seed)` 输出数量显著上升；`RESOURCE_NODES.tree.respawnDays === 1`、`rock === 2`。

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/nodes.test.ts 追加
it('森林里的树占绝大多数', () => {
  const island = generateIsland(12345);
  const nodes = generateNodes(island, 12345);
  const trees = nodes.filter((n) => n.type === 'tree').length;
  expect(trees).toBeGreaterThan(nodes.length * 0.45);
});

it('网格加密后节点总数上升', () => {
  const island = generateIsland(12345);
  expect(generateNodes(island, 12345).length).toBeGreaterThan(1500);
});
```

```ts
// tests/unit/resourceSystem.test.ts 修改
it('树一天后再生、岩石两天后再生', () => {
  const state = createNewGame(7);
  state.time.day = 1;
  state.world.nodeStates.tree_0_0_0 = { remaining: 0, respawnDay: 2 };
  state.world.nodeStates.rock_0_0_0 = { remaining: 0, respawnDay: 3 };
  state.time.day = 2;
  respawnNodes(state);
  expect(state.world.nodeStates.tree_0_0_0.remaining).toBe(RESOURCE_NODES.tree.maxHits);
  expect(state.world.nodeStates.rock_0_0_0.remaining).toBe(0);
  state.time.day = 3;
  respawnNodes(state);
  expect(state.world.nodeStates.rock_0_0_0.remaining).toBe(RESOURCE_NODES.rock.maxHits);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/nodes.test.ts tests/unit/resourceSystem.test.ts`
Expected: FAIL —— 节点数量不足、树第 2 天未再生。

- [ ] **Step 3: 实现**

`src/world/nodes.ts`：`STRIDE` 12 → 9；`pickType` 中森林改为 `roll < 0.85 ? 'tree' : roll < 0.95 ? 'vine' : 'berry'`；草地改为 `tree < 0.55`、`berry < 0.72`、`vine < 0.85`、`rock < 0.95`、其余 `clay`。同步更新文件头注释里的「one candidate every 12 tiles」。

`src/data/spawns.ts`：`tree.respawnDays` 3 → 1；`rock.respawnDays` 5 → 2。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/nodes.test.ts tests/unit/resourceSystem.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/world/nodes.ts src/data/spawns.ts tests/unit/nodes.test.ts tests/unit/resourceSystem.test.ts
git commit -m "feat: densify resource nodes and speed up tree and rock regrowth"
```

---

### Task 3: 精力回复与无精力采集

**Files:**
- Modify: `src/systems/needsSystem.ts`
- Modify: `src/scenes/IslandScene.ts`（`update` 调回复、采集扣费分支）
- Test: `tests/unit/needsSystem.test.ts`（新建 `tests/unit/energyRegen.test.ts` 亦可）

**Interfaces:**
- Produces: `export function tickEnergyRegen(state: GameState, dtSec: number, idle: boolean): void`
- Consumes: `deriveStats(state).energyMax`

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/energyRegen.test.ts
import { describe, expect, it } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { tickEnergyRegen } from '../../src/systems/needsSystem';
import { gatherChannelMs } from '../../src/systems/resourceSystem';

describe('精力回复', () => {
  it('静止每秒回 1.5', () => {
    const state = createNewGame(1);
    state.player.energy = 40;
    tickEnergyRegen(state, 2, true);
    expect(state.player.energy).toBe(43);
  });
  it('移动时不回', () => {
    const state = createNewGame(1);
    state.player.energy = 40;
    tickEnergyRegen(state, 2, false);
    expect(state.player.energy).toBe(40);
  });
  it('不超过上限', () => {
    const state = createNewGame(1);
    state.player.energy = 99.5;
    tickEnergyRegen(state, 5, true);
    expect(state.player.energy).toBe(100);
  });
});

describe('没精力时采集变慢', () => {
  it('有工具时慢一倍', () => {
    expect(gatherChannelMs(1500, true, true)).toBe(3000);
  });
  it('徒手且没精力时是六倍', () => {
    expect(gatherChannelMs(1500, false, true)).toBe(9000);
  });
  it('有精力时保持原值', () => {
    expect(gatherChannelMs(1500, true, false)).toBe(1500);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/energyRegen.test.ts`
Expected: FAIL —— `tickEnergyRegen` 未导出。

- [ ] **Step 3: 实现**

`needsSystem.ts` 新增：

```ts
export const IDLE_ENERGY_PER_SEC = 1.5;

export function tickEnergyRegen(state: GameState, dtSec: number, idle: boolean): void {
  if (!idle || dtSec <= 0 || state.player.dead) return;
  const max = deriveStats(state).energyMax;
  state.player.energy = Math.max(0, Math.min(max, state.player.energy + IDLE_ENERGY_PER_SEC * dtSec));
}
```

`resourceSystem.ts`：`gatherChannelMs(baseMs, hasTool, slow = false)` 改为 `hasTool ? baseMs : baseMs * 3` 再乘 `slow ? 2 : 1`（默认参数保证既有调用不变）。

`IslandScene.update`：在 `tickBootWear` 之后调用，`idle` = 玩家速度 < 1 且 `!this.channel` 且 `!uiOpen` 且 `!buildSelection`。

采集扣费（`IslandScene` 中调用 `spendEnergy(this.state, this.gatherEnergyCost(node.type))` 处）：改为

```ts
const cost = this.gatherEnergyCost(node.type);
const slow = !spendEnergy(this.state, cost);
if (slow) this.game.events.emit('ui:banner', '精力不足，采集变慢');
const durationMs = gatherChannelMs(target.durationSec * 1000, true, slow);
```

`target.durationSec` 已经含了工具倍率，所以第二个参数固定传 `true`，只用 `slow` 再乘 2。`cancelChannel` 与结算逻辑不变。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/energyRegen.test.ts tests/unit/interactionSystem.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/systems/needsSystem.ts src/scenes/IslandScene.ts tests/unit/energyRegen.test.ts
git commit -m "feat: regen energy while idle and allow gathering without energy"
```

---

### Task 4: 采集时打开背包不打断

**Files:**
- Modify: `src/scenes/UIScene.ts`（维护 `registry.uiPanel`）
- Modify: `src/scenes/IslandScene.ts`（取消引导的条件）
- Test: `tests/unit/uiLayout.test.ts` 或新建 `tests/unit/channelPanel.test.ts`

**Interfaces:**
- Produces: `export type UiPanel = 'inventory' | 'build' | 'craft' | 'labor' | 'map' | 'adventure' | 'pause' | null`（放在 `src/ui/widgets/layout.ts`）
- Produces: `export function shouldCancelChannel(panel: UiPanel): boolean`（放在 `src/systems/interactionSystem.ts`）

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/channelPanel.test.ts
import { describe, expect, it } from 'vitest';
import { shouldCancelChannel } from '../../src/systems/interactionSystem';

describe('采集引导与面板', () => {
  it('背包不打断', () => {
    expect(shouldCancelChannel('inventory')).toBe(false);
  });
  it('其它面板打断', () => {
    for (const panel of ['build', 'craft', 'labor', 'map', 'adventure', 'pause'] as const) {
      expect(shouldCancelChannel(panel)).toBe(true);
    }
  });
  it('没有面板时不打断', () => {
    expect(shouldCancelChannel(null)).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/channelPanel.test.ts`
Expected: FAIL —— `shouldCancelChannel` 未导出。

- [ ] **Step 3: 实现**

`interactionSystem.ts`：加 `UiPanel` 类型与 `shouldCancelChannel(panel) { return panel !== null && panel !== 'inventory'; }`。

`UIScene.update`：在设置 `uiOpen` 之后同步写 `this.registry.set('uiPanel', this.activePanelName())`，按 `inventory.isOpen`、`panel`（建造/合成/劳工）、`map.isOpen`、`adventure.isOpen`、暂停状态的优先级返回名称。

`IslandScene.update`：`if (uiOpen && this.channel) this.cancelChannel()` 改为 `if (this.channel && shouldCancelChannel(this.registry.get('uiPanel') ?? null)) this.cancelChannel()`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/channelPanel.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/scenes/UIScene.ts src/scenes/IslandScene.ts src/systems/interactionSystem.ts src/ui/widgets/layout.ts tests/unit/channelPanel.test.ts
git commit -m "feat: keep gathering when the inventory opens"
```

---

### Task 5: 随身光源只来自道具

**Files:**
- Modify: `src/scenes/IslandScene.ts`（删 `torchLightSize`，改为读数据）
- Test: `tests/unit/lighting.test.ts`

**Interfaces:**
- Produces: `export function carriedLight(items: ItemStack[]): { radius: number; brightness: number } | null`（放在 `src/world/lighting.ts`）

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/lighting.test.ts 追加
import { carriedLight } from '../../src/world/lighting';

it('没有火把就没有光', () => {
  expect(carriedLight([{ baseId: 'wood', count: 1 }])).toBeNull();
});
it('耐久为 0 的火把不发光', () => {
  expect(carriedLight([{ baseId: 'torch', count: 1, durability: 0 }])).toBeNull();
});
it('点燃的火把给出 64px 光', () => {
  expect(carriedLight([{ baseId: 'torch', count: 1, durability: 60 }])).toEqual({ radius: 64, brightness: 0.85 });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/lighting.test.ts`
Expected: FAIL —— `carriedLight` 未导出。

- [ ] **Step 3: 实现**

`lighting.ts`：`carriedLight(items)` 过滤 `ITEMS[baseId]?.light` 且 `(durability ?? 0) > 0`，返回 `radius` 最大的那个；没有则 `null`。

`IslandScene.update`：

```ts
const light = carriedLight(this.state.inventory);
this.light.setVisible(isNight && light !== null);
if (light) {
  this.light.setDisplaySize(light.radius, light.radius);
  this.light.setAlpha(light.brightness);
}
```

删除 `torchLightSize()`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/lighting.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/world/lighting.ts src/scenes/IslandScene.ts tests/unit/lighting.test.ts
git commit -m "feat: only carry a light while holding a lit torch"
```

---

### Task 6: 据点旗

**Files:**
- Modify: `src/data/buildings.ts`
- Modify: `src/systems/buildingSystem.ts`
- Modify: `src/systems/campSystem.ts`
- Modify: `src/systems/tutorialSystem.ts`
- Modify: `src/scenes/IslandScene.ts`（不再覆盖 `camp.center`）
- Modify: `src/ui/mapPanel.ts`、`src/ui/minimap.ts`（旗子标记）
- Test: `tests/unit/buildingSystem.test.ts`、`tests/unit/campSystem.test.ts`、`tests/unit/tutorialSystem.test.ts`

**Interfaces:**
- Produces: `BuildingDef.unique?: boolean`、`BuildingDef.indestructible?: boolean`
- Produces: `export function hasCampFlag(state: GameState): boolean`（`buildingSystem`）
- Produces: `BUILDINGS.flag`
- 拒绝原因字符串固定为「据点已建立」「先插旗建立据点」

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/buildingSystem.test.ts 修改/追加
it('没有旗子时不能建造其它建筑', () => {
  const state = createNewGame(1);
  expect(canPlace(state, 'campfire', 10, 10).reason).toBe('先插旗建立据点');
});

it('旗子忽略营地半径且只能插一面', () => {
  const state = createNewGame(1);
  state.inventory = [{ baseId: 'wood', count: 2 }];
  expect(canPlace(state, 'flag', 500, 300).ok).toBe(true);
  placeBuilding(state, 'flag', 500, 300);
  expect(state.camp.center).toEqual({ x: 500, y: 300 });
  expect(canPlace(state, 'flag', 20, 20).reason).toBe('据点已建立');
});

it('旗子不可拆也不可被破坏', () => {
  const state = createNewGame(1);
  state.inventory = [{ baseId: 'wood', count: 1 }];
  const flag = placeBuilding(state, 'flag', 30, 30)!;
  demolishBuilding(state, flag.id);
  damageBuilding(state, flag.id, 999);
  expect(state.buildings).toContainEqual(expect.objectContaining({ id: flag.id }));
});

it('插旗后半径内可建造、半径外仍被拒', () => {
  const state = createNewGame(1);
  state.inventory = [{ baseId: 'wood', count: 200 }, { baseId: 'stone', count: 200 }];
  placeBuilding(state, 'flag', 100, 100);
  expect(canPlace(state, 'campfire', 108, 100).ok).toBe(true);
  expect(canPlace(state, 'campfire', 120, 100).reason).toBe('超出营地范围');
});
```

```ts
// tests/unit/campSystem.test.ts 追加
it('没有旗子时营地不会升级', () => {
  const state = createNewGame(1);
  state.buildings = ['campfire', 'workbench', 'cage'].map((type, i) => ({ id: `b_${i}`, type, x: 1, y: 1, hp: 10 }));
  expect(checkCampUpgrade(state, bus)).toBe(0);
});

it('没有旗子时入侵仍能刷在兜底营地中心', () => {
  const state = createNewGame(1);
  const savages = spawnRaid(state);
  expect(savages.length).toBeGreaterThan(0);
  expect(Number.isFinite(savages[0].x)).toBe(true);
});
```

```ts
// tests/unit/tutorialSystem.test.ts 修改
it('教程从插旗开始', () => {
  const state = createNewGame(1);
  expect(currentGoal(state)?.id).toBe('flag');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/buildingSystem.test.ts tests/unit/campSystem.test.ts tests/unit/tutorialSystem.test.ts`
Expected: FAIL —— `flag` 建筑不存在、无旗仍可建造。

- [ ] **Step 3: 实现**

`buildings.ts`：接口加 `unique?`/`indestructible?`；新增

```ts
flag: { id: 'flag', name: '据点旗', cost: [{ baseId: 'wood', count: 1 }], hp: 999, unlockLevel: 0, blocks: false, unique: true, indestructible: true },
```

放在对象第一位，建造菜单里排最前。

`buildingSystem.ts`：
- `hasCampFlag(state)` = `state.buildings.some((b) => b.type === 'flag')`。
- `canPlace` 开头：`if (def.unique && hasCampFlag(state)) return { ok: false, reason: '据点已建立' };` 与 `if (!def.unique && !hasCampFlag(state)) return { ok: false, reason: '先插旗建立据点' };`；半径检查改为 `if (!def.unique && Math.hypot(dx, dy) > CONFIG.campRadiusTiles)`。
- `placeBuilding` 成功且 `type === 'flag'` 时写 `state.camp.center = { x: tileX, y: tileY }`。
- `demolishBuilding` 与 `damageBuilding` 开头：`if (BUILDINGS[b.type]?.indestructible) return;`。

`campSystem.ts`：`checkCampUpgrade` 开头 `if (!hasCampFlag(state)) return 0;`（注意避免循环依赖：`campSystem` 从 `buildingSystem` 引入 `hasCampFlag` 即可，`buildingSystem` 不反向依赖 `campSystem`）。

`tutorialSystem.ts`：`TUTORIAL_GOALS` 最前面加 `{ id: 'flag', label: '插下据点旗' }`，`goalDone` 加 `case 'flag': return hasCampFlag(state);`。

`IslandScene.setupTerrain()`：删除 `this.state.camp.center = {...}` 赋值；改为只在 `!hasCampFlag(this.state)` 时保留破船坐标作为兜底（`state.camp.center` 已由 `createNewGame` 初始化，无需再写）。

地图标记：`mapPanel.ts` 在已发现地标循环里，对 `flag` 建筑额外画一个三角旗图标；`minimap.ts` 同样画一个 2×2 点。没有旗子时不画。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/buildingSystem.test.ts tests/unit/campSystem.test.ts tests/unit/tutorialSystem.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/data/buildings.ts src/systems/buildingSystem.ts src/systems/campSystem.ts src/systems/tutorialSystem.ts src/scenes/IslandScene.ts tests/unit/buildingSystem.test.ts tests/unit/campSystem.test.ts tests/unit/tutorialSystem.test.ts
git commit -m "feat: let the player found the camp with a flag"
```

---

### Task 7: 建造模式里的营地范围圈

**Files:**
- Modify: `src/systems/buildingSystem.ts`（纯函数）
- Modify: `src/scenes/IslandScene.ts`（绘制与清除）
- Test: `tests/unit/buildingSystem.test.ts`

**Interfaces:**
- Produces: `export function campRingBounds(center: { x: number; y: number }, radiusTiles: number): { x: number; y: number; w: number; h: number }`（世界像素，中心为旗子格中心）

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/buildingSystem.test.ts 追加
it('范围圈包围盒以旗子格中心为圆心', () => {
  expect(campRingBounds({ x: 100, y: 100 }, 12)).toEqual({ x: 100 * 16 + 8 - 192, y: 100 * 16 + 8 - 192, w: 384, h: 384 });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/buildingSystem.test.ts`
Expected: FAIL —— `campRingBounds` 未导出。

- [ ] **Step 3: 实现**

`buildingSystem.ts`：

```ts
export function campRingBounds(center: { x: number; y: number }, radiusTiles: number) {
  const cx = center.x * 16 + 8;
  const cy = center.y * 16 + 8;
  const r = radiusTiles * 16;
  return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
}
```

`IslandScene`：新增 `campRing?: Phaser.GameObjects.Graphics`。进入建造模式（`buildSelection` 从空变非空）时创建 Graphics，`lineStyle(1, 0xd8f7b0, 0.6)` + `strokeCircle(cx, cy, r)` 加 `fillStyle(0xd8f7b0, 0.08)` + `fillCircle`；深度设在玩家下方（`depthFor(campRing.y + r) - 5` 或固定常量）。`clearBuildPreview()` 里一并 `destroy()`。未插旗时不画。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/buildingSystem.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/systems/buildingSystem.ts src/scenes/IslandScene.ts tests/unit/buildingSystem.test.ts
git commit -m "feat: draw the camp radius while placing buildings"
```

---

### Task 8: 沉船入口可见

**Files:**
- Modify: `src/world/landmarks.ts`（导出偏移常量）
- Modify: `src/scenes/IslandScene.ts`（贴图、去掉火把门槛）
- Modify: `src/ui/mapPanel.ts`、`src/ui/minimap.ts`（入口图标）
- Test: `tests/unit/landmarks.test.ts`、`tests/unit/interactionSystem.test.ts`

**Interfaces:**
- Produces: `export const WRECK_ENTRANCE_OFFSET_PX = 24`

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/landmarks.test.ts 追加
it('沉船入口偏移为 24px', () => {
  expect(WRECK_ENTRANCE_OFFSET_PX).toBe(24);
});
```

```ts
// tests/unit/interactionSystem.test.ts 追加
it('沉船入口不需要火把也能交互', () => {
  const state = createNewGame(1);
  state.world.wreckEntrance = { x: 100, y: 100 };
  state.player.x = 100;
  state.player.y = 100;
  const target = findInteractTarget(state, 100, 100, { onWater: false });
  expect(target?.kind).toBe('dungeon');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/landmarks.test.ts tests/unit/interactionSystem.test.ts`
Expected: FAIL —— 常量未导出（第二条应已通过，作为回归保护）。

- [ ] **Step 3: 实现**

`landmarks.ts`：导出 `WRECK_ENTRANCE_OFFSET_PX = 24`。

`IslandScene.registerWorldObjects()`：`wreckEntrance` 用该常量计算。

`IslandScene.syncNodes(initial)` 之后新增 `ensureEntranceSprite()`：在入口坐标建一个 `image(x, y, 'dungeon', <舱口帧>)`（从 `dungeon` 图集挑一个地板/门帧，实现时肉眼确认），`setOrigin(0.5, 1)`、`setDepth(depthFor(y))`，并加一个椭圆阴影。

`IslandScene.enterDungeon()`：删除 `hasTorch` 判定与「里面太黑了」提示。

`mapPanel.ts`：在 `drawLandmarks` 里，对已发现的 `wreck` 地标额外画一个 4×4 的入口方块（`entrance.x` 换算后的坐标），颜色用 `COLORS.inkSoft`。

`minimap.ts`：同样在入口坐标画一个 2×2 点。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/landmarks.test.ts tests/unit/interactionSystem.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/world/landmarks.ts src/scenes/IslandScene.ts src/ui/mapPanel.ts src/ui/minimap.ts tests/unit/landmarks.test.ts tests/unit/interactionSystem.test.ts
git commit -m "feat: show the shipwreck hatch and enter without a torch"
```

---

### Task 9: 动物数据与实体

**Files:**
- Create: `src/data/animals.ts`
- Create: `src/entities/animal.ts`
- Modify: `src/core/gameState.ts`（`animals: AnimalState[]`）
- Modify: `src/systems/dataValidation.ts`
- Test: `tests/unit/dataIntegrity.test.ts`、`tests/unit/gameState.test.ts`

**Interfaces:**
- Produces:
  - `export type AnimalSize = 'small' | 'large'`
  - `export interface AnimalDef { id; name; size; hp; damage; attackCooldownSec; wanderSpeed; chaseSpeed; leashRange; disengageSec; drops: DropDef[]; habitat: number[]; sprite: { texture: string; frame: number } }`
  - `export const ANIMALS: Record<string, AnimalDef>`
  - `export const ANIMAL_SPAWN = { smallCap: 6, largeCap: 3, minDist: 200, maxDist: 500, despawnDist: 900 }`
  - `export type AnimalMode = 'wander' | 'retaliate' | 'dead'`
  - `export interface AnimalState { id; type; x; y; hp; mode; cooldown; wanderDir; wanderTimer; disengageTimer }`
  - `export function createAnimal(id: string, type: string, x: number, y: number): AnimalState`

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/dataIntegrity.test.ts 追加
it('三种动物的数值与掉落合法', () => {
  expect(Object.keys(ANIMALS).sort()).toEqual(['boar', 'chicken', 'rabbit']);
  for (const def of Object.values(ANIMALS)) {
    expect(def.hp).toBeGreaterThan(0);
    expect(def.habitat.length).toBeGreaterThan(0);
    for (const drop of def.drops) expect(ITEMS[drop.baseId]).toBeDefined();
  }
  expect(ANIMALS.boar.size).toBe('large');
  expect(ANIMALS.chicken.size).toBe('small');
});
```

```ts
// tests/unit/gameState.test.ts 追加
it('新游戏没有动物', () => {
  expect(createNewGame(1).animals).toEqual([]);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/dataIntegrity.test.ts tests/unit/gameState.test.ts`
Expected: FAIL —— `ANIMALS` 不存在、`animals` 字段缺失。

- [ ] **Step 3: 实现**

`src/data/animals.ts`：按规格表定义 `chicken`（hp 12、damage 2、生肉 1–2）、`rabbit`（hp 10、damage 1、生肉 1）、`boar`（hp 60、damage 10、生肉 3–4）；`wanderSpeed: 20`、`chaseSpeed: 45`、`attackCooldownSec: 1.5`、`leashRange: 400`、`disengageSec: 5`；`habitat` 用 `TILE.grass`/`TILE.forest`/`TILE.rock`；`sprite` 先填 `{ texture: 'farm', frame: 0 }`，Task 11 再校准。

`src/entities/animal.ts`：`createAnimal` 返回 `mode: 'wander'`、`cooldown: 0`、`wanderDir: 0`、`wanderTimer: 0`、`disengageTimer: 0`、`hp` 取 `ANIMALS[type].hp`。

`src/core/gameState.ts`：`GameState` 加 `animals: AnimalState[]`，`createNewGame` 返回 `animals: []`。

`src/systems/dataValidation.ts`：加动物表校验（物种 id 非空、掉落物品存在于 `ITEMS`、栖息地瓦片合法）。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/dataIntegrity.test.ts tests/unit/gameState.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/data/animals.ts src/entities/animal.ts src/core/gameState.ts src/systems/dataValidation.ts tests/unit/dataIntegrity.test.ts tests/unit/gameState.test.ts
git commit -m "feat: add animal species data and state"
```

---

### Task 10: 动物生成与 AI

**Files:**
- Create: `src/systems/animalSystem.ts`
- Test: `tests/unit/animalSystem.test.ts`

**Interfaces:**
- Produces:
  - `export interface AnimalWorld { tileAt(tileX: number, tileY: number): number }`
  - `export function spawnAnimals(state: GameState, world: AnimalWorld, rng: Rng): AnimalState[]`
  - `export function updateAnimalAi(state: GameState, animal: AnimalState, dtSec: number, world: AnimalWorld): void`
  - `export function pruneAnimals(state: GameState, nowClockMin: number): void`
  - `export function applyHitToAnimal(state: GameState, animal: AnimalState, weapon: WeaponDef, mods?: CombatMods): 'hit' | 'dead'`
- Consumes: `ANIMALS`、`ANIMAL_SPAWN`、`createAnimal`、`applyDamage`、`addItem`、`hash2D`

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/animalSystem.test.ts
import { describe, expect, it } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { ANIMALS, ANIMAL_SPAWN } from '../../src/data/animals';
import { applyHitToAnimal, pruneAnimals, spawnAnimals, updateAnimalAi } from '../../src/systems/animalSystem';
import { WEAPONS } from '../../src/data/weapons';
import { TILE } from '../../src/world/terrain';

const grassWorld = { tileAt: () => TILE.grass };

describe('动物生成', () => {
  it('补足到上限且不超过', () => {
    const state = createNewGame(42);
    spawnAnimals(state, grassWorld, createRng(42));
    const small = state.animals.filter((a) => ANIMALS[a.type].size === 'small').length;
    const large = state.animals.filter((a) => ANIMALS[a.type].size === 'large').length;
    expect(small).toBe(ANIMAL_SPAWN.smallCap);
    expect(large).toBe(ANIMAL_SPAWN.largeCap);
    spawnAnimals(state, grassWorld, createRng(43));
    expect(state.animals.length).toBe(ANIMAL_SPAWN.smallCap + ANIMAL_SPAWN.largeCap);
  });

  it('同种子同一天生成同样位置', () => {
    const a = createNewGame(7);
    const b = createNewGame(7);
    spawnAnimals(a, grassWorld, createRng(7));
    spawnAnimals(b, grassWorld, createRng(7));
    expect(a.animals.map((x) => [x.type, x.x, x.y])).toEqual(b.animals.map((x) => [x.type, x.x, x.y]));
  });
});

describe('动物行为', () => {
  it('游荡时不伤害玩家', () => {
    const state = createNewGame(1);
    state.player.hp = 100;
    const animal = spawnAnimals(state, grassWorld, createRng(1))[0];
    for (let i = 0; i < 100; i++) updateAnimalAi(state, animal, 0.1, grassWorld);
    expect(state.player.hp).toBe(100);
  });

  it('被命中后反击并造成伤害', () => {
    const state = createNewGame(1);
    const animal = spawnAnimals(state, grassWorld, createRng(1))[0];
    animal.x = state.player.x + 10;
    animal.y = state.player.y;
    applyHitToAnimal(state, animal, WEAPONS.fist);
    expect(animal.mode).toBe('retaliate');
    const before = state.player.hp;
    for (let i = 0; i < 40; i++) updateAnimalAi(state, animal, 0.1, grassWorld);
    expect(state.player.hp).toBeLessThan(before);
  });

  it('玩家跑远 5 秒后脱战', () => {
    const state = createNewGame(1);
    const animal = spawnAnimals(state, grassWorld, createRng(1))[0];
    applyHitToAnimal(state, animal, WEAPONS.fist);
    state.player.x = animal.x + ANIMALS[animal.type].leashRange + 50;
    state.player.y = animal.y;
    for (let i = 0; i < 60; i++) updateAnimalAi(state, animal, 0.1, grassWorld);
    expect(animal.mode).toBe('wander');
  });
});

describe('动物清理', () => {
  it('夜晚全部离场', () => {
    const state = createNewGame(1);
    spawnAnimals(state, grassWorld, createRng(1));
    pruneAnimals(state, 1200);
    expect(state.animals).toEqual([]);
  });

  it('玩家走远后个体离场', () => {
    const state = createNewGame(1);
    spawnAnimals(state, grassWorld, createRng(1));
    state.player.x += ANIMAL_SPAWN.despawnDist + 100;
    pruneAnimals(state, 600);
    expect(state.animals).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/animalSystem.test.ts`
Expected: FAIL —— 模块不存在。

- [ ] **Step 3: 实现**

`spawnAnimals`：按小型/大型分别计数，补到 `smallCap`/`largeCap`；每个候选点用 `hash2D(day, index, seed)` 取角度与距离（`minDist..maxDist`），最多试 40 次直到落在 `habitat` 瓦片上且不是水面；id 用 `animal_${type}_${day}_${index}`；返回本次新增的数组。

`updateAnimalAi`：
- `dead` 直接返回。
- `wander`：`wanderTimer -= dt`，归零时用 `hash2D` 换向并把 `wanderTimer` 设为 2–4；按 `wanderSpeed` 移动；下一步是水面则反向。
- `retaliate`：距离 > `leashRange` 时累加 `disengageTimer`，达到 `disengageSec` 回 `wander`；否则追向玩家（`chaseSpeed`），距离 ≤ 20 时按 `attackCooldownSec` 调 `applyDamage(state, def.damage, { kind: 'savage', id: animal.id })`。

`pruneAnimals`：`nowClockMin >= 1200 || nowClockMin < 360` 清空；否则移除距玩家 > `despawnDist` 的个体。

`applyHitToAnimal`：扣血（`weapon.damage + mods.attack`，`Math.max(1, ...)`），`mode = 'retaliate'`、`disengageTimer = 0`；血量 ≤ 0 时置 `dead` 并按 `drops` 掷骰 `addItem`，背包满的部分推入 `world.groundLoot`（坐标用动物位置），返回 `'dead'`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/animalSystem.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/systems/animalSystem.ts tests/unit/animalSystem.test.ts
git commit -m "feat: spawn wildlife and give it retaliating ai"
```

---

### Task 11: 动物战斗接入与渲染

**Files:**
- Modify: `src/scenes/IslandScene.ts`
- Modify: `src/ui/assets.ts`（动物精灵帧）
- Test: `tests/unit/assets.test.ts`

**Interfaces:**
- Consumes: `spawnAnimals`、`updateAnimalAi`、`pruneAnimals`、`applyHitToAnimal`
- Produces: `export function animalSprite(type: string): { texture: string; frame: number }`

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/assets.test.ts 追加
it('每种动物都有精灵帧', () => {
  for (const id of ['chicken', 'rabbit', 'boar']) {
    expect(animalSprite(id).texture).toBeTruthy();
  }
  expect(animalSprite('chicken')).not.toEqual(animalSprite('boar'));
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/assets.test.ts`
Expected: FAIL —— `animalSprite` 未导出。

- [ ] **Step 3: 实现**

`src/ui/assets.ts`：加 `ANIMAL_SPRITES` 映射与 `animalSprite(type)`（缺省回落到 `farm` 的某个帧）。打开 `public/assets/tiles/farm.png` 肉眼确认鸡/兔/猪的帧号，写进映射。

`IslandScene`：
- `create()` 里 `spawnAnimals(this.state, this.animalWorld(), this.rng)`（仅在白天）。
- `update()` 里每帧对每只动物调 `updateAnimalAi`，每 10 秒调一次 `spawnAnimals` 补足，每帧调 `pruneAnimals(this.state, this.state.time.clockMin)`。
- `syncAnimals()`：与 `syncSavages()` 同构，按 `animalSprites` Map 增删精灵，`dead` 的动物淡出 1 秒后移除。
- `attack()`：目标集合拼接 `state.animals`（过滤 `dead`），命中时按 id 前缀 `animal_` 路由到 `applyHitToAnimal`，其余仍走野人逻辑。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/assets.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/ui/assets.ts src/scenes/IslandScene.ts tests/unit/assets.test.ts
git commit -m "feat: render wildlife and let the player hunt it"
```

---

### Task 12: HUD 状态条收起

**Files:**
- Modify: `src/ui/widgets/layout.ts`
- Modify: `src/ui/hud.ts`
- Modify: `src/core/gameState.ts`（`settings.hudCompact`）
- Modify: `src/scenes/UIScene.ts`（接线与保存）
- Test: `tests/unit/uiLayout.test.ts`

**Interfaces:**
- Produces: `HUD.statusCompact = { x: 8, y: 44, w: 176, h: 30 }`、`HUD.goalCompact = { x: 8, y: 78, w: 176, h: 26 }`
- Produces: `Hud.setCompact(compact: boolean): void`
- Produces: `settings.hudCompact: boolean`

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/uiLayout.test.ts 追加
it('收起后目标条不与状态条重叠', () => {
  expect(HUD.statusCompact.y + HUD.statusCompact.h).toBeLessThanOrEqual(HUD.goalCompact.y);
  expect(HUD.goalCompact.y).toBe(78);
});
```

```ts
// tests/unit/gameState.test.ts 追加
it('默认展开 HUD', () => {
  expect(createNewGame(1).settings.hudCompact).toBe(false);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/uiLayout.test.ts tests/unit/gameState.test.ts`
Expected: FAIL —— `HUD.statusCompact` 未定义。

- [ ] **Step 3: 实现**

`layout.ts`：加 `statusCompact` 与 `goalCompact`。

`gameState.ts`：`settings` 加 `hudCompact: boolean`，`createNewGame` 里 `hudCompact: false`。

`hud.ts`：构造函数里把状态面板的 chrome 拆成 `statusChrome`（展开）与 `compactChrome`（收起）两个 Graphics；`setCompact(compact)` 切换两组对象的 `setVisible`，并把目标条面板与文字移动到 `HUD.goal` 或 `HUD.goalCompact` 的 y。右上角加一个 10×10 箭头 `Image`/`Text`，`setInteractive` 后 `pointerdown` 调 `this.setCompact(!this.compact)` 并 `emit('ui:hudCompact', compact)`。

`UIScene`：监听 `ui:hudCompact`，写 `state.settings.hudCompact` 并 `bus.emit('save:requested', { reason: 'settings' })`；`create()` 时按 `state.settings.hudCompact` 调一次 `hud.setCompact`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/uiLayout.test.ts tests/unit/gameState.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/ui/widgets/layout.ts src/ui/hud.ts src/core/gameState.ts src/scenes/UIScene.ts tests/unit/uiLayout.test.ts tests/unit/gameState.test.ts
git commit -m "feat: collapse the hud status panel into thin bars"
```

---

### Task 13: 存档 v4 迁移

**Files:**
- Modify: `src/core/saveVersion.ts`
- Modify: `src/systems/saveSystem.ts`
- Test: `tests/unit/saveV3.test.ts`、`tests/unit/saveSystem.test.ts`、新建 `tests/unit/saveV4.test.ts`

**Interfaces:**
- Consumes: `GameState.animals`、`settings.hudCompact`、`hasCampFlag`
- Produces: `SAVE_VERSION === 4`；`export function upgradeToV4(state: GameState): GameState`

- [ ] **Step 1: 写失败测试**

```ts
// tests/unit/saveV4.test.ts
import { describe, expect, it } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { upgradeToV4, validateSave } from '../../src/systems/saveSystem';

describe('v3 → v4 迁移', () => {
  it('清空节点状态、补旗、教程前进一步、补动物数组', () => {
    const state = createNewGame(5);
    state.version = 3;
    state.world.nodeStates = { tree_0_0_0: { remaining: 0, respawnDay: 9 } };
    state.flags.tutorialStep = 2;
    state.buildings = [{ id: 'b_1', type: 'campfire', x: 50, y: 50, hp: 100 }];
    state.animals = undefined as unknown as typeof state.animals;

    const next = upgradeToV4(state);

    expect(next.version).toBe(4);
    expect(next.world.nodeStates).toEqual({});
    expect(next.flags.tutorialStep).toBe(3);
    expect(next.animals).toEqual([]);
    expect(next.settings.hudCompact).toBe(false);
    expect(next.buildings.some((b) => b.type === 'flag')).toBe(true);
  });

  it('已有旗子的旧档不重复补旗', () => {
    const state = createNewGame(5);
    state.version = 3;
    state.buildings = [{ id: 'b_1', type: 'flag', x: 50, y: 50, hp: 999 }];
    expect(upgradeToV4(state).buildings.filter((b) => b.type === 'flag')).toHaveLength(1);
  });

  it('hudCompact 能写进存档再读回来', () => {
    const state = createNewGame(5);
    state.settings.hudCompact = true;
    const restored = validateSave(JSON.parse(JSON.stringify(state)));
    expect(restored.settings.hudCompact).toBe(true);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/unit/saveV4.test.ts`
Expected: FAIL —— `upgradeToV4` 未导出。

- [ ] **Step 3: 实现**

`saveVersion.ts`：`SAVE_VERSION = 4`。

`saveSystem.ts`：
- `export function upgradeToV4(state: GameState): GameState`：`version = 4`；`world.nodeStates = {}`；`flags.tutorialStep += 1`；`animals ??= []`；`settings.hudCompact ??= false`；若无旗且 `buildings.length > 0`，在 `camp.center` 推入 `{ id: 'b_flag_migrated', type: 'flag', x: center.x, y: center.y, hp: 999 }`。
- `validateSave`：`data.version === 3` 时 `return upgradeToV4(validateCore(data))`；v1/v2 走 `upgradeToV4(upgradeToV3(...))`。
- `validateCore`：`requireArray(data.animals, 'animals')`、`settings.hudCompact` 必须是布尔值。
- 序列化路径无需改动（`JSON.stringify(state)`）。

更新 `tests/unit/saveV3.test.ts` 中对 `version === 3` 的断言为 4。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/unit/saveV4.test.ts tests/unit/saveV3.test.ts tests/unit/saveSystem.test.ts tests/unit/saveV2.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/core/saveVersion.ts src/systems/saveSystem.ts tests/unit/saveV4.test.ts tests/unit/saveV3.test.ts
git commit -m "feat: migrate saves to v4 with flags, animals and hud state"
```

---

### Task 14: 全量验证与试玩清单

**Files:** 无代码改动（只跑验证、修残留）

- [ ] **Step 1: 跑全量测试**

Run: `npm run test`
Expected: 全部通过，无 skip。

- [ ] **Step 2: 类型与 lint**

Run: `npm run typecheck && npm run lint`
Expected: 无输出、退出码 0。

- [ ] **Step 3: 构建**

Run: `npm run build`
Expected: `built in ...`，只有 Phaser 体积警告。

- [ ] **Step 4: 手动试玩**

`npm run dev` 后在浏览器里依次确认：

1. 新档开局没有旗，建造菜单最上面是「据点旗」；没插旗时建营火提示「先插旗建立据点」。
2. 插旗后范围内绿角标、范围外红叉并显示「超出营地范围」；建造模式能看到圈。
3. 树明显变密；砍完一棵，第二天回来已长好。
4. 站着不动精力缓慢回升；精力 0 时采集变慢但仍能完成。
5. 采集途中按 I 开背包，引导条继续走并正常结算。
6. 白天没有光；夜里拿火把才有光，扔掉火把立刻变黑。
7. 背包里悬停椰子显示「饱食 +10 / 口渴 +15」。
8. 破船旁能看到舱口贴图，地图上入口图标与「破船」文字分开，不带火把也能进。
9. 岛上能遇到野鸡/野兔/野猪；不打它们不会攻击你；打了会追你；打死掉生肉；篝火能烤成烤肉。
10. 点状态面板右上角箭头收起，只剩四条细线；刷新页面后仍是收起状态。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: verify camp flag, wildlife and hud changes end to end"
```
