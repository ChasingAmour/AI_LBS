# 阶段二实现计划（装备 / 沉船副本 / 音频 / 体验补齐）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有岛上加入装备成长线、三层程序生成沉船副本、音效与动画，并补齐水面、地图缩放、物品图标、卡片布局等已知限制。

**Architecture:** 所有数值逻辑放进 `src/data` 与 `src/systems` 的纯函数（可单测）；场景只做渲染与输入。装备用 `deriveStats(state)` 聚合，副本用 `generateDungeonFloor(seed, floor)` 生成，存档升 v3 并保留 v1/v2 迁移。

**Tech Stack:** TypeScript strict、Phaser 3.90、Vite 6、Vitest 3、ESLint。

**Spec:** `docs/superpowers/specs/2026-10-28-phase2-equipment-dungeon-design.md`

## Global Constraints

- 单机纯静态，`base: '/AI_LBS/'`，GitHub Pages。
- 640×360 基准、整数缩放；正文 12px、标题 24px。
- 存档键 `robinson.save.v1`，版本 3；v1/v2 可迁移。
- 现有 174 项测试保持通过；新纯函数必须有测试。
- 只用 CC0/OFL 资源，更新 `LICENSES.md`。

## Review Focus

- 存档 v2→v3 迁移后旧武器不丢失、旧快捷栏不指向空实例。
- 副本生成在同种子下稳定，且入口→梯子/宝箱 BFS 可达。
- 装备耐久为 0 时属性立即失效，但装备不消失。
- 首通最终宝箱必出传说，之后不再必出。
- 副本内时间/需求继续，周五入侵按黎明抽象结算。

---

### Task 1: 装备数据、词条与掉落表

**Files:**
- Create: `src/data/equipment.ts`, `src/systems/equipmentSystem.ts`, `tests/unit/equipment.test.ts`
- Modify: `src/data/weapons.ts`（新增武器形状）, `src/data/recipes.ts`（装备配方）

**Interfaces:**
- Produces: `EQUIPMENT: Record<string, EquipBase>`、`RARITY`、`AFFIXES`
- Produces: `rollEquipment(rng: Rng, baseId: string, rarity: Rarity, instanceId: string): EquipInstance`
- Produces: `equipmentBase(id: string): EquipBase | null`

- [ ] **Step 1: 写失败测试**：14 件基础装备齐全；同 rng 同结果；精良 1 条、稀有 2 条、史诗/传说 3 条；词条不重复；传说追加唯一词条；耐久上限随品级增长。
- [ ] **Step 2: 运行测试确认失败**（模块不存在）。
- [ ] **Step 3: 实现数据与 `rollEquipment`**：词条按槽位池抽取，数值取 T2–T5 档；传说追加 `unique:<baseId>` 词条（value 1）。
- [ ] **Step 4: 测试通过，提交** `feat: add equipment bases, affixes and rolls`。

### Task 2: 掉落表与宝箱

**Files:**
- Create: `src/systems/lootSystem.ts`, `tests/unit/loot.test.ts`
- Modify: `src/systems/resourceSystem.ts`（宝箱开箱改为返回装备+材料）

**Interfaces:**
- Produces: `rollChestLoot(state, source: 'normal'|'final', rng?): { equipment: EquipInstance; materials: ItemStack[] }`
- 首通最终宝箱必出传说并置 `firstClearDone`。

- [ ] **Step 1: 测试**：普通箱品级分布边界（用固定 rng 断言）；首通 final 为 legendary；第二次 final 不再强制；材料 1–2 份且 id 合法；`lootRolls` 递增。
- [ ] **Step 2: 失败确认 → 实现 → 通过 → 提交** `feat: add chest loot tables and first-clear legendary`。

### Task 3: 派生属性、耐久与修理

**Files:**
- Create: `src/systems/statsSystem.ts`, `tests/unit/stats.test.ts`
- Modify: `src/core/gameState.ts`（如缺字段）

**Interfaces:**
- Produces: `deriveStats(state): DerivedStats`
- Produces: `damageEquipped(state, slot, amount=1): void`、`tickBootWear(state, movedPx): void`
- Produces: `repairCost(instance): { wood: number; vine: number; cloth: number }`
- Produces: `repairEquipped(state, instanceId, nearWorkbench): boolean`

- [ ] **Step 1: 测试**：装备一件稀有武器 → attack/词条生效；耐久 0 → 失效；修理消耗按 20 点取整；传说修理多耗布。
- [ ] **Step 2: 失败 → 实现 → 通过 → 提交** `feat: derive equipment stats, durability and repairs`。

### Task 4: 属性接入战斗/移动/采集/需求

