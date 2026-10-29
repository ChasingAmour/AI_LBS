# 手机端兼容 + 背景音乐 + 钓鱼与种植 设计稿

- 日期：2026-10-29
- 状态：待确认
- 仓库：AI_LBS（鲁滨孙：荒岛求生）
- 线上：https://chasingamour.github.io/AI_LBS/

## 1. 目标

1. 手机浏览器（横屏）可以完整游玩，不是只看一眼：能移动、攻击、交互、开面板、建造、读档。
2. 加入白天/夜晚两套循环背景音乐，可在暂停菜单独立调节音乐音量与静音。
3. 增加两个耐玩玩法：钓鱼小游戏、种植/农田。两者都要有可验证的数值逻辑、存档与触屏操作。

## 2. 非目标

- 不做竖屏布局；手机竖屏显示“请横屏”提示。
- 不做联网、排行榜、云存档。
- 不做天气系统、图鉴/成就、难度模式、船只离岛结局（列入后续候选）。
- 不重做现有美术风格；新素材仍为 16px 像素风。
- 不做 iOS 原生 App / 微信小游戏适配。

## 3. 约束

- 纯静态、无后端；GitHub Pages，`base: '/AI_LBS/'`。
- Phaser 3.90、TypeScript strict、Vite 6、Vitest；`src/core`、`data`、`systems`、`world` 不 import Phaser。
- 640×360 基准；桌面继续整数缩放，手机用分数缩放铺满。
- 存档键名保持 `robinson.save.v1`，版本升到 **v5**，v1–v4 自动迁移。
- 音频只用 CC0/可商用免费资源，更新 `LICENSES.md`。
- 现有 307 项测试必须继续通过；新增纯函数必须有测试。

## 4. 方案与取舍

### 4.1 手机端

| 方案 | 做法 | 取舍 |
|---|---|---|
| A（选中） | 横屏 + 分数缩放 + 虚拟摇杆/按钮 + 面板触屏化 | 完整可玩；非整数缩放像素略软 |
| B | 横屏 + 整数缩放 + 黑边 + 触控 | 像素最锐利；小屏可点区域更小 |
| C | 只做浏览/点击适配 | 成本最低；不能真正走位打怪，不满足“兼容手机端” |

选 A。桌面端仍走整数缩放，避免现有视觉回退。

### 4.2 背景音乐

| 方案 | 做法 | 取舍 |
|---|---|---|
| 选中 | 两首 CC0 循环（白天/夜晚）+ 交叉淡入 + 独立音量 | 有真实旋律；增加约 1–4MB 静态资源 |
| 备选 | WebAudio 程序化环境音 | 零资源、体积小；氛围有余、旋律不足 |
| 备选 | 单曲循环 | 最简单；昼夜切换缺少变化 |

选 CC0 双轨；若某首下载/解码失败，自动回退到另一首，不阻塞游戏。候选：
- 白天：OpenGameArt “Feel Good Island Loop”（CC0，OGG，约 357KB）
- 夜晚：OpenGameArt “Calm Loop” 或 “Lonely Night”（CC0）
- 最终以实际下载、试听、循环点检查为准；文件名与作者写入 `LICENSES.md`。

### 4.3 新玩法

| 组合 | 取舍 |
|---|---|
| 钓鱼 + 种植（选中） | 与海岛/水面/营地自然衔接，补足食物与长期目标；中等工作量 |
| 天气 + 图鉴 | 氛围与收集强；对生存循环改变较小 |
| 难度模式 | 成本最低；内容增量少 |
| 船只与离岛结局 | 最大的一档；需要新地图/结局流程，本次不做 |

## 5. 手机端设计

### 5.1 缩放与视口

- 新增 `src/core/platform.ts`：
  - `isTouchDevice(): boolean`：`navigator.maxTouchPoints > 0` 或 `'ontouchstart' in window`。
  - `isPortrait(): boolean`：`innerHeight > innerWidth`。
  - `prefersTouchLayout(): boolean`：触屏且视口短边 < 900。
