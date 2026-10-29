# 开场故事（Intro Story）设计稿

- 日期：2026-10-29
- 状态：已实现（2026-10-29）
- 方案：A（开场故事卡）

## 1. 目标

新档进入游戏前播放 5 屏可跳过的像素故事，交代“你是谁、为什么在岛上、破船和箱子从哪来”。老档不强制播放，但可从暂停菜单重看。

## 2. 非目标

- 不做可玩序章（不在甲板/货舱里操作）。
- 不改现有主线、教程目标与副本流程。
- 不加配音、不做长动画；只用现有字体、音效与程序化像素画。
- 不新增外部美术资源。

## 3. 用户流程

1. 新档（`source === 'none'`）且 `flags.introSeen !== true` → 启动 `IntroScene`。
2. 5 屏依次显示；点击/空格/回车继续，Esc 或右上角“跳过”直接进入游戏。
3. 最后一屏结束后淡出，写入 `flags.introSeen = true` 并保存，进入海岛。
4. 老档（有存档）不强制播放；暂停菜单新增“开场故事”可重看，重看结束后回到原游戏。
5. 竖屏仍由现有横屏提示拦截；手机点屏幕继续。

## 4. 故事内容（5 屏）

1. **起航**：1659 年，赫尔港。你以鲁滨孙之名登上“希望号”，载着布匹与铁器驶向西印度群岛。
2. **风暴**：第 12 夜，加勒比海风暴折断桅杆，货舱进水；船长下令砍断主桅。
3. **漂流**：你抓住装工具的木箱被浪卷走，在海上漂了三天，只看见雨、星光和一只海鸟。
4. **上岸**：第四天黎明，浪把你推上南岸；木箱卡在礁石间，破船的龙骨半埋在远处沙里。
5. **第一天**：岛上没有人烟。你从箱里摸到火石和半截绳子——先活下来，再想怎么回去。

每屏：上方像素插画（约 640×200），下方标题 + 2–3 行正文 + 继续提示。插画用 Graphics/Canvas 绘制：港口船影、风暴闪电、黑海木箱、黎明海滩、破船海岸。

## 5. 技术设计

- 新增 `src/data/introStory.ts`：`INTRO_STORY` 卡片数组（title/body/scene）；`shouldPlayIntro(state, source)`；`markIntroSeen(state)`。
- 新增 `src/scenes/IntroScene.ts`：
  - `create(data: { replay?: boolean })`。
  - 程序化绘制 5 个场景；文字使用 `makeText`，面板复用现有主题。
  - 点击/空格/回车下一屏，Esc/跳过按钮结束；最后一屏 400ms 淡出。
  - 结束：`markIntroSeen` + `saveGame`；普通流程 `scene.start('IslandScene')`；重看流程恢复暂停的 `IslandScene`/`UIScene` 并停止自己。
- `BootScene`：新档且未看过 → `scene.start('IntroScene')`；否则原逻辑。
- `main.ts` 场景列表加入 `IntroScene`。
- `PauseScene`：新增“开场故事”按钮，暂停状态下启动 `IntroScene({replay:true})`，结束后恢复游戏。
- `flags.introSeen?: boolean` 加入 `GameState` 与 `createNewGame`；旧档缺省视为 false，但因 `source !== 'none'` 不强制播放。存档版本保持 v5（可选字段，不破坏旧档）。

## 6. 测试

- `tests/unit/introStory.test.ts`：
  - 正好 5 屏，每屏 title/body 非空，最后一屏包含“第一天”。
  - 新档未看过 → `shouldPlayIntro(state,'none') === true`。
  - 老档（`main`/`backup`）→ false，即使未看过。
  - `markIntroSeen` 后新档 → false。
- 手动/截图：新档 5 屏、跳过、最后一屏进入海岛、暂停重看、手机点击推进、竖屏拦截。

## 7. 取舍

- 用程序化插画而非新素材：零下载、风格一致；画面比专门绘制的插画简单。
- 不做逐字打字机：像素字体下打字机在手机上容易点太快跳过；用淡入即可。
- 不改存档版本：`introSeen` 是可选 flag，缺失时按 false 处理，且老档不强制播放。
