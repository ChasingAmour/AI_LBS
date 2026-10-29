# 开场故事 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 新档进入海岛前播放 5 屏可跳过的像素故事，交代沉船与漂流经过；老档可从暂停菜单重看。

**Architecture:** 故事文本与触发条件放进纯数据/纯函数 `src/data/introStory.ts`，`IntroScene` 只负责逐屏渲染、输入与跳转；`flags.introSeen` 记录是否看过，不升存档版本。

**Tech Stack:** TypeScript strict、Phaser 3.90、Vite 6、Vitest 3。

**Spec:** `docs/superpowers/specs/2026-10-29-intro-story-design.md`

## Global Constraints

- 640×360 基准；桌面整数缩放，手机分数缩放；竖屏由现有遮罩拦截。
- 只用现有字体与程序化像素画，不新增外部美术资源。
- 新档首次播放；老档不强制；暂停菜单可重看。
- 存档版本保持 v5；`introSeen` 为可选布尔字段。
- 现有 354 项测试保持通过。

## Review Focus

- 新档第一次进入必须看到故事；从故事跳过/看完后再次进入不能重复播放。
- 老档（`main`/`backup`）不能被强制拉进故事，即使缺少 `introSeen`。
- 跳过与 lasted 屏都必须写入 `introSeen` 并保存，刷新后不再出现。
- 手机点击任意处推进；竖屏提示优先，不能在遮罩后播放故事。
- 暂停重看结束后必须回到原游戏，不能把海岛/UI 留在暂停状态。

---

### Task 1: 故事数据、触发条件与存档 flag

**Files:**
- Create: `src/data/introStory.ts`
- Modify: `src/core/gameState.ts`
- Test: `tests/unit/introStory.test.ts`

**Interfaces:**
- Produces: `INTRO_STORY: Array<{ title: string; body: string; scene: IntroSceneKind }>`
- Produces: `type IntroSceneKind = 'harbor' | 'storm' | 'drift' | 'beach' | 'island'`
- Produces: `shouldPlayIntro(state: GameState, source: 'main'|'backup'|'none'): boolean`
- Produces: `markIntroSeen(state: GameState): void`
- Modify: `GameState['flags']` 增加可选 `introSeen?: boolean`；`createNewGame` 默认 `false`。

- [x] **Step 1: 写失败测试**

`tests/unit/introStory.test.ts`：
- `INTRO_STORY` 正好 5 屏；每屏 title/body 非空；最后一屏 body 含“第一天”。
- 新档 `createNewGame(1)` + `source:'none'` → `shouldPlayIntro === true`。
- `markIntroSeen` 后同样条件 → false。
- `source:'main'` 或 `'backup'` 即使未看过 → false。
- `markIntroSeen` 把 `flags.introSeen` 设为 true。

- [x] **Step 2: 运行测试确认失败**

Run: `npm.cmd run test -- tests/unit/introStory.test.ts`
Expected: FAIL（模块/字段不存在）。

- [x] **Step 3: 实现数据与条件**

- `introStory.ts`：5 张卡片，文本按设计稿；`shouldPlayIntro` 仅 `source === 'none' && !state.flags.introSeen`。
- `gameState.ts`：flags 类型加 `introSeen?: boolean`，新档默认 false。

- [x] **Step 4: 运行测试与 typecheck**

