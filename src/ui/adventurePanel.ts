import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { adventureInfo, gearSummary } from '../systems/adventureSystem';
import { makeText } from './text';
import { COLORS } from './theme';
import { drawPanel } from './widgets/panel';

const PANEL = { x: 150, y: 60, w: 340, h: 240 };

/** R key: one place for adventure rank and long-term progress. */
export class AdventurePanel {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(9000).setScrollFactor(0).setVisible(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(state: GameState): void {
    if (this.open) {
      this.close();
      return;
    }
    this.open = true;
    this.root.setVisible(true);
    this.rebuild(state);
  }

  close(): void {
    this.open = false;
    this.root.setVisible(false);
    this.root.removeAll(true);
  }

  private rebuild(state: GameState): void {
    this.root.removeAll(true);
    const info = adventureInfo(state);
    const chrome = this.scene.add.graphics();
    drawPanel(chrome, PANEL);
    this.root.add(chrome);

    this.root.add(
      makeText(this.scene, PANEL.x + PANEL.w / 2, PANEL.y + 14, '冒险等阶', {
        size: 24,
        origin: [0.5, 0],
        color: COLORS.ink,
      }),
    );
    this.root.add(
      makeText(this.scene, PANEL.x + PANEL.w / 2, PANEL.y + 48, `Lv${info.rank}`, {
        size: 24,
        origin: [0.5, 0],
        color: COLORS.goldDark,
      }),
    );

    const rows: Array<[string, string]> = [
      ['探索度', `${info.exploration}/240 区块`],
      ['已发现地标', `${info.discovered}/7`],
      ['装备评分', `${info.gearScore}（${gearSummary(state)}）`],
      ['生存天数', `第 ${info.days} 天`],
      ['沉船进度', info.cleared ? '本周已通关' : '本周未通关'],
      ['首通传说', info.firstClear ? '已获得' : '未获得'],
      ['冒险积分', `${info.score}`],
    ];
    rows.forEach(([label, value], index) => {
      const y = PANEL.y + 84 + index * 20;
      this.root.add(makeText(this.scene, PANEL.x + 20, y, label, { color: COLORS.inkSoft }));
      this.root.add(
        makeText(this.scene, PANEL.x + PANEL.w - 20, y, value, {
          origin: [1, 0],
          color: COLORS.ink,
        }),
      );
    });
    this.root.add(
      makeText(this.scene, PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h - 18, 'R / Esc 关闭', {
        origin: [0.5, 0],
        color: COLORS.muted,
      }),
    );
  }
}
