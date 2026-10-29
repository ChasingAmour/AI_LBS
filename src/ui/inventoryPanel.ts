import Phaser from 'phaser';
import type { EquipInstance, GameState } from '../core/gameState';
import { AFFIXES, EQUIPMENT, RARITY } from '../data/equipment';
import { ITEMS, isEdible } from '../data/items';
import { consumeFood } from '../systems/needsSystem';
import { compareEquipment, equipInstance, gearStatLines, recycleInstance, unequipSlot } from '../systems/equipmentSystem';
import { sortInventory } from '../systems/inventorySystem';
import { repairCost, repairEquipped } from '../systems/statsSystem';
import { makeText } from './text';
import { foodEffectLines } from './format';
import { COLORS, TINTS } from './theme';
import { ensureHudIcons, iconColor, iconTexture, type HudIcon } from './icons';
import { itemIcon } from './itemIcons';
import { panelRect } from './widgets/layout';
import { clampTooltip } from './widgets/tooltip';

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
  private tooltipWidth = 148;
  private lastTap = { key: '', at: 0 };
  private tooltipTimer?: Phaser.Time.TimerEvent;
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
    let damaged: EquipInstance | null = null;
    slots.forEach(([slot, label], index) => {
      const x = 56 + index * 46;
      const y = 252;
      const g = this.scene.add.graphics();
      g.fillStyle(0x1b120b, 0.85).fillRect(x, y, 40, 40);
      g.lineStyle(1, TINTS.wood, 1).strokeRect(x + 0.5, y + 0.5, 39, 39);
      this.root.add(g);

      const instanceId = state.equipment[slot];
      const instance = instanceId
        ? state.equipmentInstances.find((entry) => entry.instanceId === instanceId)
        : undefined;
      if (instance) {
        const rarity = RARITY[instance.rarity].color;
        g.lineStyle(2, rarity, 1).strokeRect(x + 1, y + 1, 38, 38);
        const icon = itemIcon(instance.baseId);
        if (icon) {
          this.root.add(
            this.scene.add
              .image(x + 20, y + 18, icon.texture, icon.frame)
              .setDisplaySize(30, 30),
          );
        }
        const ratio = Math.max(0, Math.min(1, instance.durability / instance.maxDurability));
        this.root.add(
          this.scene.add
            .rectangle(x + 4, y + 35, 32 * ratio, 3, ratio > 0.3 ? TINTS.energy : TINTS.hp, 1)
            .setOrigin(0, 0),
        );
        const zone = this.scene.add.zone(x + 20, y + 20, 40, 40).setInteractive({ useHandCursor: true });
        zone.on('pointerover', (pointer: Phaser.Input.Pointer) =>
          this.showGearTooltip(instance, pointer.x, pointer.y),
        );
        zone.on('pointerout', () => this.hideTooltip());
        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (!this.touchArmed(`slot:${slot}`)) {
            this.showGearTooltip(instance, pointer.x, pointer.y);
            return;
          }
          unequipSlot(state, slot);
          this.rebuild();
        });
        this.root.add(zone);
        if (instance.durability < instance.maxDurability) damaged = instance;
      } else {
        this.root.add(
          makeText(this.scene, x + 20, y + 12, '—', {
            origin: [0.5, 0],
            color: COLORS.muted,
          }),
        );
      }
      this.root.add(
        makeText(this.scene, x + 20, y + 44, label, {
          origin: [0.5, 0],
          color: COLORS.inkSoft,
        }),
      );
    });

    const nearStation = Boolean(this.scene.registry.get('nearStation'));
    if (damaged && nearStation) {
      const cost = repairCost(damaged);
      const label = `修理（木${cost.wood} 藤${cost.vine}${cost.cloth > 0 ? ` 布${cost.cloth}` : ''}）`;
      const button = makeText(this.scene, 56, 312, label, { color: COLORS.goldDark });
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        repairEquipped(state, damaged!.instanceId, true);
        this.rebuild();
      });
      this.root.add(button);
    } else {
      this.root.add(
        makeText(this.scene, 56, 312, nearStation ? '装备耐久已满' : '工作台旁可修理装备', {
          color: COLORS.muted,
        }),
      );
    }
  }

  private drawGrid(state: GameState): void {
    this.root.add(makeText(this.scene, GRID.x, 30, '物品', { color: COLORS.ink }));
    const equipped = new Set(
      (['weapon', 'armor', 'boots'] as const)
        .map((slot) => state.equipment[slot])
        .filter((id): id is string => Boolean(id)),
    );
    const gear = state.equipmentInstances.filter((item) => !equipped.has(item.instanceId));
    const cells = [
      ...state.inventory.map((item) => ({ kind: 'stack' as const, item })),
      ...gear.map((instance) => ({ kind: 'gear' as const, instance })),
    ].slice(0, GRID.cols * GRID.rows);

    for (let index = 0; index < GRID.cols * GRID.rows; index++) {
      const col = index % GRID.cols;
      const row = Math.floor(index / GRID.cols);
      const x = GRID.x + col * (GRID.size + GRID.gap);
      const y = GRID.y + row * (GRID.size + GRID.gap);
      const g = this.scene.add.graphics();
      g.fillStyle(0x241a10, 0.9).fillRect(x, y, GRID.size, GRID.size);
      g.lineStyle(1, TINTS.wood, 1).strokeRect(x + 0.5, y + 0.5, GRID.size - 1, GRID.size - 1);
      this.root.add(g);

      const cell = cells[index];
      if (!cell) continue;

      if (cell.kind === 'stack') {
        const item = cell.item;
        const def = ITEMS[item.baseId];
        const icon = itemIcon(item.baseId);
        if (icon) {
          this.root.add(
            this.scene.add
              .image(x + GRID.size / 2, y + GRID.size / 2 - 2, icon.texture, icon.frame)
              .setDisplaySize(32, 32),
          );
        } else {
          this.root.add(
            makeText(this.scene, x + GRID.size / 2, y + 10, (def?.name ?? item.baseId).slice(0, 1), {
              size: 24,
              origin: [0.5, 0],
              color: COLORS.cream,
            }),
          );
        }
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
          this.root.add(
            this.scene.add
              .rectangle(x + 4, y + GRID.size - 7, (GRID.size - 8) * ratio, 3, TINTS.energy, 1)
              .setOrigin(0, 0),
          );
        }
        const zone = this.scene.add
          .zone(x + GRID.size / 2, y + GRID.size / 2, GRID.size, GRID.size)
          .setInteractive({ useHandCursor: isEdible(item.baseId) });
        zone.on('pointerover', (pointer: Phaser.Input.Pointer) =>
          this.showStackTooltip(item.baseId, pointer.x, pointer.y),
        );
        zone.on('pointerout', () => this.hideTooltip());
        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (!this.touchArmed(`stack:${item.baseId}`)) {
            this.showStackTooltip(item.baseId, pointer.x, pointer.y);
            return;
          }
          if (pointer.rightButtonDown()) {
            const dropped = item.count;
            state.world.groundLoot.push({
              baseId: item.baseId,
              count: dropped,
              x: state.player.x,
              y: state.player.y,
            });
            state.inventory = state.inventory.filter((entry) => entry !== item);
            this.scene.game.events.emit('ui:banner', `丢弃了${ITEMS[item.baseId]?.name ?? item.baseId}×${dropped}`);
            this.rebuild();
            return;
          }
          if (!isEdible(item.baseId)) return;
          consumeFood(state, item.baseId);
          this.rebuild();
        });
        this.root.add(zone);
      } else {
        const instance = cell.instance;
        const rarity = RARITY[instance.rarity].color;
        g.lineStyle(2, rarity, 1).strokeRect(x + 1, y + 1, GRID.size - 2, GRID.size - 2);
        const icon = itemIcon(instance.baseId);
        if (icon) {
          this.root.add(
            this.scene.add
              .image(x + GRID.size / 2, y + GRID.size / 2 - 2, icon.texture, icon.frame)
              .setDisplaySize(32, 32),
          );
        }
        const ratio = Math.max(0, Math.min(1, instance.durability / instance.maxDurability));
        this.root.add(
          this.scene.add
            .rectangle(x + 4, y + GRID.size - 7, (GRID.size - 8) * ratio, 3, TINTS.energy, 1)
            .setOrigin(0, 0),
        );
        const zone = this.scene.add
          .zone(x + GRID.size / 2, y + GRID.size / 2, GRID.size, GRID.size)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerover', (pointer: Phaser.Input.Pointer) =>
          this.showGearTooltip(instance, pointer.x, pointer.y),
        );
        zone.on('pointerout', () => this.hideTooltip());
        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (!this.touchArmed(`gear:${instance.instanceId}`)) {
            this.showGearTooltip(instance, pointer.x, pointer.y);
            return;
          }
          if (pointer.rightButtonDown()) {
            const gained = recycleInstance(state, instance.instanceId);
            if (gained) {
              this.scene.game.events.emit(
                'ui:banner',
                `回炉：获得铁锭 ×${gained.count}`,
              );
            }
            this.rebuild();
            return;
          }
          equipInstance(state, instance.instanceId);
          this.rebuild();
        });
        this.root.add(zone);
      }
    }

    const capacity = `${state.inventory.length} 种物品 · ${gear.length} 件装备`;
    this.root.add(makeText(this.scene, GRID.x, 286, capacity, { color: COLORS.inkSoft }));
    const hint = this.scene.registry.get('touchEnabled')
      ? '点击查看 · 再次点击穿戴/食用'
      : '左键穿戴/食用 · 右键回炉/丢弃';
    this.root.add(makeText(this.scene, GRID.x, 266, hint, { color: COLORS.muted }));

    const sortButton = makeText(this.scene, GRID.x, 306, '整理背包（合并 / 按品级排序）', {
      color: COLORS.goldDark,
    });
    sortButton.setInteractive({ useHandCursor: true });
    sortButton.on('pointerdown', () => {
      sortInventory(state);
      this.rebuild();
    });
    this.root.add(sortButton);
  }

  private showStackTooltip(baseId: string, px: number, py: number): void {
    const def = ITEMS[baseId];
    if (!def) return;
    const stack = this.state?.inventory.find((item) => item.baseId === baseId);
    const lines = [`${def.name} · ${KIND_LABEL[def.kind] ?? def.kind}`];
    if (stack?.durability !== undefined) lines.push(`耐久 ${stack.durability}/${def.maxDurability ?? '?'}`);
    lines.push(...foodEffectLines(baseId));
    if (isEdible(baseId)) lines.push('点击食用');
    this.buildTooltip(lines, px, py);
  }

  private showGearTooltip(instance: EquipInstance, px: number, py: number): void {
    const base = EQUIPMENT[instance.baseId];
    if (!base) return;
    const rarity = RARITY[instance.rarity];
    const lines = [`${base.name} · ${rarity.label}`];
    lines.push(...gearStatLines(instance));
    for (const affix of instance.affixes) {
      const def = AFFIXES.find((entry) => entry.id === affix.id);
      const value = affix.id.endsWith('Pct') || ['stun', 'savage', 'gather', 'move', 'hunger', 'durability'].includes(affix.id)
        ? `${Math.round(affix.value * 100)}%`
        : `${affix.value}`;
      lines.push(`${def?.name ?? affix.id} ${value}`);
    }
    if (instance.uniqueTraitId) {
      lines.push(`传说：${base.legendary.name} — ${base.legendary.desc}`);
    }
    if (this.state) {
      const equipped = this.state.equipment[instance.slot] === instance.instanceId;
      if (!equipped) {
        const delta = compareEquipment(this.state, instance);
        const parts: string[] = [];
        if (delta.attack) parts.push(`攻击 ${delta.attack > 0 ? '+' : ''}${delta.attack}`);
        if (delta.defense) parts.push(`防御 ${delta.defense > 0 ? '+' : ''}${delta.defense}`);
        if (delta.movePct) parts.push(`移速 ${delta.movePct > 0 ? '+' : ''}${delta.movePct}%`);
        if (delta.maxDurability) parts.push(`耐久 ${delta.maxDurability > 0 ? '+' : ''}${delta.maxDurability}`);
        if (parts.length > 0) lines.push(`对比：${parts.join(' ')}`);
        lines.push('点击穿戴');
      } else {
        lines.push('已装备 · 点击卸下');
      }
    }
    lines.push('右键回炉：熔成铁锭');
    this.buildTooltip(lines, px, py);
  }

  private buildTooltip(lines: string[], px: number, py: number): void {
    this.hideTooltip();
    const w = Math.max(148, Math.min(240, Math.max(...lines.map((line) => line.length)) * 12 + 16));
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
    this.tooltipWidth = w;
    this.root.add(container);
    this.positionTooltip(px, py);
    this.tooltipTimer?.remove();
    this.tooltipTimer = this.scene.time.delayedCall(4000, () => this.hideTooltip());
  }

  private hideTooltip(): void {
    this.tooltipTimer?.remove();
    this.tooltipTimer = undefined;
    this.tooltip?.destroy();
    this.tooltip = null;
  }

  private touchArmed(key: string): boolean {
    if (!this.scene.registry.get('touchEnabled')) return true;
    const now = this.scene.time.now;
    const armed = this.lastTap.key === key && now - this.lastTap.at < 1500;
    this.lastTap = armed ? { key: '', at: 0 } : { key, at: now };
    return armed;
  }

  private positionTooltip(px: number, py: number): void {
    if (!this.tooltip) return;
    const point = clampTooltip(px + 14, py + 14, this.tooltipWidth, this.tooltipHeight, 640, 360);
    this.tooltip.setPosition(point.x, point.y);
  }
}