- `src/core/scaling.ts` 增加 `fitScale(viewW, viewH, maxScale = 2.5)`：返回 `{ scale, offsetX, offsetY }`，`scale = clamp(min(w/640, h/360), 0.5, maxScale)`，用于触屏。
- `src/main.ts`：
  - 桌面：继续 `integerScale`。
  - 触屏：`fitScale`，canvas CSS 尺寸 = 640×360 × scale；监听 `resize` 与 `orientationchange`。
  - 首次 `pointerdown` 调 `game.sound.context.resume()`，解锁移动端音频。
- `index.html` / `style.css`：
  - viewport 加 `maximum-scale=1, user-scalable=no, viewport-fit=cover`。
  - `touch-action: none; overscroll-behavior: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent;`。
  - 竖屏遮罩 `#rotate-hint`：触屏竖屏时显示“请横屏游玩”+“全屏”按钮；横屏隐藏。桌面永不显示。
- 竖屏期间游戏循环休眠（`game.loop.sleep()`），时间/饥饿/入侵不推进；转回横屏唤醒。避免玩家只看到提示却被饿死或被偷袭。

### 5.2 触屏控制

新增 `src/ui/touchLayout.ts`（纯几何，可测试）与 `src/ui/touchControls.ts`（Phaser 渲染/输入）。

- 摇杆：左下 (64, 300)，底座半径 34，摇杆头半径 14；按下后 60px 内拖动，输出归一化向量到 registry `touchMove`。
- 按钮（右下）：
  - 攻击 (604, 252)，半径 26；触发 `ui:touchAttack`。
  - 交互/收线 (548, 294)，半径 22；触发 `ui:touchInteract`。
  - 奔跑切换 (500, 296)，半径 16；写 registry `touchSprint`。
  - 菜单 (604, 196)，半径 18；打开触屏菜单。
- 触屏菜单为半透明面板，按钮：背包、合成、建造、劳工、地图、冒险、暂停、全屏、关闭。
- 面板打开时，菜单按钮变为“×”，点击关闭当前面板；所有面板顶栏也提供可点关闭区。
- 触屏控制只在 `UIScene` 创建；`IslandScene`/`DungeonScene` 从 registry 读取移动/冲刺状态，并监听交互/攻击事件。
- 指针冲突：新增 `isTouchControlPoint(x, y)`；`IslandScene` 的 pointerdown 在触屏且落在控制区时直接忽略，避免点摇杆触发攻击。
- 攻击自动瞄准：触屏攻击优先锁定 96px 内最近的野人/动物/副本敌人；没有目标时按当前朝向挥击。
- 建造：触屏点地面直接以该瓦片尝试放置；无效时红叉+原因，不进入“幽灵跟随”状态；仍可点“取消建造”按钮。
- 面板滚动：`Panel` 在触屏且行数超过一页时显示“上一页/下一页”按钮；地图保留拖动，缩放按钮保留，滚轮不是必需。
- 背包：触屏第一次点格子显示 tooltip，1.5 秒内再次点同一格执行装备/食用；避免悬停依赖。
- 暂停菜单：按钮高度加到 36px；新增音乐开关、音乐音量 −/+、音效开关；保留导出/导入。
- 触屏设备额外显示“触屏控制 开/关”：默认开，关闭后隐藏摇杆/按钮（给带键盘的平板），状态写入 `settings.touchControls`。

### 5.3 手机性能

- 沿用资源节点视口裁剪。
- 触屏低端设备可选“低画质”：关闭水面三帧动画与暗角？本次先不做自动降级；实测后若低于 50FPS 再加。

## 6. 背景音乐设计

新增 `src/systems/music.ts`：

```ts
type MusicTrack = 'day' | 'night';
interface MusicSettings { musicMuted: boolean; musicVolume: number }

export function loadMusic(scene: Phaser.Scene): void
export function musicEnabled(state: GameState): boolean
export function musicGain(state: GameState): number
export class MusicManager {
  update(state: GameState, track: MusicTrack): void
  setPaused(paused: boolean): void
  destroy(): void
}
```

