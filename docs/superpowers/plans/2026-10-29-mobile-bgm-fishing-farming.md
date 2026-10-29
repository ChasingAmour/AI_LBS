# 手机端 + 背景音乐 + 钓鱼与种植 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让游戏在手机横屏完整可玩，加入昼夜双轨背景音乐，并新增钓鱼与种植两套可存档玩法。

**Architecture:** 触屏输入与布局放在独立的 `platform`/`touchLayout`/`touchControls` 纯函数与 UI 层；钓鱼、农田生长、音乐增益都写成不依赖 Phaser 的纯函数放进 `systems`，场景只负责表现与输入。存档升 v5，只新增可选设置字段并保留 v1–v4 迁移。

**Tech Stack:** TypeScript strict、Phaser 3.90、Vite 6、Vitest 3、ESLint。

**Spec:** `docs/superpowers/specs/2026-10-29-mobile-bgm-fishing-farming-design.md`

## Global Constraints

- 纯静态、无后端；GitHub Pages，`base: '/AI_LBS/'`。
- 640×360 基准；桌面整数缩放，触屏分数缩放 `fitScale`，最大 2.5。
- 存档键名 `robinson.save.v1`，版本 **5**；v1–v4 自动迁移。
- 音频只用 CC0/可商用免费资源，更新 `LICENSES.md`。
- `src/core`、`data`、`systems`、`world` 不 import Phaser。
- 现有 307 项测试保持通过；每个新纯函数必须有测试。
- 中文 UI；正文 12px、标题 24px；不改现有像素风。

## Review Focus

- 手机竖屏时必须暂停游戏循环，不能让时间/饥饿/入侵在提示遮罩后继续推进。
- 触屏点摇杆/按钮不能同时触发世界攻击、建造或交互；控制区判定必须与渲染区一致。
- 打开任意面板（含背包）必须中断钓鱼，不能留下看不见的会话超时。
- 鱼竿选中且水边 48px 内时，钓鱼只覆盖资源节点与喝水，不抢地面掉落/宝箱/敌人。
- v4 旧档升级 v5 后音乐/触屏默认值必须完整，且旧存档装备、农田、动物不丢。

---

### Task 1: 存档 v5 与设置字段

**Files:**
- Modify: `src/core/gameState.ts`
- Modify: `src/core/saveVersion.ts`
- Modify: `src/systems/saveSystem.ts`
- Test: `tests/unit/saveV5.test.ts`

**Interfaces:**
- Produces: `GameState['settings']` 增加 `musicMuted: boolean`、`musicVolume: number`、`touchControls: boolean`
- Produces: `SAVE_VERSION = 5`、`upgradeToV5(state: GameState): GameState`
- Consumes: 现有 `upgradeToV3`、`upgradeToV4`

- [ ] **Step 1: 写失败测试**