Run: `npm.cmd run test -- tests/unit/introStory.test.ts && npm.cmd run typecheck`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/data/introStory.ts src/core/gameState.ts tests/unit/introStory.test.ts
git commit -m "feat: add intro story data and trigger"
```

---

### Task 2: IntroScene 五屏播放与启动流程

**Files:**
- Create: `src/scenes/IntroScene.ts`
- Modify: `src/main.ts`
- Modify: `src/scenes/BootScene.ts`
- Test: 手动/CDP 截图

**Interfaces:**
- `IntroScene` 构造 key `'IntroScene'`；`create(data: { replay?: boolean } = {})`。
- 消费：`INTRO_STORY`、`markIntroSeen`、`saveGame`、`makeText`、`drawPanel`、`COLORS/TINTS`。
- BootScene：`loadGameResult()` 后，`shouldPlayIntro(state, loaded.source)` 为 true → `scene.start('IntroScene')`，否则原逻辑。

- [x] **Step 1: 实现 IntroScene**

- 5 个场景用 Graphics/Canvas 程序化绘制：港口船影、风暴闪电、黑海木箱、黎明海滩、破船海岸；底部文字面板显示 title + body。
- 点击任意处、SPACE、ENTER 下一屏；ESC 或右上角“跳过”直接结束；手机上点屏幕即可。
- 最后一屏 400ms 淡出；结束统一 `finish()`：`markIntroSeen`、`saveGame`、普通流程 `scene.start('IslandScene')`，重看流程恢复 `IslandScene`/`UIScene` 并停止自己。
- 进入时 `this.cameras.main.fadeIn(250)`；每屏文字/插画淡入。
- 不启动 UIScene，不播放背景音乐；进入海岛后由 UIScene 接管。

- [x] **Step 2: 接入启动流程与场景列表**

- `main.ts` 场景数组加入 `IntroScene`。
- `BootScene.create` 调 `shouldPlayIntro`；开发用 `?dungeon=` 时不播放故事。

- [x] **Step 3: 运行 typecheck/build**

Run: `npm.cmd run typecheck && npm.cmd run build`
Expected: PASS。

- [x] **Step 4: 手动验证新档**

清 localStorage 后打开：出现 5 屏；点击推进；跳过直接进海岛；刷新后不再出现。

- [x] **Step 5: 提交**

```bash
git add src/scenes/IntroScene.ts src/main.ts src/scenes/BootScene.ts
git commit -m "feat: add five-card intro story scene"
```

---

### Task 3: 暂停重看、手机适配、文档与上线

**Files:**
- Modify: `src/scenes/PauseScene.ts`
- Modify: `README.md`
- Modify: `工作完成.md`
- Test: 手动/CDP 截图

- [x] **Step 1: 暂停菜单重看**

- PauseScene 增加“开场故事”按钮：`scene.launch('IntroScene', { replay: true })` 后停止 PauseScene；IntroScene 结束后恢复 IslandScene/UIScene。
- 重看不写 `introSeen` 以外的状态，不重置存档。

- [x] **Step 2: 手机与竖屏验证**

- 844×390 设备模拟：点击推进、跳过按钮可点、文字不溢出。
- 390×844：先显示横屏提示，不进入故事。

- [x] **Step 3: 全量验证**

Run:
```
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```
Expected: 全部通过，测试数 ≥ 354。

- [x] **Step 4: 文档**

- README 操作/功能加“开场故事、暂停可重看”。
- `工作完成.md` 增加本次章节与验证结果。

- [x] **Step 5: 提交、合并、推送**

```bash
git add -A
git commit -m "feat: add intro story and replay from pause"
git -C "D:/0_AllProgram/AI_LBS" merge --ff-only visual-overhaul
git -C "D:/0_AllProgram/AI_LBS" push origin main
```

- [x] **Step 6: 确认部署**

轮询最新 Actions run 为 success；线上新档截图确认 5 屏故事。

---

## Self-Review

- **Spec coverage:** 5 屏内容、跳过、新档触发、老档不强制、暂停重看、手机点击、测试与文档均有任务。
- **Step scan:** 每个任务有失败测试/验证、实现、通过、提交；无 TBD。
- **Type consistency:** `INTRO_STORY`、`shouldPlayIntro`、`markIntroSeen`、`IntroScene({replay})` 前后一致。
- **Review Focus:** 重复播放、老档强制、跳过保存、竖屏、重看恢复均有对应测试或手动验证步骤。
- **Proportion:** 3 个任务，代码块只保留接口与关键值。