- 两首循环音轨，`loop: true`；切换昼夜时 1.5s 交叉淡入淡出。
- 音量 = `musicMuted ? 0 : musicVolume`；默认 0.45。
- 暂停/死亡时降到 30% 或暂停；Boss/入侵时降到 50%（可选，先实现暂停与正常两档）。
- 单例存放在 registry `musicManager`，场景重启不重复创建。
- 首次用户交互后开始播放，满足浏览器自动播放策略。
- 暂停菜单：音乐开关、音量 −/+（0.1 步进）、音效开关；HUD 不新增常驻按钮。

## 7. 存档 v5

`GameState.settings` 增加：

```ts
settings: {
  muted: boolean;          // 音效静音（沿用）
  sfxVolume: number;       // 0..1
  musicMuted: boolean;     // 新增
  musicVolume: number;     // 新增，默认 0.45
  hudCompact: boolean;
  touchControls: boolean;  // 新增，记录是否启用触屏布局
}
```

- `SAVE_VERSION = 5`。
- `upgradeToV5`：补默认字段，保留 v1–v4 全部迁移链。
- 测试：v4→v5、v1→v5、设置越界校验。

## 8. 钓鱼设计

### 8.1 前置

- 新物品 `fishing_rod`（鱼竿，tool，耐久 60）。
- 配方：工作台 Lv1，木 3 + 绳子 2，耗时 3s。
- 新物品 `tropical_fish`（热带鱼，food：饱食 12、口渴 5）。
- 新物品 `seaweed`（海藻，material，可用于堆肥/后续内容；本次只作为钓鱼副产物）。

### 8.2 交互

- 玩家站在任意浅水/溪流/深水 48px 内（不必踩在水里），快捷栏选中鱼竿，按 E / 触屏交互进入钓鱼。
- 交互优先级：野人/劳工/建筑/沉船入口/地面掉落照旧优先；鱼竿选中且水边 48px 内时，钓鱼覆盖资源节点与“喝水”目标。这样在潮池/岸边不会误砍树或误喝水。
- 水深不消耗体力；每次抛竿鱼竿耐久 −1，耐久 0 时提示并退出。
- 移动、打开任意面板（包括背包）、受击都会中断钓鱼，避免在看不见的状态下空转。

### 8.3 状态机（纯函数，可测试）

`src/systems/fishingSystem.ts`：

```ts
type FishingPhase = 'casting' | 'waiting' | 'bite' | 'reeling' | 'done' | 'failed';
interface FishingSession {
  phase: FishingPhase;
  timer: number;        // 当前阶段剩余秒
  taps: number;         // 收线点击次数
  needed: number;       // 需要点击次数（3）
  result: 'success' | 'fail' | null;
}
export function startFishing(rng: Rng): FishingSession
export function tickFishing(session: FishingSession, dt: number): void
export function tapFishing(session: FishingSession): void
export function rollCatch(rng: Rng, state: GameState): ItemStack[]
```

流程：
1. `casting` 0.6s。
2. `waiting` 1.2–3.0s（种子随机）。
3. `bite` 1.2s 窗口；此阶段点击进入 `reeling`，错过则 `failed`（“鱼跑了”）。
4. `reeling` 2.5s 内点 3 次；每次点击 `taps+1`，到 3 成功，超时失败。
5. 成功按掉落表给 1 件，20% 概率再独立给 1 件（最多 2 件）：生鱼 62%、热带鱼 18%、海藻 12%、漂流物 8%。漂流物直接给燧石或布，不引入新的“宝箱物品”。
6. 失败不扣额外资源。

### 8.4 表现

- 世界内：鱼线从玩家到水面浮标（Graphics），等待时浮标轻微上下；上钩时头顶“！”气泡 + 提示音。
- HUD：底部中央显示阶段提示与收线进度（3 个小点）；触屏交互按钮文字临时变为“提竿/收线”。
- 成功：横幅“钓到 热带鱼 ×1”，播放 pickup 音效；背包满则掉落在脚边。