`tests/unit/saveV5.test.ts`：
- `createNewGame(7).settings` 等于 `{ muted: false, sfxVolume: 0.7, musicMuted: false, musicVolume: 0.45, hudCompact: false, touchControls: true }`，`version === 5`。
- v4 存档删除 `musicMuted/musicVolume/touchControls` 后 `validateSave` 返回 v5，且默认值补齐、装备与建筑保留。
- v1 存档一路迁移到 v5。
- `musicVolume: 2` 与 `touchControls: 'yes'` 分别抛 `SaveError`。
- v5 往返 `validateSave(JSON.parse(serializeSave(state)))` 等于原状态。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd run test -- tests/unit/saveV5.test.ts`
Expected: FAIL（字段/版本不存在）。

- [ ] **Step 3: 实现迁移**

- `SAVE_VERSION = 5`。
- `createNewGame` 写入上述默认值。
- `upgradeToV5`：补默认值并校验范围 0..1；`validateSave` 对 v1/v2/v3 走旧链后升级 v5，对 v4 调用 `upgradeToV4` 后 `upgradeToV5`，对 v5 直接校验。
- `validateSave` 校验 `musicVolume` 0..1、`musicMuted`/`touchControls` 为布尔。

- [ ] **Step 4: 运行测试与 typecheck**

Run: `npm.cmd run test -- tests/unit/saveV5.test.ts && npm.cmd run typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/core/gameState.ts src/core/saveVersion.ts src/systems/saveSystem.ts tests/unit/saveV5.test.ts
git commit -m "feat: save v5 settings for music and touch controls"
```

---

### Task 2: 平台检测、分数缩放与竖屏休眠

**Files:**
- Create: `src/core/platform.ts`
- Modify: `src/core/scaling.ts`
- Modify: `src/main.ts`
- Modify: `index.html`
- Modify: `src/style.css`
- Test: `tests/unit/platform.test.ts`
- Test: `tests/unit/scaling.test.ts`（追加）

**Interfaces:**
- Produces: `isTouchDevice(): boolean`
- Produces: `prefersTouchLayout(input: { touch: boolean; width: number; height: number }): boolean`
- Produces: `shouldPauseForPortrait(input: { touch: boolean; width: number; height: number }): boolean`
- Produces: `fitScale(viewW: number, viewH: number, maxScale?: number): ScaleResult`
- Produces: `applyViewportScale(game: Phaser.Game, touch: boolean): void`

- [ ] **Step 1: 写失败测试**

`platform.test.ts`：
- `prefersTouchLayout({touch:true,width:844,height:390}) === true`
- `prefersTouchLayout({touch:false,width:844,height:390}) === false`
- `shouldPauseForPortrait({touch:true,width:390,height:844}) === true`
- 桌面竖屏与触屏横屏均为 false。

`scaling.test.ts` 追加：
- `fitScale(844, 390)` 的 `scale` 约 1.083，`offsetX` 0，`offsetY` 0。
- `fitScale(390, 844)` 的 `scale` 约 0.609。
- `fitScale(3840, 2160, 2.5).scale === 2.5`。
- `fitScale(320, 180)` 不低于 0.5。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd run test -- tests/unit/platform.test.ts tests/unit/scaling.test.ts`
Expected: FAIL（函数不存在）。

- [ ] **Step 3: 实现平台与缩放**

- `platform.ts`：按上面的签名实现；`prefersTouchLayout` 用 `touch && Math.min(width,height) < 900`。
- `scaling.ts`：`fitScale` 计算 `Math.min(w/640,h/360)`，`clamp(0.5,maxScale)`，offset 居中取整。
- `main.ts`：`touch = isTouchDevice()`；触屏调用 `applyViewportScale`，桌面沿用 `integerScale`；监听 `resize` 与 `orientationchange`。
- `index.html` 增加 `#rotate-hint`（默认隐藏，含“请横屏游玩”和“进入全屏”按钮），viewport 加 `maximum-scale=1, user-scalable=no, viewport-fit=cover`。
- `style.css`：`touch-action:none`、`overscroll-behavior:none`、禁止选中与点击高亮；`#rotate-hint` 固定全屏、`z-index:100`、仅竖屏显示。
- `main.ts`：触屏竖屏时 `game.loop.sleep()`、`#rotate-hint` 显示；横屏 `game.loop.wake()` 并隐藏。全屏按钮调用 `document.documentElement.requestFullscreen()`，失败静默。
- 首次 `pointerdown` 调 `game.sound.context.resume()`。

- [ ] **Step 4: 运行测试、typecheck、build**

Run: `npm.cmd run test -- tests/unit/platform.test.ts tests/unit/scaling.test.ts && npm.cmd run typecheck && npm.cmd run build`
Expected: PASS。

- [ ] **Step 5: 手动验证**

Run: `npm.cmd run dev`；Chrome 设备模拟 390×844 应出现横屏提示且游戏不推进；844×390 应铺满并隐藏提示。

- [ ] **Step 6: 提交**

```bash
git add src/core/platform.ts src/core/scaling.ts src/main.ts index.html src/style.css tests/unit/platform.test.ts tests/unit/scaling.test.ts
git commit -m "feat: touch-aware scaling and portrait pause"
```

---

### Task 3: 触屏布局、虚拟摇杆/按钮与输入桥

**Files:**
- Create: `src/ui/touchLayout.ts`
- Create: `src/ui/touchControls.ts`
- Modify: `src/scenes/UIScene.ts`
- Modify: `src/scenes/IslandScene.ts`
- Modify: `src/scenes/DungeonScene.ts`
- Test: `tests/unit/touchLayout.test.ts`
- Test: `tests/unit/combatSystem.test.ts`（追加自动瞄准）

