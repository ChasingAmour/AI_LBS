# 沉船楼层入口、出口与清空状态 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** 每层沉船都有可见入口与出口、能上楼，清空本层后提示出口，且已清空的楼层重新进入不再刷怪。

**Architecture:** 生成器新增 `exit` 瓦片；纯逻辑（清空标记、重置）放 `systems/dungeonReset.ts`；`DungeonScene` 只负责绘制、交互与箭头。

**Tech Stack:** TypeScript、Phaser 3.90、Vitest。

**Spec:** `docs/superpowers/specs/2026-10-28-dungeon-stairs-design.md`

## Global Constraints

- 存档版本保持 v4；`clearedFloors` 缺失按 `[]` 补齐。
- 全部测试、`typecheck`、`lint`、`build` 通过。

---

### Task 1: 入口瓦片

**Files:** `src/world/dungeonGen.ts`、`tests/unit/dungeonGen.test.ts`

- [ ] 写失败测试：每层 `entry` 瓦片等于 `DUNGEON_TILE.exit`，且 `isDungeonWalkable(DUNGEON_TILE.exit)` 为真。
- [ ] 跑测试确认失败。
- [ ] 实现：新增 `exit: 7`，`generateDungeonFloor` 在 `entry` 写入该瓦片，`isDungeonWalkable` 包含它。
- [ ] 跑测试确认通过，提交 `feat: mark the dungeon entry tile`。

### Task 2: 清空状态与重置

**Files:** `src/core/gameState.ts`、`src/systems/dungeonReset.ts`、`src/systems/saveSystem.ts`、`tests/unit/dungeonReset.test.ts`

- [ ] 写失败测试：`markFloorCleared` 写入且幂等、`isFloorCleared` 查询、`tickWeekReset` 清空、离开副本的延迟重置清空、缺字段的 v4 存档读入为 `[]`。
- [ ] 跑测试确认失败。
- [ ] 实现：`GameState.dungeon.clearedFloors: number[]`；`markFloorCleared(state, floor)`、`isFloorCleared(state, floor)`；两处重置清空；`validateSave` 缺字段补 `[]`。
- [ ] 跑测试确认通过，提交 `feat: remember cleared dungeon floors for the week`。

### Task 3: 入口/出口交互与光柱

**Files:** `src/scenes/DungeonScene.ts`

- [ ] 交互：`entry` 处按 E → 第 1 层 `exitDungeon()`，第 2/3 层 `previousFloor()`；`stairs` 处 → 第 3 层 `exitDungeon()`，否则 `nextFloor()`。
- [ ] 进入楼层时若 `isFloorCleared` 则不生成敌人并显示光柱。
- [ ] 本层敌人全灭 → `markFloorCleared`、横幅「本层已清空」、光柱。
- [ ] `previousFloor()`：`dungeonFloor - 1`，保存并 `scene.restart()`。
- [ ] 跑全量测试与 `typecheck`，提交 `feat: add dungeon entrances, exits and cleared floors`。

### Task 4: 出口方向箭头

**Files:** `src/scenes/DungeonScene.ts`

- [ ] 创建固定屏幕的箭头（`setScrollFactor(0)`），每帧指向楼梯；楼梯在视野内时隐藏。
- [ ] 跑全量测试与 `lint`，提交 `feat: point at the dungeon exit`。

### Task 5: 全量验证

- [ ] `npm run test`、`typecheck`、`lint`、`build` 全绿。
- [ ] 提交 `chore: verify dungeon stairs changes`。