### 8.5 测试

- 状态机各阶段时间边界、错过咬钩、3 次点击成功、超时失败。
- 掉落表范围与合法性、耐久扣减、非水边不能开始。

## 9. 种植/农田设计

### 9.1 建筑

- 新建筑 `farm_plot`（农田）：
  - 成本：木 4 + 藤蔓 2；耐久 40；营地 Lv1 解锁；不阻挡移动；1 格。
  - 外观：翻过的土块 + 四角木桩；作物阶段叠加小苗/成熟图。
- 配方不新增；直接建造。

### 9.2 作物数据

`src/data/farming.ts`：

```ts
interface CropDef {
  seedId: string;       // 种下去消耗的物品
  name: string;
  growPoints: number;   // 4 / 6
  yield: { baseId: string; min: number; max: number };
}
export const CROPS = {
  berries: { seedId: 'berries', name: '浆果', growPoints: 4, yield: { baseId: 'berries', min: 3, max: 5 } },
  coconut: { seedId: 'coconut', name: '椰子', growPoints: 6, yield: { baseId: 'coconut', min: 2, max: 3 } },
};
```

所有作物统一 4 个视觉阶段：0 空地、1 幼苗、2 生长、3 成熟；`growth / growPoints` 决定当前阶段。不设 `stages` 字段，避免数据两处维护。

### 9.3 生长

- `BuildingInstance` 增加可选字段：

```ts
crop?: {
  seedId: string;
  growth: number;        // 0..growPoints
  wateredDay: number;    // 最近一次浇水日，-1 表示未浇
  plantedDay: number;
};
```

- 种下时 `growth=0`、`wateredDay=-1`。
- 每个 `time:dayChanged`：若 `wateredDay === 前一日` 则 `growth += 2`，否则 `growth += 1`；达到 `growPoints` 即成熟。浆果浇水 2 天、干旱 4 天；椰子浇水 3 天、干旱 6 天。
- 生长结算写成共享纯函数 `tickFarms(state, previousDay)`，岛场景与沉船场景的 `time:dayChanged` 都调用；在沉船过夜、睡觉推天也会生长。
- 游戏关闭期间不模拟离线时间，不额外生长；干旱只减速、不枯萎。

### 9.4 浇水

- 新物品 `waterskin`（水袋，tool，耐久 3，表示 3 次水量）：
  - 配方：手工/工作台 Lv0，布 2 + 藤蔓 1，耗时 3s。
  - 在溪流 48px 内或淡水泉 64px 内按 E：若背包中有未满（耐久 <3）的水袋，优先“装满水袋”；没有未满水袋时按原逻辑喝水。海洋浅水仍可喝水，但不能装水袋。
  - 对农田按 E：消耗 1 点耐久浇水，`wateredDay = 当天`；水袋为 0 时提示“水袋空了”。
- 也可以不浇水，只是成熟更慢。

### 9.5 交互

- 农田为空：按 E 打开种子选择（有浆果/椰子时列出；都没有时提示“需要浆果或椰子做种子”）。
- 生长中未浇水：按 E 浇水（若有水袋且有水）；已浇水：显示“今天已浇水”。
- 成熟：按 E 收获，产物进背包（满则掉落），清空作物，农田保留。
- 触屏：与普通建筑交互一致，用交互按钮。

### 9.6 表现

- 农田贴图由 `ui/assets.ts` 新增 `farm` 与作物阶段贴图（代码绘制，无新素材依赖）。
- 交互提示与横幅：种植/浇水/收获/成熟。
- 地图不标注农田（避免地图噪音）。

### 9.7 测试

- 种植消耗种子、空农田不能收获。
- 浇水/不浇水的每日 growth 增长与成熟天数。
- 收获产出范围、清空作物、保留建筑。
- 存档往返保留 crop。
- 数据完整性：作物种子、产物、配方、图标都存在。