**Interfaces:**
- Produces: `JOYSTICK`、`TOUCH_BUTTONS`、`isTouchControlPoint(x: number, y: number): boolean`
- Produces: `autoAimAngle(player: {x:number;y:number}, targets: Array<{x:number;y:number}>, facing: 'up'|'down'|'left'|'right', maxDist: number): number`
- Produces: `class TouchControls { constructor(scene: Phaser.Scene); setVisible(visible: boolean): void; setInteractLabel(label: string): void; destroy(): void }`
- Registry: `touchMove: {x:number;y:number}`、`touchSprint: boolean`、`touchEnabled: boolean`
- Game events: `ui:touchAttack`、`ui:touchInteract`

- [ ] **Step 1: 写失败测试**

`touchLayout.test.ts`：
- 摇杆中心/边缘返回 true，屏幕中央返回 false。
- 攻击、交互、奔跑、菜单四个按钮中心返回 true。
- 角落 (0,0) 与 (640,360) 返回 false。

`combatSystem.test.ts` 追加：
- 目标在 80px 内时 `autoAimAngle` 等于瞄准该目标的角度。
- 无目标时返回朝向对应角度（上 `-π/2`、下 `π/2`、左 `π`、右 `0`）。
- 最近目标优先。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd run test -- tests/unit/touchLayout.test.ts tests/unit/combatSystem.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现布局与输入桥**

- `touchLayout.ts`：摇杆 `(64,300)` 半径 34、拖动半径 60；按钮：攻击 `(604,252) r26`、交互 `(548,294) r22`、奔跑 `(500,296) r16`、菜单 `(604,196) r18`；`isTouchControlPoint` 覆盖这些圆。
- `touchControls.ts`：Graphics + Text 绘制；摇杆 pointerdown/move/up 限制在左半屏，写 `touchMove`；按钮 pointerdown 发事件；奔跑切换写 `touchSprint`；菜单按钮发 `ui:touchMenu`。
- `UIScene.create`：`prefersTouchLayout(...) && state.settings.touchControls` 时创建并写 `touchEnabled`；`uiOpen` 时摇杆归零。
- `IslandScene.update`：读 `touchMove`；键盘有输入时键盘优先；`touchSprint` 或 Shift 触发奔跑。`update` 里向注册表写交互提示时同步 `touchControls.setInteractLabel`。
- `IslandScene` 监听 `ui:touchInteract` 调 `beginInteraction()`；`ui:touchAttack` 用 `autoAimAngle` 对最近的野人/动物算角度，再走现有攻击逻辑。
- `DungeonScene` 同样读 `touchMove`/`touchSprint`，`ui:touchAttack` 用最近敌人角度。
- `IslandScene` 与 `DungeonScene` 的 `pointerdown` 在 `isTouchControlPoint(pointer.x, pointer.y)` 时直接 return。

- [ ] **Step 4: 运行测试与 typecheck**

Run: `npm.cmd run test -- tests/unit/touchLayout.test.ts tests/unit/combatSystem.test.ts && npm.cmd run typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/ui/touchLayout.ts src/ui/touchControls.ts src/scenes/UIScene.ts src/scenes/IslandScene.ts src/scenes/DungeonScene.ts src/systems/combatSystem.ts tests/unit/touchLayout.test.ts tests/unit/combatSystem.test.ts
git commit -m "feat: touch joystick, action buttons and input bridge"
```

---

### Task 4: 触屏菜单、面板翻页与触摸交互

**Files:**
- Create: `src/ui/touchMenu.ts`
- Modify: `src/scenes/UIScene.ts`
- Modify: `src/ui/panel.ts`
- Modify: `src/ui/inventoryPanel.ts`
- Modify: `src/ui/mapPanel.ts`
- Modify: `src/scenes/IslandScene.md`（不涉及；建造点击改在 `IslandScene.ts`）
- Modify: `src/scenes/IslandScene.ts`
- Modify: `src/scenes/PauseScene.ts`
- Test: `tests/unit/touchLayout.test.ts`（追加页面按钮区域）
- Test: `tests/unit/scrollList.test.ts`（若新增纯函数）

**Interfaces:**
- Produces: `class TouchMenu { constructor(scene, handlers); toggle(state): void; close(): void; get isOpen(): boolean }`
- Produces: `isTouchMode(): boolean`（供 UI 组件读取 registry）
- `Panel` 在触屏且 `rows.length > perPage` 时显示“上一页/下一页”可点区域。
- `InventoryOverlay` 触屏：同一格 1.5s 内第二次点击执行装备/食用，第一次只显示 tooltip。

- [ ] **Step 1: 写失败测试**

