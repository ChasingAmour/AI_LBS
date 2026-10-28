# 第三方资源与许可

本项目代码以 MIT 许可发布（如仓库未单独提供 LICENSE 文件，以本说明为准）。

## 运行时依赖

| 资源 | 用途 | 许可 |
|---|---|---|
| [Phaser 3](https://phaser.io/) 3.90.0 | 游戏引擎 | MIT |
| [Vite](https://vite.dev/) | 开发服务器与构建 | MIT |
| [Vitest](https://vitest.dev/) | 单元测试 | MIT |
| [TypeScript](https://www.typescriptlang.org/) | 类型系统 | Apache-2.0 |
| [ESLint](https://eslint.org/) | 代码检查 | MIT |

## 美术与音频

- `public/assets/tiles/placeholder.png`：由项目脚本生成的占位瓦片，无外部来源。
- `public/assets/maps/island.tmj`：由 `scripts/generate-island-map.mjs` 生成的占位岛屿地图，无外部来源。
- 角色、树木、岩石、建筑等运行时贴图：在 `IslandScene.makeTextures()` 中用 Phaser Graphics 程序化生成，无外部来源。
- 当前阶段没有音频资源。

## 字体

设计目标是使用 Fusion Pixel 中文字体，但阶段一未随仓库分发字体文件（避免引入未确认授权的二进制资源）。界面当前回退到系统 `monospace` / 无衬线字体。后续引入字体时，需要在此处补充字体名称、来源与许可（Fusion Pixel 使用 OFL-1.1，需同时附带其许可证文本）。

## 地图编辑

后续若使用 [Tiled](https://www.mapeditor.org/) 制作正式地图，Tiled 本身为 GPL-2.0 工具，仅用于编辑，不随游戏分发；导出的 `.tmj` 地图数据由本项目自行创作。