**Files:**
- Modify: `src/systems/needsSystem.ts`, `src/systems/combatSystem.ts`, `src/systems/interactionSystem.ts`, `src/scenes/IslandScene.ts`
- Test: `tests/unit/statsIntegration.test.ts`

**Interfaces:**
- `applyDamage(state, amount, attacker?: {x,y,kind})` 应用防御/硬壳/反伤并扣护甲耐久。
- 武器命中：伤害 + attack、眩晕 ×stunMul、野人 ×savageMul，武器耐久 -1。
- 移速 ×moveMul；浅水免疫；奔跑精力 ×sprintEnergyMul；采集时长 ÷gatherMul；精力上限 energyMax；饱食消耗 ×hungerMul。

- [ ] **Step 1: 测试**防御减伤下限 1、反伤、移速/采集/精力上限/饱食乘区、鞋子每 2000px 扣 1 耐久。
- [ ] **Step 2: 失败 → 实现 → 通过 → 提交** `feat: apply equipment stats to combat, movement and needs`。

### Task 5: 合成产出装备 + 存档 v3 与迁移

**Files:**
- Modify: `src/systems/craftingSystem.ts`, `src/core/saveVersion.ts`, `src/core/gameState.ts`, `src/systems/saveSystem.ts`
- Test: `tests/unit/saveV3.test.ts`, `tests/unit/craftingSystem.test.ts`

**Interfaces:**
- `SAVE_VERSION = 3`；`settings { muted, sfxVolume }`、`lootSeed`、`lootRolls`、`dungeon.pendingReset`。
- `craft` 对装备类配方产出 `EquipInstance`（普通）而非物品堆叠。
- v2→v3：旧 `club`/`spear` 堆叠转普通装备实例（保留耐久），清空快捷栏旧引用。

- [ ] **Step 1: 测试** v3 往返；v2 迁移保留背包/装备并把旧武器转实例；v1→v3；快捷栏无悬空引用；合成武器生成实例。
- [ ] **Step 2: 失败 → 实现 → 通过 → 提交** `feat: save v3 and equipment crafting`。

### Task 6: 角色行走与攻击动画

**Files:**
- Modify: `src/entities/player.ts`, `src/scenes/IslandScene.ts`, `tests/unit/animation.test.ts`
- Create: `src/entities/playerFrames.ts`（可选并入 player.ts）

**Interfaces:**
- `ensurePlayerFrames(scene)` 生成 `player-idle/walk-a/walk-b` + `slash`。
- `walkFrame(elapsedMs, moving): 'idle'|'walk-a'|'walk-b'`。
- 攻击斩击图 160ms 内逐帧跟随玩家，按角度旋转、按射程缩放。

- [ ] **Step 1: 测试** `walkFrame` 8fps 交替、停止回 idle。
- [ ] **Step 2: 实现帧生成与动画；截图确认。
- [ ] **Step 3: 提交** `feat: animate walking and weapon swings`。

### Task 7: 沉船生成器

**Files:**
- Create: `src/world/dungeonGen.ts`, `tests/unit/dungeonGen.test.ts`

**Interfaces:**
- `generateDungeonFloor(seed, floor): DungeonFloor`（`width`、`height`、`tiles`、`rooms`、`entry`、`stairs`、`chests`、`hazards`、`enemies`）。
- `floor` 1/2 为 40×24，3 为 32×20；房间 3–5/侧；BFS 可达。

- [ ] **Step 1: 测试** 同种子一致、不同种子不同、入口→梯子/所有宝箱可达、房间数量范围、敌人类型含海蛇仅第 3 层。
- [ ] **Step 2: 实现骨架+侧舱 → 通过 → 提交** `feat: generate seeded shipwreck floors`。

### Task 8: 副本敌人与机关逻辑

**Files:**
- Create: `src/entities/dungeonEnemy.ts`, `src/systems/dungeonSystem.ts`, `tests/unit/dungeonSystem.test.ts`

**Interfaces:**
- `createEnemy(type, x, y)`；`tickEnemy(state, enemy, player, dt)`（追击/缩壳/突进/后撤）。
- `applyHazard(state, hazard, dt)`（松动甲板/漏水/塌落）；`dungeonChestLoot(state, chestId, rng)`。

- [ ] **Step 1: 测试** 缩壳减伤 2s/冷却 6s、海蛇突进后撤、漏水精力 -1/s 与移速减半、塌落预警 1s 后 20 伤害。
- [ ] **Step 2: 实现 → 通过 → 提交** `feat: add dungeon enemies and hazards`。

### Task 9: DungeonScene