- `touchLayout.test.ts` 追加：翻页按钮矩形命中测试（`PANEL_PREV`、`PANEL_NEXT`）。
- `scrollList.test.ts` 若新增 `pageWindow(total, scroll, perPage, delta)`，测试向前/向后/边界钳制。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd run test -- tests/unit/touchLayout.test.ts tests/unit/scrollList.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现触屏菜单与面板适配**

- `touchMenu.ts`：半透明面板 + 按钮（背包/合成/建造/劳工/地图/冒险/暂停/全屏/关闭），复用 `Panel` 或自绘；点按钮调用 `UIScene` 的 open 方法；打开面板后菜单按钮显示“×”并关闭当前面板。
- `UIScene`：监听 `ui:touchMenu`；`closeAllPanels()`；打开面板时把 `touchEnabled` 保持为 true，但摇杆写入 0。
- `Panel`：构造参数/`setTouch` 读取 registry `touchEnabled`；触屏时在底部左右加“上一页/下一页”文字按钮；`open` 风格不变。
- `InventoryOverlay`：触屏 pointerdown 先 `showStackTooltip/showGearTooltip`，记录 `lastTapKey/lastTapAt`；1.5s 内同 key 再点才执行 `consumeFood/equipInstance/unequipSlot/repair`。鼠标逻辑不变。
- `MapPanel`：在缩放标签旁加 `−`/`+` 可点文字，触屏也能缩放；拖动已存在。
- `IslandScene`：触屏且 `buildSelection` 时，pointerdown 若不在控制区，直接用 `pointer.worldX/worldY` 对应瓦片调用现有放置逻辑（先 `updateBuildGhost` 再确认），点空地即建；无效显示原因。
- `PauseScene`：按钮高度 36；触屏设备显示“触屏控制 开/关”并写 `state.settings.touchControls`；音乐设置留给 Task 5。
- 所有面板顶栏加可点“×”（或触屏菜单按钮的 ×）关闭。

- [ ] **Step 4: 运行测试、typecheck、build**

Run: `npm.cmd run test -- tests/unit/touchLayout.test.ts tests/unit/scrollList.test.ts && npm.cmd run typecheck && npm.cmd run build`
Expected: PASS。

- [ ] **Step 5: 手动验证**

设备模拟 844×390：开背包点一次看 tooltip、点两次穿戴；建造点地面直接放置；地图 +/− 生效。

- [ ] **Step 6: 提交**

```bash
git add src/ui/touchMenu.ts src/scenes/UIScene.ts src/ui/panel.ts src/ui/inventoryPanel.ts src/ui/mapPanel.ts src/scenes/IslandScene.ts src/scenes/PauseScene.ts tests/unit/touchLayout.test.ts tests/unit/scrollList.test.ts
git commit -m "feat: touch menu, panel paging and tap interactions"
```

---

### Task 5: CC0 双轨背景音乐与设置