## 10. 需要改动的文件（预估）

新增：
- `src/core/platform.ts`
- `src/ui/touchLayout.ts`、`src/ui/touchControls.ts`
- `src/systems/music.ts`
- `src/systems/fishingSystem.ts`
- `src/data/fishing.ts`、`src/data/farming.ts`
- `public/assets/music/day.ogg`、`night.ogg`（或 mp3）
- 测试：`platform.test.ts`、`touchLayout.test.ts`、`music.test.ts`、`fishingSystem.test.ts`、`farming.test.ts`、`saveV5.test.ts`

修改：
- `index.html`、`src/style.css`、`src/main.ts`、`src/core/scaling.ts`
- `src/core/gameState.ts`、`src/core/saveVersion.ts`、`src/systems/saveSystem.ts`
- `src/scenes/BootScene.ts`（加载音乐）
- `src/scenes/UIScene.ts`（触屏 UI、音乐控制入口）
- `src/scenes/IslandScene.ts`（触屏输入、钓鱼、农田交互/表现）
- `src/scenes/DungeonScene.ts`（触屏移动/攻击）
- `src/scenes/PauseScene.ts`（音乐/音效设置）
- `src/ui/inventoryPanel.ts`、`src/ui/panel.ts`、`src/ui/mapPanel.ts`（触屏点击/翻页/关闭）
- `src/ui/assets.ts`、`src/ui/itemIcons.ts`（农田/作物/新物品图标）
- `src/data/items.ts`、`src/data/recipes.ts`、`src/data/buildings.ts`
- `src/systems/interactionSystem.ts`（农田/水袋/钓鱼目标）
- `src/systems/buildingSystem.ts`（农田可选、crop 初始化）
- `README.md`、`LICENSES.md`、`工作完成.md`

## 11. 验证

- `npm run test`、`typecheck`、`lint`、`build` 全通过。
- 桌面 1920×1080 截图：海岛、钓鱼中、农田四阶段、暂停音乐设置。
- 手机模拟（CDP 设备尺寸 + touch）：
  - iPhone 12 横屏 844×390：摇杆/按钮/面板可点，能移动、攻击、开背包、建造。
  - 竖屏 390×844：显示横屏提示，不进入游戏。
  - 地图拖动、建造放置、暂停音乐开关。
- 性能：无头 Chrome 海岛/沉船/手机视口各测一次；低于 50FPS 时优先关闭水面动画或降低资源节点刷新。
- 线上部署后检查 Actions 与页面资源 200。

## 12. 风险

- iOS Safari 全屏/方向锁定支持不完整：横屏提示 + CSS 适配兜底，不依赖锁定成功。
- 分数缩放导致像素略软：桌面保持整数；手机可接受。
- 触屏与鼠标事件同时触发：用 `isTouchControlPoint` 与控制区 z 顺序隔离。
- 音乐文件体积：优先 OGG，控制在 4MB 内；循环点不完美时用 1.5s 淡入淡出遮住接缝。
- 新玩法增加存档字段：只加可选字段 + v5 迁移，旧档不丢。

## 13. 已定的实现取舍

- 触屏布局只在触屏设备启用，桌面不显示摇杆；触屏设备可在暂停菜单关闭触屏控制（保存到 `settings.touchControls`）。
- 竖屏不做游戏布局，只提示横屏；竖屏期间游戏循环休眠，避免时间推进。
- BGM 用两首 CC0 循环；失败时回退单曲，不阻塞。
- 钓鱼是“抛竿→等待→提竿→3 次收线”的轻量 QTE，不做复杂张力条；鱼竿选中时钓鱼优先于水边资源节点与喝水。
- 农田干旱只减速不枯萎；水袋 3 次水量，可重复装水；作物在岛/沉船过夜都会生长，关闭游戏不模拟离线时间。
- 新物品先只做鱼竿、热带鱼、海藻、水袋；不扩展一整套钓鱼装备。
