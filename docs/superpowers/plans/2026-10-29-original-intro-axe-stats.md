# 原著开场 + 腿部 + 斧头 + 属性系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 把开场扩成 8 屏原著线，缩短人物腿部，支持石斧左键砍树，并加入角色等级/攻击/防御/护甲/移速与同套怪物属性。

**Architecture:** 故事继续放在 `data/introStory.ts` + `IntroScene`；等级与伤害公式放进 `systems/levelSystem.ts` / `statsSystem.ts` / 战斗系统纯函数；场景只负责触发经验、表现与输入。

**Tech Stack:** TypeScript strict、Phaser 3.90、Vite 6、Vitest 3。

**Specs:**
- `docs/superpowers/specs/2026-10-29-intro-original-legs-axe-design.md`
- `docs/superpowers/specs/2026-10-29-character-stats-design.md`

## Global Constraints

- 640×360；桌面整数缩放、手机分数缩放；中文 UI。
- 存档版本保持 v5；`player.level/xp` 为可选字段，旧档补 1/0。
- 护甲为百分比减伤，上限 70%；防御先减固定值。
- 不用新美术/新依赖；现有 357 项测试保持通过。

## Review Focus

- 8 屏故事只在新档播放一次；最后一屏后进入海岛，跳过也写入 `introSeen`。
- 腿部缩短后碰撞体、脚底锚点、行走两帧仍正常。
- 空手攻击树不能产生木头；选斧攻击树 4 次耗尽并扣耐久/精力。
- 护甲与防御的先后顺序、最低 1 点、破甲只忽略防御。
- 旧档升级后 Lv1/xp0，属性与装备叠加不重复计算。

---

### Task 1: 8 屏原著故事

**Files:**
- Modify: `src/data/introStory.ts`
- Modify: `src/scenes/IntroScene.ts`
- Modify: `tests/unit/introStory.test.ts`

**Interfaces:**
- `IntroSceneKind` 扩展：`'york' | 'harbor' | 'escape' | 'storm' | 'wreck' | 'raft' | 'supplies' | 'date'`
- `INTRO_STORY` 变为 8 张卡；最后一屏含 `1659` 与 `9 月 30 日`。

- [x] **Step 1: 写失败测试**

更新 `introStory.test.ts`：长度为 8；每屏 title/body 非空；最后一屏合并文本含 `1659` 与 `9 月 30 日`；触发条件保持。

- [x] **Step 2: 运行确认失败**

Run: `npm.cmd run test -- tests/unit/introStory.test.ts`
Expected: FAIL（长度/文本不匹配）。

- [x] **Step 3: 替换故事与新增插画**

写 8 张卡（约克、赫尔、逃脱、再出海、沉船、回船、物资、日期）；`IntroScene.drawArt` 增加 `york/escape/wreck/raft/supplies/date` 六个绘制分支，复用 harbor/storm。

- [x] **Step 4: 测试 + 截图**

Run: `npm.cmd run test -- tests/unit/introStory.test.ts`
Expected: PASS。CDP 截图第 1/4/8 屏。

- [x] **Step 5: 提交**

```bash
git add src/data/introStory.ts src/scenes/IntroScene.ts tests/unit/introStory.test.ts
git commit -m "feat: expand intro to the original eight-card story"
```

---

### Task 2: 腿部缩短与石斧砍树

**Files:**
- Modify: `src/entities/playerFrames.ts`
- Create: `src/systems/toolCombat.ts`
- Modify: `src/scenes/IslandScene.ts`
- Test: `tests/unit/toolCombat.test.ts`

**Interfaces:**
- Produces: `chopToolFor(nodeType: string): 'stone_axe' | null`
- Produces: `canChop(selectedBaseId: string | null, nodeType: string): boolean`
- `IslandScene.attackAtAngle` 在敌人命中后追加树木目标：`computeHitTargets` 扇形 36px/90°，只砍最近一棵。

- [x] **Step 1: 写失败测试**

`toolCombat.test.ts`：`chopToolFor('tree') === 'stone_axe'`；`canChop('stone_axe','tree') === true`；`canChop(null,'tree') === false`；`canChop('stone_pick','tree') === false`；`chopToolFor('rock') === null`。

- [x] **Step 2: 运行确认失败**

Run: `npm.cmd run test -- tests/unit/toolCombat.test.ts`
Expected: FAIL（模块不存在）。