**Files:**
- Create: `src/scenes/DungeonScene.ts`
- Modify: `src/main.ts`, `src/scenes/BootScene.ts`, `src/scenes/UIScene.ts`

**Interfaces:**
- 进入：岛上破船 E（需火把）；`scene='dungeon'`、`dungeonFloor`；读档回本层入口。
- 渲染：单张画布地形、2× 相机、黑暗遮罩 + 火把光、敌人/机关/宝箱/梯子。
- HUD 复用；副本内隐藏小地图。

- [ ] **Step 1: 实现场景与交互；跑 typecheck。
- [ ] **Step 2: 截图三层/火把；提交** `feat: add shipwreck dungeon scene`。

### Task 10: 进入、周重置与副本存档

**Files:**
- Modify: `src/scenes/IslandScene.ts`, `src/systems/timeSystem.ts`, `src/scenes/BootScene.ts`
- Test: `tests/unit/dungeonReset.test.ts`

**Interfaces:**
- 周一 06:00 重置 `openedChestsThisWeek`/`clearedThisWeek`；副本内记 `pendingReset`，离开结算。
- 岛上世界在副本内继续：时间/需求/劳工/节点；周五入侵黎明抽象结算。

- [ ] **Step 1: 测试** 周一重置、副本内延迟、首通标记不重置、岛内 tick 不依赖渲染。
- [ ] **Step 2: 实现 → 通过 → 提交** `feat: add dungeon reset and headless island ticks`。

### Task 11: 装备 UI、背包与物品图标

**Files:**
- Modify: `src/ui/inventoryPanel.ts`, `src/ui/hud.ts`, `src/ui/assets.ts`
- Create: `src/ui/itemIcons.ts`, `tests/unit/itemIcons.test.ts`

**Interfaces:**
- `itemIcon(baseId): { texture, frame? }`；未知道具回退文字首字。
- 装备槽品级色边框、耐久、点击卸下；网格可点击装备；tooltip 词条、修理按钮。

- [ ] **Step 1: 测试** 每个 `ITEMS` id 有图标或回退；映射稳定。
- [ ] **Step 2: 实现图标与 UI；截图；提交** `feat: add item icons and equipment UI`。

### Task 12: 音频

**Files:**
- Create: `public/assets/audio/*.ogg`, `src/systems/audio.ts`, `tests/unit/audio.test.ts`
- Modify: `src/scenes/BootScene.ts`, `src/scenes/IslandScene.ts`, `src/scenes/PauseScene.ts`, `src/core/gameState.ts`, `LICENSES.md`

**Interfaces:**
- `loadAudio(scene)`；`playSfx(key)`；`settings { muted, sfxVolume }`。
- 音效触发：UI 点击、砍树、采矿、拾取、合成、受击、开箱、传说、预警。

- [ ] **Step 1: 下载 Kenney CC0 音频包，选 12 个 OGG，记录许可。
- [ ] **Step 2: 实现音量/静音与暂停菜单开关；测试设置范围。
- [ ] **Step 3: 提交** `feat: add CC0 sound effects and volume settings`。

### Task 13: 水面动画、地图缩放、卡片布局

**Files:**
- Modify: `src/scenes/IslandScene.ts`, `src/ui/mapPanel.ts`, `src/world/mapView.ts`, `src/ui/buildMenu.ts`, `src/ui/laborPanel.ts`
- Test: `tests/unit/mapView.test.ts`, `tests/unit/chunks.test.ts`

**Interfaces:**
- 区块 3 个水变体，450ms 切换。
- 地图 1×/2× + 拖动；地标/玩家/路线随视口。
- 建造 2×4 卡片；劳工 520×72 滚动卡片。

- [ ] **Step 1: 测试** 地图缩放换算、水面帧循环、卡片 `visibleRows` 边界。
- [ ] **Step 2: 实现 → 通过 → 截图 → 提交** `feat: animate water, zoom map and add card panels`。

### Task 14: 性能与验收

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/*-phase2-*.md`（勾选）
- Test: 全量回归

- [ ] **Step 1:** `npm.cmd run test && npm.cmd run typecheck && npm.cmd run lint && npm.cmd run build`
- [ ] **Step 2:** 1920×1080 截图：白天、夜晚、装备、副本三层、开箱、地图 2×、音频开关。
- [ ] **Step 3:** 浏览器 CPU 采样岛上/副本；低于 50FPS 时优先优化节点可见性。
- [ ] **Step 4:** 更新 README 与许可；提交 `feat: finish phase 2 and visual polish`。
- [ ] **Step 5:** 合并 `visual-overhaul` → `main` 并推送。
