import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { ITEMS } from '../data/items';
import { consumeFood } from '../systems/needsSystem';
import { makeText } from './text';
import { COLORS, TINTS } from './theme';
import { ensureHudIcons, iconColor, iconTexture, type HudIcon } from './icons';
import { panelRect } from './widgets/layout';
import { clampTooltip } from './widgets/tooltip';

const EDIBLE = new Set(['coconut', 'berries', 'cooked_fish', 'dried_fish', 'bandage']);
const GRID = { x: 248, y: 56, cols: 6, rows: 4, size: 48, gap: 6 };
const KIND_LABEL: Record<string, string> = {
  material: '材料',
  food: '食物',
  tool: '工具',
  weapon: '武器',
  consumable: '消耗品',
};

/** Full-screen inventory overlay with the approved two-column layout. */
export class InventoryOverlay {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private tooltipHeight = 54;
  private state: GameState | null = null;
  private open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    ensureHudIcons(scene);
    this.root = scene.add.container(0, 0).setDepth(9000).setScrollFactor(0).setVisible(false);
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.open || !this.tooltip) return;
      this.positionTooltip(pointer.x, pointer.y);
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(state: GameState): void {
    if (this.open) {
      this.close();
      return;
    }
    this.state = state;
    this.open = true;
    this.root.setVisible(true);
    this.rebuild();
  }

  close(): void {
    this.open = false;
    this.root.setVisible(false);
    this.hideTooltip();
    this.root.removeAll(true);
  }

  private rebuild(): void {
    const state = this.state;
    if (!state) return;
    this.hideTooltip();
    this.root.removeAll(true);
    this.drawBackdrop();
    this.drawPanelChrome();
    this.drawProfile(state);
    this.drawStatus(state);
    this.drawEquipment(state);
    this.drawGrid(state);
  }

  private drawBackdrop(): void {
    const backdrop = this.scene.add
      .rectangle(0, 0, 640, 360, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    backdrop.on('pointerdown', () => this.close());
    this.root.add(backdrop);
  }

  private drawPanelChrome(): void {
    const rect = panelRect('inventory');
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRect(rect.x + 3, rect.y + 4, rect.w, rect.h);
    g.fillStyle(TINTS.parchment, 1).fillRect(rect.x, rect.y, rect.w, rect.h);
    g.lineStyle(2, TINTS.woodDark, 1).strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    g.lineStyle(1, TINTS.cream, 0.8).strokeRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10);
    g.fillStyle(TINTS.goldDark, 0.5).fillRect(rect.x + 8, rect.y + 42, rect.w - 16, 1);
    this.root.add(g);
    // Swallow clicks on the parchment so only the backdrop closes the panel.
    this.root.add(
      this.scene.add
        .zone(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h)
        .setInteractive(),
    );

    this.root.add(
      makeText(this.scene, rect.x + 16, rect.y + 10, '背包', {
        size: 24,
        color: COLORS.ink,
      }),
    );
    this.root.add(
      makeText(this.scene, rect.x + rect.w - 16, rect.y + 18, 'I / Esc 关闭', {
        origin: [1, 0],
        color: COLORS.inkSoft,
      }),
    );
  }

  private drawProfile(state: GameState): void {
    const box = this.scene.add
      .rectangle(56, 56, 64, 64, 0x2b2118, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, TINTS.woodDark);
    this.root.add(box);
    const avatar = this.scene.add.image(88, 88, 'farm', 109).setOrigin(0.5, 0.5).setScale(4);
    this.root.add(avatar);
    this.root.add(makeText(this.scene, 128, 58, '鲁滨孙', { size: 24, color: COLORS.ink }));
    this.root.add(makeText(this.scene, 128, 86, '荒岛求生', { color: COLORS.inkSoft }));
    this.root.add(
      makeText(this.scene, 128, 106, `营地 Lv${state.camp.level}`, { color: COLORS.ink }),
    );
  }

  private drawStatus(state: GameState): void {
    const rows: Array<[HudIcon, string, number]> = [
      ['hp', '生命', state.player.hp],
      ['hunger', '饱食', state.player.hunger],
      ['thirst', '口渴', state.player.thirst],
      ['energy', '精力', state.player.energy],
    ];
    rows.forEach(([icon, label, value], index) => {
      const top = 136 + index * 24;
      this.root.add(this.scene.add.image(62, top + 5, iconTexture(icon)));
      this.root.add(makeText(this.scene, 74, top, label, { color: COLORS.ink }));
      const g = this.scene.add.graphics();
      g.fillStyle(TINTS.track, 0.85).fillRect(112, top + 2, 80, 6);
      g.fillStyle(iconColor(icon), 1).fillRect(112, top + 2, (80 * Math.max(0, Math.min(100, value))) / 100, 6);
      g.lineStyle(1, TINTS.woodDark, 1).strokeRect(111.5, top + 1.5, 81, 7);
      this.root.add(g);
      this.root.add(
        makeText(this.scene, 224, top, String(Math.round(value)), {
          origin: [1, 0],
          color: COLORS.ink,
        }),
      );
    });
  }

  private drawEquipment(state: GameState): void {
    this.root.add(makeText(this.scene, 56, 236, '装备', { color: COLORS.inkSoft }));
    const slots: Array<['weapon' | 'armor' | 'boots', string]> = [
      ['weapon', '武器'],
      ['armor', '护甲'],
      ['boots', '鞋子'],
    ];
    slots.forEach(([slot, label], index) => {
      const x = 56 + index * 46;
      const g = this.scene.add.graphics();
      g.fillStyle(0x1b120b, 0.85).fillRect(x, 252, 40, 40);
      g.lineStyle(1, TINTS.wood, 1).strokeRect(x + 0.5, 252.5, 39, 39);
      this.root.add(g);
      const instanceId = state.equipment[slot];
      const instance = instanceId
        ? state.equipmentInstances.find((entry) => entry.instanceId === instanceId)
        : undefined;
      const name = instance ? (ITEMS[instance.baseId]?.name ?? instance.baseId) : '';
      this.root.add(
        makeText(this.scene, x + 20, 262, name ? name.slice(0, 1) : '—', {
          origin: [0.5, 0],
          color: name ? COLORS.cream : COLORS.muted,
        }),
      );
      this.root.add(
        makeText(this.scene, x + 20, 296, label, {
          origin: [0.5, 0],
          color: COLORS.inkSoft,
        }),
      );
    });
    this.root.add(makeText(this.scene, 56, 318, '装备栏阶段二开放', { color: COLORS.muted }));
  }

  private drawGrid(state: GameState): void {
    this.root.add(makeText(this.scene, GRID.x, 30, '物品', { color: COLORS.ink }));
    const items = state.inventory.slice(0, GRID.cols * GRID.rows);
    for (let index = 0; index < GRID.cols * GRID.rows; index++) {
      const col = index % GRID.cols;
      const row = Math.floor(index / GRID.cols);
      const x = GRID.x + col * (GRID.size + GRID.gap);
      const y = GRID.y + row * (GRID.size + GRID.gap);
      const g = this.scene.add.graphics();
      g.fillStyle(0x241a10, 0.9).fillRect(x, y, GRID.size, GRID.size);
      g.lineStyle(1, TINTS.wood, 1).strokeRect(x + 0.5, y + 0.5, GRID.size - 1, GRID.size - 1);
      this.root.add(g);

      const item = items[index];
      if (!item) continue;
      const def = ITEMS[item.baseId];
      const name = def?.name ?? item.baseId;
      this.root.add(
        makeText(this.scene, x + GRID.size / 2, y + 10, name.slice(0, 1), {
          size: 24,
          origin: [0.5, 0],
          color: COLORS.cream,
        }),
      );
      if (item.count > 1) {
        this.root.add(
          makeText(this.scene, x + GRID.size - 4, y + GRID.size - 4, String(item.count), {
            origin: [1, 1],
            color: COLORS.gold,
          }),
        );
      }
      if (item.durability !== undefined) {
        const max = def?.maxDurability ?? 100;
        const ratio = Math.max(0, Math.min(1, item.durability / max));
        const bar = this.scene.add
          .rectangle(x + 4, y + GRID.size - 7, (GRID.size - 8) * ratio, 3, TINTS.energy, 1)
          .setOrigin(0, 0);
        this.root.add(bar);
      }

      const zone = this.scene.add
        .zone(x + GRID.size / 2, y + GRID.size / 2, GRID.size, GRID.size)
        .setInteractive({ useHandCursor: EDIBLE.has(item.baseId) });
      zone.on('pointerover', (pointer: Phaser.Input.Pointer) => this.showTooltip(item.baseId, pointer.x, pointer.y));
      zone.on('pointerout', () => this.hideTooltip());
      zone.on('pointerdown', () => {
        if (!EDIBLE.has(item.baseId)) return;
        consumeFood(state, item.baseId);
        this.rebuild();
      });
      this.root.add(zone);
    }

    const capacity = `${state.inventory.length} 种物品`;
    this.root.add(makeText(this.scene, GRID.x, 286, capacity, { color: COLORS.inkSoft }));
    this.root.add(
      makeText(this.scene, GRID.x, 306, '点击食物食用 · 悬停查看详情', { color: COLORS.muted }),
    );
  }

  private showTooltip(baseId: string, px: number, py: number): void {
    this.hideTooltip();
    const def = ITEMS[baseId];
    if (!def) return;
    const stack = this.state?.inventory.find((item) => item.baseId === baseId);
    const lines = [`${def.name} · ${KIND_LABEL[def.kind] ?? def.kind}`];
    if (stack?.durability !== undefined) lines.push(`耐久 ${stack.durability}/${def.maxDurability ?? '?'}`);
    if (EDIBLE.has(baseId)) lines.push('点击食用');
    const w = 148;
    const h = 18 + lines.length * 14;
    const container = this.scene.add.container(0, 0).setDepth(9500).setScrollFactor(0);
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.4).fillRect(2, 3, w, h);
    g.fillStyle(TINTS.parchment, 1).fillRect(0, 0, w, h);
    g.lineStyle(2, TINTS.woodDark, 1).strokeRect(1, 1, w - 2, h - 2);
    container.add(g);
    lines.forEach((line, index) => {
      container.add(
        makeText(this.scene, 8, 6 + index * 14, line, {
          color: index === 0 ? COLORS.ink : COLORS.inkSoft,
        }),
      );
    });
    this.tooltip = container;
    this.tooltipHeight = h;
    this.root.add(container);
    this.positionTooltip(px, py);
  }

  private positionTooltip(px: number, py: number): void {
    if (!this.tooltip) return;
    const point = clampTooltip(px + 14, py + 14, 148, this.tooltipHeight, 640, 360);
    this.tooltip.setPosition(point.x, point.y);
  }

  private hideTooltip(): void {
    this.tooltip?.destroy(true);
    this.tooltip = null;
  }
}