- [x] **Step 3: 实现**

- `toolCombat.ts` 按接口实现。
- 腿部：`clearRect(3,11,10,5)`，轮廓 y=11..16，裤子 2px，靴子 2–3px；站立 top=12，走路 11/12。
- `IslandScene`：`selectedHotbarBaseId()`；选中斧头时把最近树加入挥击；命中树且 `canChop` → 扣 5 精力、`gatherNode`、`collectLoot`、`damageTool`、chop 音效与横幅；空手命中树 → 只提示“空手砍不动树，需要石斧”。
- 触屏自动瞄准：选中斧头时把 96px 内最近的树加入候选。

- [x] **Step 4: 测试 + 截图**

Run: `npm.cmd run test -- tests/unit/toolCombat.test.ts && npm.cmd run typecheck`
Expected: PASS。截图人物行走与砍树。

- [x] **Step 5: 提交**

```bash
git add src/entities/playerFrames.ts src/systems/toolCombat.ts src/scenes/IslandScene.ts tests/unit/toolCombat.test.ts
git commit -m "feat: shorten legs and let axes chop trees"
```

---

### Task 3: 等级、经验与角色属性

**Files:**
- Create: `src/systems/levelSystem.ts`
- Modify: `src/core/gameState.ts`
- Modify: `src/systems/saveSystem.ts`
- Modify: `src/systems/statsSystem.ts`
- Test: `tests/unit/levelSystem.test.ts`
- Test: `tests/unit/stats.test.ts`（追加）

**Interfaces:**
- `MAX_LEVEL = 20`
- `xpToNext(level: number): number`
- `grantXp(state: GameState, amount: number, bus?: EventBus): number`（返回升级次数，溢出发 `player:levelUp`）
- `playerBaseStats(level: number): { attack: number; defense: number; armor: number; moveMul: number }`
- `DerivedStats` 增加 `armor: number`（0..70）。
- `GameState.player` 增加 `level: number`、`xp: number`。

- [x] **Step 1: 写失败测试**

`levelSystem.test.ts`：
- Lv1 基础 `attack 4/defense 0/armor 0/moveMul 1`；Lv5 `12/4/8%/1.04`。
- `xpToNext(1)===65`、`xpToNext(2)===90`。
- `grantXp(70)` → Lv2、xp 5；一次给 1000 封顶 Lv20。
- 升级事件次数等于升级次数。

`stats.test.ts` 追加：Lv5 + 装备攻击/防御叠加；护甲封顶 70。

- [x] **Step 2: 运行确认失败**

Run: `npm.cmd run test -- tests/unit/levelSystem.test.ts tests/unit/stats.test.ts`
Expected: FAIL。

- [x] **Step 3: 实现**

- `levelSystem.ts` 按接口。
- `gameState` 新档 `level:1,xp:0`；`saveSystem.upgradeToV5` 补默认值，`validateSave` 校验 level 1..20、xp ≥0。
- `deriveStats` 先加 `playerBaseStats(level)`，再叠装备；`armor` 封顶 70。

- [x] **Step 4: 测试 + typecheck**