**Files:**
- Create: `src/systems/music.ts`
- Create: `public/assets/music/day.ogg`、`public/assets/music/night.ogg`
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/scenes/UIScene.ts`
- Modify: `src/scenes/PauseScene.ts`
- Modify: `LICENSES.md`
- Test: `tests/unit/music.test.ts`

**Interfaces:**
- Produces: `loadMusic(scene: Phaser.Scene): void`
- Produces: `musicEnabled(state: GameState): boolean`
- Produces: `musicGain(state: GameState): number`
- Produces: `trackForPhase(phase: 'day'|'night'): 'day'|'night'`
- Produces: `class MusicManager { constructor(scene: Phaser.Scene); update(state: GameState): void; setPaused(paused: boolean): void; destroy(): void }`

- [ ] **Step 1: 下载并试听 CC0 音乐**

- 从 OpenGameArt 下载两首 CC0 循环；优先 OGG，体积控制在 4MB 内。
- 用 `ffprobe`/浏览器确认可解码；循环点不完美时保留 1.5s 淡入淡出。
- 文件命名 `day.ogg`、`night.ogg`；把作者、来源 URL、许可证写入 `LICENSES.md` 表格。

- [ ] **Step 2: 写失败测试**

`music.test.ts`：
- 默认 `musicEnabled(createNewGame(1)) === true`，`musicGain` 约 0.45。
- `musicMuted = true` → `musicGain === 0`；`musicVolume = 0` → 0。
- `musicVolume = 1` → 1。
- `trackForPhase('day') === 'day'`、`('night') === 'night'`。

- [ ] **Step 3: 实现音乐管理器**

- `music.ts`：按接口实现；`MusicManager` 持有两个 `Phaser.Sound.BaseSound`，`update` 比较当前 track，切换时用 `scene.tweens.addCounter` 1.5s 调音量；`setPaused` 暂停/恢复；无音频缓存时静默返回。
- `loadMusic` 在 `BootScene.preload` 调 `scene.load.audio('music-day','assets/music/day.ogg')` 等。
- `UIScene.create`：从 registry 取/建 `musicManager`；`update()` 每帧 `update(state)`；`PauseScene` 启动时 `setPaused(true)`，恢复时 false。
- `PauseScene`：音乐开关、音乐音量 −/+（0.1 步进）、音效开关；保存设置并立即生效。
- 首次 pointerdown 已由 Task 2 解锁音频。

- [ ] **Step 4: 运行测试、typecheck、build**

Run: `npm.cmd run test -- tests/unit/music.test.ts && npm.cmd run typecheck && npm.cmd run build`
Expected: PASS；构建产物含两首音乐。

- [ ] **Step 5: 提交**

```bash
git add src/systems/music.ts public/assets/music src/scenes/BootScene.ts src/scenes/UIScene.ts src/scenes/PauseScene.ts LICENSES.md tests/unit/music.test.ts
git commit -m "feat: day/night CC0 background music with volume controls"
```

---

### Task 6: 钓鱼数据、物品与纯状态机

**Files:**
- Create: `src/data/fishing.ts`
- Create: `src/systems/fishingSystem.ts`
- Modify: `src/data/items.ts`
- Modify: `src/data/recipes.ts`
- Modify: `src/ui/itemIcons.ts`
- Modify: `src/systems/dataValidation.ts`
- Test: `tests/unit/fishingSystem.test.ts`
- Test: `tests/unit/equipmentUi.test.ts`（图标覆盖）

**Interfaces:**
- Produces: `FISHING_ROD_ID = 'fishing_rod'`
- Produces: `FISH_LOOT: Array<{ baseId: string; weight: number }>`
- Produces: `type FishingPhase = 'casting'|'waiting'|'bite'|'reeling'|'done'|'failed'`
- Produces: `interface FishingSession { phase; timer; taps; needed; result }`
- Produces: `startFishing(rng: Rng): FishingSession`
- Produces: `tickFishing(session: FishingSession, dt: number): void`
- Produces: `tapFishing(session: FishingSession): void`
- Produces: `rollCatch(rng: Rng): ItemStack[]`

- [ ] **Step 1: 写失败测试**

`fishingSystem.test.ts`：
- 新会话 `phase === 'casting'`，`timer` 约 0.6。
- `tickFishing(0.6)` → `waiting`，等待时长在 1.2–3.0。
- 等待结束 → `bite`；`bite` 内 `tapFishing` → `reeling`。
- `bite` 1.2s 不点 → `failed`。
- `reeling` 连点 3 次 → `done`、`result='success'`；2.5s 未点满 → `failed`。
- `rollCatch` 40 次：id 均在 `raw_fish/tropical_fish/seaweed/flint/cloth` 中，数量 1–2，且至少出现一次生鱼。
- 数据完整性：`fishing_rod` 在 `ITEMS`、配方可产出、图标非空。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd run test -- tests/unit/fishingSystem.test.ts tests/unit/equipmentUi.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现数据与状态机**

- `items.ts`：`fishing_rod`（tool，耐久 60）、`tropical_fish`（food：hunger 12、thirst 5）、`seaweed`（material）。
- `recipes.ts`：`fishing_rod`，工作台 Lv1，木 3 + 绳子 2，3s。
- `itemIcons.ts` 增加三个 16×16 图标；`GENERATED` 集合同步。
- `fishing.ts`：掉落权重 `raw_fish 62`、`tropical_fish 18`、`seaweed 12`、`flint 4`、`cloth 4`；成功先 1 件，20% 再独立 1 件。
- `fishingSystem.ts`：状态机按上面的时间值；`rollCatch` 用权重抽取并返回 1–2 个 `ItemStack`。
- `dataValidation.ts` 已检查配方产物/图标，无需新增规则（若新增 `CROPS` 在 Task 8 处理）。

- [ ] **Step 4: 运行测试与 typecheck**

Run: `npm.cmd run test -- tests/unit/fishingSystem.test.ts tests/unit/equipmentUi.test.ts && npm.cmd run typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/data/fishing.ts src/systems/fishingSystem.ts src/data/items.ts src/data/recipes.ts src/ui/itemIcons.ts src/systems/dataValidation.ts tests/unit/fishingSystem.test.ts tests/unit/equipmentUi.test.ts
git commit -m "feat: fishing data and catch state machine"
```

---

### Task 7: 钓鱼接入岛场景与触屏

**Files:**
- Modify: `src/systems/interactionSystem.ts`
- Modify: `src/scenes/IslandScene.ts`
- Modify: `src/ui/touchControls.ts`
- Test: `tests/unit/interactionSystem.test.ts`（追加钓鱼优先级）

**Interfaces:**
- `InteractKind` 增加 `'fishing'`
- `InteractOptions` 增加 `nearWater?: boolean`、`hasRod?: boolean`
- 钓鱼目标 rank `4.5`（高于资源节点 4、低于地面掉落 5）。
- `IslandScene` 持有 `fishing: FishingSession | null` 与浮标/鱼线 Graphics。

- [ ] **Step 1: 写失败测试**

`interactionSystem.test.ts` 追加：
- `hasRod:true, nearWater:true` 且附近有树节点时返回 `kind === 'fishing'`。
- 附近有地面掉落时返回 `groundLoot`（掉落优先）。
- `hasRod:false` 时返回节点/喝水，不返回 fishing。
- `nearWater:false` 不返回 fishing。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd run test -- tests/unit/interactionSystem.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现交互与水边判定**

- `findInteractTarget`：在建筑/沉船/宝箱之后、地面掉落之前 `consider({kind:'fishing', id:'fishing', label:'钓鱼', x:px, y:py, durationSec:0}, 4.5)`，仅当 `hasRod && nearWater`。
- `IslandScene`：`nearestWater(x,y,radius=48)` 扫描周围瓦片，返回最近的 `shallowWater/stream/deepWater` 点；`hasRod` = 快捷栏选中的 `fishing_rod` 且耐久 >0。
- `beginInteraction`：`kind === 'fishing'` 时 `startFishing`，扣鱼竿耐久 1，建立鱼线/浮标；否则走原逻辑。
- 每帧 `tickFishing`；`E`/触屏交互在 `bite` 调 `tapFishing`，在 `reeling` 调 `tapFishing`；`done` 时 `rollCatch` + `collectLoot` + 音效 + 横幅；`failed` 提示“鱼跑了”。
- 移动（输入非零）、`uiOpen`、受击（HP 下降）时清空会话与浮标。
- `touchControls.setInteractLabel`：钓鱼中显示“提竿/收线”，否则恢复提示。
- 钓鱼表现：`Graphics` 画线 + 小圆浮标；`bite` 时头顶“！”文字 + `warning` 音效；`reeling` 在 HUD 进度用 `interactProgress` 或横幅显示 3 个点。

- [ ] **Step 4: 运行测试、typecheck、build**

Run: `npm.cmd run test -- tests/unit/interactionSystem.test.ts && npm.cmd run typecheck && npm.cmd run build`
Expected: PASS。

- [ ] **Step 5: 手动验证**

在浅水边选中鱼竿按 E：抛竿、咬钩、3 次收线；移动/开背包中断；耐久递减。

- [ ] **Step 6: 提交**

```bash
git add src/systems/interactionSystem.ts src/scenes/IslandScene.ts src/ui/touchControls.ts tests/unit/interactionSystem.test.ts
git commit -m "feat: fishing interaction, visuals and touch support"
```

---

### Task 8: 农田、作物、水袋数据与纯逻辑

**Files:**
- Create: `src/data/farming.ts`
- Create: `src/systems/farmingSystem.ts`
- Modify: `src/core/gameState.ts`
- Modify: `src/data/buildings.ts`
- Modify: `src/data/items.ts`
- Modify: `src/data/recipes.ts`
- Modify: `src/ui/itemIcons.ts`
- Modify: `src/ui/assets.ts`
- Modify: `src/systems/buildingSystem.ts`
- Test: `tests/unit/farming.test.ts`
- Test: `tests/unit/buildingSystem.test.ts`（追加农田）

**Interfaces:**
- Produces: `CROPS: Record<string, CropDef>`
- Produces: `BuildingInstance['crop']?: { seedId: string; growth: number; wateredDay: number; plantedDay: number }`
- Produces: `cropDef(seedId: string): CropDef | null`
- Produces: `cropStage(crop: NonNullable<BuildingInstance['crop']>): 0|1|2|3`
- Produces: `plantCrop(state: GameState, buildingId: string, seedId: string): boolean`
- Produces: `waterCrop(state: GameState, buildingId: string): boolean`
- Produces: `tickFarms(state: GameState, previousDay: number): void`
- Produces: `harvestCrop(state: GameState, buildingId: string, rng: Rng): ItemStack[] | null`
- Produces: `fillWaterskin(state: GameState): boolean`

- [ ] **Step 1: 写失败测试**

`farming.test.ts`：
- 农田空 → `plantCrop('berries')` 扣 1 浆果，crop `growth=0`。
- 无种子 → false；非农田 → false。
- `tickFarms` 浇水日：+2；未浇水：+1；第 2 天成熟（浆果）。
- 椰子需要 3 天浇水（growth 6）。
- `harvestCrop` 成熟时产出 3–5 浆果并清空 crop；未成熟返回 null。
- `waterCrop` 消耗水袋 1 点，`wateredDay = state.time.day`；无水袋 false。
- `fillWaterskin` 把耐久补到 3，返回 true；没有水袋 false。
- 存档往返保留 crop。

`buildingSystem.test.ts` 追加：
- `farm_plot` 可放置、成本木 4 + 藤 2、`blocks === false`。
- 放置后 `crop` 为 undefined。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd run test -- tests/unit/farming.test.ts tests/unit/buildingSystem.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现数据与系统**

- `buildings.ts`：`farm_plot`（农田，木 4 + 藤 2，hp 40，Lv1，`blocks:false`）。
- `items.ts`：`waterskin`（tool，耐久 3）；`recipes.ts`：布 2 + 藤 1，手工，3s。
- `farming.ts`：`CROPS` 按设计；`farmingSystem.ts` 实现上述函数。
- `GameState`/`BuildingInstance` 增加可选 `crop`；`createNewGame` 不预置农田。
- `itemIcons.ts` 增加水袋/农田/幼苗/成熟图标；`assets.ts` 增加 `farm` 建筑贴图与作物阶段贴图（代码绘制）。
- `buildingSystem.placeBuilding` 对 `farm_plot` 不初始化 crop（undefined 即可）。

- [ ] **Step 4: 运行测试与 typecheck**

Run: `npm.cmd run test -- tests/unit/farming.test.ts tests/unit/buildingSystem.test.ts && npm.cmd run typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/data/farming.ts src/systems/farmingSystem.ts src/core/gameState.ts src/data/buildings.ts src/data/items.ts src/data/recipes.ts src/ui/itemIcons.ts src/ui/assets.ts src/systems/buildingSystem.ts tests/unit/farming.test.ts tests/unit/buildingSystem.test.ts
git commit -m "feat: farm plots, crops and waterskin logic"
```

---

### Task 9: 农田接入岛场景、水袋与过夜生长

**Files:**
- Modify: `src/systems/interactionSystem.ts`
- Modify: `src/scenes/IslandScene.ts`
- Modify: `src/scenes/UIScene.ts`
- Modify: `src/scenes/DungeonScene.ts`
- Test: `tests/unit/interactionSystem.test.ts`（追加农田/水袋）
- Test: `tests/unit/saveV5.test.ts`（追加 crop 往返）

**Interfaces:**
- `InteractKind` 增加 `'farm'`
- `findInteractTarget` 建筑分支对 `farm_plot` 生成 label：
  - 空：“种植（E）”
  - 生长中未浇水：“浇水”
  - 已浇水：“查看农田”
  - 成熟：“收获”
- `UIScene` 监听 `ui:seedPicker`，用 `Panel` 列出可用种子。
- 岛/副本 `time:dayChanged` 调 `tickFarms(state, previousDay)`。

- [ ] **Step 1: 写失败测试**

`interactionSystem.test.ts` 追加：
- 空农田返回 `kind='farm'`、label 含“种植”。
- 成熟农田 label 含“收获”。
- 淡水边有水袋时 label 为“装满水袋”，没有水袋时为“喝水”。

`saveV5.test.ts` 追加：带 crop 的农田 v5 序列化往返相等。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd run test -- tests/unit/interactionSystem.test.ts tests/unit/saveV5.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现接入**

- `interactionSystem`：`farm_plot` 作为 `building` 目标但 `kind='farm'`；水边目标根据 `fillWaterskin` 条件改 label。
- `IslandScene.beginInteraction`：
  - `farm`：空田 → `game.events.emit('ui:seedPicker', buildingId)`；生长中 → `waterCrop`；成熟 → `harvestCrop` 并 `collectLoot`。
  - `water`：先 `fillWaterskin`，成功则提示“水袋装满了”，否则原喝水。
- `UIScene`：`ui:seedPicker` 打开 `Panel`，行=背包中可用的浆果/椰子；点击调 `plantCrop` 并关闭。
- `IslandScene`/`DungeonScene` 的 `time:dayChanged`：记录 `previousDay = state.time.day` 在推进前，调用 `tickFarms(this.state, previousDay)`；农田贴图/作物阶段在 `syncBuildings` 与日切时刷新。
- `IslandScene.syncBuildings`：为每个农田维护 `cropSprites`（4 阶段），crop 为空隐藏。
- 拆除农田时销毁作物贴图。

- [ ] **Step 4: 运行测试、typecheck、build**

Run: `npm.cmd run test -- tests/unit/interactionSystem.test.ts tests/unit/saveV5.test.ts && npm.cmd run typecheck && npm.cmd run build`
Expected: PASS。

- [ ] **Step 5: 手动验证**

建造农田 → 种植浆果 → 用水袋浇水 → 过夜 → 成熟 → 收获；不浇水则多等一天。

- [ ] **Step 6: 提交**

```bash
git add src/systems/interactionSystem.ts src/scenes/IslandScene.ts src/scenes/UIScene.ts src/scenes/DungeonScene.ts tests/unit/interactionSystem.test.ts tests/unit/saveV5.test.ts
git commit -m "feat: farm interaction, waterskin and overnight growth"
```

---

### Task 10: 手机端 QA、性能、文档与上线

**Files:**
- Modify: `README.md`
- Modify: `LICENSES.md`
- Modify: `工作完成.md`
- Modify: `docs/superpowers/specs/2026-10-29-mobile-bgm-fishing-farming-design.md`（勾选完成项）

- [ ] **Step 1: 全量验证**

Run:
```
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```
Expected: 全部通过；测试数 ≥ 307。

- [ ] **Step 2: 手机模拟截图**

用 Chrome CDP `Emulation.setDeviceMetricsOverride` + `Emulation.setTouchEmulationEnabled`：
- 844×390：海岛、摇杆、攻击/交互、背包、建造、地图。
- 390×844：横屏提示且游戏循环暂停。
- 钓鱼咬钩/收线、农田四阶段、暂停音乐设置。
截图保存到临时目录检查。

- [ ] **Step 3: 性能**

无头 Chrome 1920×1080 与 844×390 各测海岛/沉船/地图；低于 50FPS 时先关水面三帧动画或降低节点刷新频率，再复测。

- [ ] **Step 4: 文档**

- `README.md`：操作表加手机/触屏、音乐、钓鱼、农田；存档版本 v5；已知限制更新。
- `LICENSES.md`：两首音乐作者/来源/CC0。
- `工作完成.md`：新增章节与验证结果。
- 设计稿勾选已完成项。

- [ ] **Step 5: 提交、合并、推送**

```bash
git add -A
git commit -m "feat: mobile support, background music, fishing and farming"
git -C "D:/0_AllProgram/AI_LBS" merge --ff-only visual-overhaul
git -C "D:/0_AllProgram/AI_LBS" push origin main
```

- [ ] **Step 6: 确认部署**

轮询 `https://api.github.com/repos/ChasingAmour/AI_LBS/actions/runs?branch=main&per_page=1`，确认最新 run `conclusion === 'success'`；打开线上页面截图确认。

---

## Self-Review

- **Spec coverage:** 手机缩放/竖屏/触控/面板/建造/暂停、BGM 双轨/音量/存档、钓鱼数据/状态机/交互/表现、农田数据/生长/水袋/交互/存档、v5 迁移、验证与上线均有对应任务。
- **Step scan:** 每个任务以失败测试开始、实现、通过、提交；没有“TBD/适当处理”步骤。
- **Type consistency:** `FishingSession`、`CropDef`、`crop`、`fitScale`、`isTouchControlPoint`、`tickFarms` 在前后任务中名称一致。
- **Review Focus:** 竖屏休眠、控制区指针隔离、面板中断钓鱼、钓鱼优先级、v4→v5 数据完整均有对应测试或手动验证。
- **Proportion:** 任务边界按可独立验收的功能划分，代码块只保留接口与关键数值。
