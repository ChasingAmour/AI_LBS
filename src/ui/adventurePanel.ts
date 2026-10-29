import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { adventureInfo, gearSummary } from '../systems/adventureSystem';
import { makeText } from './text';
import { COLORS, TINTS } from './theme';
import { drawPanel } from './widgets/panel';

const PANEL = { x: 110, y: 18, w: 420, h: 324 };

/** R key: character attributes, level and long-term progress. */
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
      makeText(this.scene, PANEL.x + PANEL.w / 2, PANEL.y + 8, '角色与冒险', {
        size: 24,
        origin: [0.5, 0],
        color: COLORS.ink,
      }),
    );
    this.root.add(
      makeText(this.scene, PANEL.x + 20, PANEL.y + 42, `Lv${info.level}`, {
        size: 24,
        color: COLORS.goldDark,
      }),
    );
    this.root.add(
      makeText(this.scene, PANEL.x + PANEL.w - 20, PANEL.y + 12, `冒险积分 ${info.score}`, {
        origin: [1, 0],
        color: COLORS.inkSoft,
      }),
    );

    const barX = PANEL.x + 100;
    const barW = PANEL.w - 130;
    chrome.fillStyle(TINTS.track, 1).fillRect(barX, PANEL.y + 54, barW, 8);
    const ratio = info.xpNext > 0 ? Math.max(0, Math.min(1, info.xp / info.xpNext)) : 1;
    chrome.fillStyle(TINTS.gold, 1).fillRect(barX, PANEL.y + 54, Math.round(barW * ratio), 8);
    this.root.add(
      makeText(this.scene, barX, PANEL.y + 66, `经验 ${info.xp}/${info.xpNext}`, {
        color: COLORS.muted,
      }),
    );

    const stats: Array<[string, string, number, number]> = [
      ['攻击力', `${info.attack}`, PANEL.x + 20, PANEL.y + 88],
      ['防御力', `${info.defense}`, PANEL.x + 210, PANEL.y + 88],
      ['护甲', `${info.armor}%`, PANEL.x + 20, PANEL.y + 108],
      ['移速', `${info.movePct >= 0 ? '+' : ''}${info.movePct}%`, PANEL.x + 210, PANEL.y + 108],
    ];
    for (const [label, value, x, y] of stats) {
      this.root.add(makeText(this.scene, x, y, label, { color: COLORS.inkSoft }));
      this.root.add(makeText(this.scene, x + 90, y, value, { color: COLORS.ink }));
    }

    const rows: Array<[string, string]> = [
      ['探索度', `${info.exploration}/240 区块`],
      ['已发现地标', `${info.discovered}/7`],
      ['装备评分', `${info.gearScore}（${gearSummary(state)}）`],
      ['生存天数', `第 ${info.days} 天`],
      ['沉船进度', info.cleared ? '本周已通关' : '本周未通关'],
      ['首通传说', info.firstClear ? '已获得' : '未获得'],
    ];
    rows.forEach(([label, value], index) => {
      const y = PANEL.y + 136 + index * 20;
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