Run: `npm.cmd run test -- tests/unit/levelSystem.test.ts tests/unit/stats.test.ts && npm.cmd run typecheck`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/systems/levelSystem.ts src/core/gameState.ts src/systems/saveSystem.ts src/systems/statsSystem.ts tests/unit/levelSystem.test.ts tests/unit/stats.test.ts
git commit -m "feat: add player levels and base attributes"
```

---

### Task 4: 伤害公式与怪物属性

**Files:**
- Modify: `src/systems/needsSystem.ts`
- Modify: `src/systems/combatSystem.ts`
- Modify: `src/systems/animalSystem.ts`
- Modify: `src/entities/savage.ts`
- Modify: `src/entities/dungeonEnemy.ts`
- Modify: `src/systems/raidSystem.ts`
- Modify: `src/data/animals.ts`
- Test: `tests/unit/damageFormula.test.ts`
- Test: `tests/unit/dungeonEnemy.test.ts`（追加）

**Interfaces:**
- `applyDamage` 使用 `(amount - defense) × (1 - armor/100)`。
- `applyHitToSavage` / `applyHitToAnimal` / `damageDungeonEnemy` 使用怪物 defense + armor；破甲只忽略 defense。
- 所有怪物增加 `level`、`armor`；野人增加 `attack`、`speed`；副本 `damage` 即攻击。

- [x] **Step 1: 写失败测试**

`damageFormula.test.ts`：
- 20 伤害、防御 3、护甲 20% → 14（四舍五入）。
- 防御高于伤害仍为 1。
- 破甲后仍吃护甲。
- 玩家护甲 70% 封顶后的伤害。

`dungeonEnemy.test.ts` 追加：精英/Boss 等级与护甲提升且封顶 60。

- [x] **Step 2: 运行确认失败**

Run: `npm.cmd run test -- tests/unit/damageFormula.test.ts tests/unit/dungeonEnemy.test.ts`
Expected: FAIL。

- [x] **Step 3: 实现公式与怪物数据**

- 野人默认 Lv3/攻击8/防御0/护甲5%/速度40；raid 用 `savage.attack/speed`。
- 动物数据加 level/defense/armor；`applyHitToAnimal` 使用。
- 副本 DEFS 加 level/armor；精英 +2 级/+5 护甲，Boss +4 级/+10 护甲，护甲上限 60；Boss 标题加 `LvX`。
- `applyDamage` 统一玩家防御/护甲。

- [x] **Step 4: 测试 + typecheck**

Run: `npm.cmd run test -- tests/unit/damageFormula.test.ts tests/unit/dungeonEnemy.test.ts && npm.cmd run typecheck`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/systems/needsSystem.ts src/systems/combatSystem.ts src/systems/animalSystem.ts src/entities/savage.ts src/entities/dungeonEnemy.ts src/systems/raidSystem.ts src/data/animals.ts tests/unit/damageFormula.test.ts tests/unit/dungeonEnemy.test.ts
git commit -m "feat: apply armor formulas to players and monsters"
```

---

### Task 5: 经验来源、升级提示与冒险面板

**Files:**
- Modify: `src/scenes/IslandScene.ts`
- Modify: `src/scenes/DungeonScene.ts`
- Modify: `src/systems/craftingSystem.ts`
- Modify: `src/ui/adventurePanel.ts`
- Modify: `src/scenes/UIScene.ts`
- Test: `tests/unit/levelSystem.test.ts`（追加经验来源边界）

- [x] **Step 1: 接入经验来源**

- 采集 +2、合成 +3、钓鱼 +4、收获 +5、鸡/兔 +8、野猪 +18、野人 +25、副本普通 +8、精英 +25、Boss +80、地标 +15、过夜 +10、通关一层 +30。
- 每个来源调用 `grantXp(state, n, this.bus)`；UIScene 监听 `player:levelUp` 显示 `升级！LvX` 并播放音效。

- [x] **Step 2: 冒险面板**

- 面板高度扩到 300；显示 Lv、经验条/下一级所需、攻击、防御、护甲、移速，再保留探索/地标/装备/天数/副本。

- [x] **Step 3: 测试与截图**

Run: `npm.cmd run test && npm.cmd run typecheck`
Expected: PASS。截图 R 面板与升级横幅。

- [x] **Step 4: 提交**

```bash
git add src/scenes/IslandScene.ts src/scenes/DungeonScene.ts src/systems/craftingSystem.ts src/ui/adventurePanel.ts src/scenes/UIScene.ts tests/unit/levelSystem.test.ts
git commit -m "feat: grant xp and show character stats"
```

---

### Task 6: 全量验证、文档与上线

**Files:** `README.md`、`工作完成.md`、设计稿勾选

- [x] `npm.cmd run test / typecheck / lint / build` 全通过。
- [x] 截图：8 屏故事、腿部、斧头砍树、空手提示、R 面板、升级横幅、Boss 等级。
- [x] 更新 README（等级/属性/斧头/8 屏故事）与 `工作完成.md`。
- [x] 提交、合并 `main`、推送，确认 Actions success 与线上资源。

## Self-Review

- **Spec coverage:** 8 屏故事、腿部、斧头、等级、四属性、怪物属性、伤害公式、UI、存档、测试均有任务。
- **Step scan:** 每个任务有失败测试/验证、实现、通过、提交。
- **Type consistency:** `playerBaseStats`、`grantXp`、`DerivedStats.armor`、`chopToolFor` 前后一致。
- **Review Focus:** 每个风险点在 Task 1/2/3/4 中有测试或截图步骤。
- **Proportion:** 6 个任务，代码块只保留接口与关键数值。
