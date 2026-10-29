import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { ITEMS } from '../data/items';
import { selectHotbar } from '../systems/inventorySystem';
import { playSfx } from '../systems/audio';
import { getCampChecklist } from '../systems/campSystem';
import { currentGoal } from '../systems/tutorialSystem';
import { formatClock, formatDay, getInteractPrompt } from './format';
import { makeText } from './text';
import { COLORS, TINTS } from './theme';
import { ensureHudIcons, iconColor, iconTexture, type HudIcon } from './icons';
import { itemIcon } from './itemIcons';
import { HUD, barWidth, hotbarSlotRect } from './widgets/layout';
import { drawPanel } from './widgets/panel';
import { drawBarTrack } from './widgets/bar';
import { drawSlot } from './widgets/slot';

const BAR_W = 78;
const BAR_H = 8;
const ROW_H = 24;
const TEXT_INTERVAL = 200;

interface StatusRow {
  fill: Phaser.GameObjects.Rectangle;
  value: Phaser.GameObjects.Text;
}

interface HotbarSlot {
  number: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text;
  durability: Phaser.GameObjects.Rectangle;
}

export class Hud {
  private scene: Phaser.Scene;
  private chrome: Phaser.GameObjects.Graphics;
  private promptChrome: Phaser.GameObjects.Graphics;
  private slotChrome: Phaser.GameObjects.Graphics;
  private clockText: Phaser.GameObjects.Text;
  private sunIcon: Phaser.GameObjects.Image;
  private moonIcon: Phaser.GameObjects.Image;
  private bannerText: Phaser.GameObjects.Text;
  private bannerChrome: Phaser.GameObjects.Graphics;
  private bannerIcon: Phaser.GameObjects.Image;
  private campText: Phaser.GameObjects.Text;
  private campProgress: Phaser.GameObjects.Rectangle;
  private campLabel: Phaser.GameObjects.Text;
  private goalText: Phaser.GameObjects.Text;
  private promptText: Phaser.GameObjects.Text;
  private progressRing: Phaser.GameObjects.Graphics;
  private rows!: Record<'hp' | 'hunger' | 'thirst' | 'energy', StatusRow>;
  private statusChrome!: Phaser.GameObjects.Graphics;
  private goalChrome!: Phaser.GameObjects.Graphics;
  private compactChrome!: Phaser.GameObjects.Graphics;
  private compactBars: Phaser.GameObjects.Rectangle[] = [];
  private compactIcons: Phaser.GameObjects.Image[] = [];
  private rowObjects: Phaser.GameObjects.GameObject[] = [];
  private compactToggle!: Phaser.GameObjects.Text;
  private compactZone!: Phaser.GameObjects.Zone;
  private compact = false;
  private slots: HotbarSlot[] = [];
  private lastTextAt = 0;
  private lastHotbarIndex = -1;
  private promptOverride: string | null = null;
  private bannerQueue: { text: string; duration: number }[] = [];
  private bannerUntil = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    ensureHudIcons(scene);
    this.chrome = scene.add.graphics().setDepth(8000).setScrollFactor(0);
    this.slotChrome = scene.add.graphics().setDepth(8000).setScrollFactor(0);

    for (const rect of [HUD.clock, HUD.camp]) {
      drawPanel(this.chrome, rect);
    }
    this.statusChrome = scene.add.graphics().setDepth(8000).setScrollFactor(0);
    drawPanel(this.statusChrome, HUD.status);
    this.goalChrome = scene.add.graphics().setDepth(8000).setScrollFactor(0);
    drawPanel(this.goalChrome, HUD.goal);
    this.compactChrome = scene.add.graphics().setDepth(8000).setScrollFactor(0).setVisible(false);
    drawPanel(this.compactChrome, HUD.statusCompact);
    this.bannerChrome = scene.add.graphics().setDepth(8000).setScrollFactor(0).setVisible(false);
    drawPanel(this.bannerChrome, HUD.banner);
    this.promptChrome = scene.add.graphics().setDepth(8000).setScrollFactor(0).setVisible(false);
    drawPanel(this.promptChrome, HUD.prompt);

    this.sunIcon = scene.add
      .image(HUD.clock.x + 10, HUD.clock.y + 15, iconTexture('sun'))
      .setDepth(8001)
      .setScrollFactor(0);
    this.moonIcon = scene.add
      .image(HUD.clock.x + 10, HUD.clock.y + 15, iconTexture('moon'))
      .setDepth(8001)
      .setScrollFactor(0)
      .setVisible(false);
    this.clockText = makeText(scene, HUD.clock.x + 20, HUD.clock.y + 15, '', {
      origin: [0, 0.5],
      color: COLORS.ink,
    })
      .setDepth(8001)
      .setScrollFactor(0);

    this.bannerIcon = scene.add
      .image(HUD.banner.x + 10, HUD.banner.y + 15, iconTexture('campfire'))
      .setDepth(8001)
      .setScrollFactor(0)
      .setVisible(false);
    this.bannerText = makeText(scene, HUD.banner.x + HUD.banner.w / 2 + 6, HUD.banner.y + 15, '', {
      origin: [0.5, 0.5],
      color: COLORS.ink,
    })
      .setDepth(8001)
      .setScrollFactor(0)
      .setVisible(false);

    this.campText = makeText(scene, HUD.camp.x + 8, HUD.camp.y + 6, '', {
      color: COLORS.ink,
    })
      .setDepth(8001)
      .setScrollFactor(0);
    drawBarTrack(this.chrome, {
      x: HUD.camp.x + 8,
      y: HUD.camp.y + 21,
      w: HUD.camp.w - 46,
      h: 6,
      color: TINTS.goldDark,
    });
    this.campProgress = scene.add
      .rectangle(HUD.camp.x + 8, HUD.camp.y + 21, 0, 6, TINTS.gold, 1)
      .setOrigin(0, 0)
      .setDepth(8001)
      .setScrollFactor(0);
    this.campLabel = makeText(scene, HUD.camp.x + HUD.camp.w - 8, HUD.camp.y + 6, '', {
      origin: [1, 0],
      color: COLORS.inkSoft,
    })
      .setDepth(8001)
      .setScrollFactor(0);

    this.createStatusRows();

    this.goalText = makeText(scene, HUD.goal.x + 8, HUD.goal.y + 13, '', {
      origin: [0, 0.5],
      color: COLORS.ink,
    })
      .setDepth(8001)
      .setScrollFactor(0);

    this.promptText = makeText(scene, HUD.prompt.x + HUD.prompt.w / 2, HUD.prompt.y + 12, '', {
      origin: [0.5, 0.5],
      color: COLORS.ink,
      align: 'center',
    })
      .setDepth(8001)
      .setScrollFactor(0);
    this.progressRing = scene.add.graphics().setDepth(8600).setScrollFactor(0);

    this.createHotbar();
  }

  private createStatusRows(): void {
    const rows: Array<['hp' | 'hunger' | 'thirst' | 'energy', HudIcon, string]> = [
      ['hp', 'hp', '生命'],
      ['hunger', 'hunger', '饱食'],
      ['thirst', 'thirst', '口渴'],
      ['energy', 'energy', '精力'],
    ];
    this.rows = {} as Record<'hp' | 'hunger' | 'thirst' | 'energy', StatusRow>;
    rows.forEach(([key, icon, label], index) => {
      const top = HUD.status.y + 8 + index * ROW_H;
      const iconImage = this.scene.add
        .image(HUD.status.x + 12, top + 5, iconTexture(icon))
        .setDepth(8001)
        .setScrollFactor(0);
      const labelText = makeText(this.scene, HUD.status.x + 26, top + 5, label, {
        origin: [0, 0.5],
        color: COLORS.ink,
      })
        .setDepth(8001)
        .setScrollFactor(0);
      drawBarTrack(this.statusChrome, {
        x: HUD.status.x + 66,
        y: top + 1,
        w: BAR_W,
        h: BAR_H,
        color: iconColor(icon),
      });
      const fill = this.scene.add
        .rectangle(HUD.status.x + 66, top + 1, BAR_W, BAR_H, iconColor(icon), 1)
        .setOrigin(0, 0)
        .setDepth(8001)
        .setScrollFactor(0);
      const value = makeText(this.scene, HUD.status.x + HUD.status.w - 8, top + 5, '', {
        origin: [1, 0.5],
        color: COLORS.ink,
      })
        .setDepth(8001)
        .setScrollFactor(0);
      this.rows[key] = { fill, value };
      this.rowObjects.push(iconImage, labelText, fill, value);

      const compactIcon = this.scene.add
        .image(
          HUD.statusCompact.x + 7,
          HUD.statusCompact.y + 3 + index * 7,
          iconTexture(icon),
        )
        .setDisplaySize(6, 6)
        .setDepth(8001)
        .setScrollFactor(0)
        .setVisible(false);
      const compactBar = this.scene.add
        .rectangle(
          HUD.statusCompact.x + 16,
          HUD.statusCompact.y + 3 + index * 7,
          118,
          3,
          iconColor(icon),
          1,
        )
        .setOrigin(0, 0)
        .setDepth(8001)
        .setScrollFactor(0)
        .setVisible(false);
      this.compactIcons.push(compactIcon);
      this.compactBars.push(compactBar);
    });

    this.compactToggle = makeText(
      this.scene,
      HUD.status.x + HUD.status.w - 12,
      HUD.status.y + HUD.status.h - 14,
      '▾',
      { color: COLORS.inkSoft },
    )
      .setDepth(8003)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.compactToggle.on('pointerdown', () => {
      this.setCompact(!this.compact);
      this.scene.game.events.emit('ui:hudCompact', this.compact);
    });
    this.compactZone = this.scene.add
      .zone(this.compactToggle.x, this.compactToggle.y, 28, 28)
      .setDepth(8003)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.compactZone.on('pointerdown', () => {
      this.setCompact(!this.compact);
      this.scene.game.events.emit('ui:hudCompact', this.compact);
    });
  }

  /** Collapses the four status rows into thin coloured lines. */
  setCompact(compact: boolean): void {
    this.compact = compact;
    this.statusChrome.setVisible(!compact);
    for (const object of this.rowObjects) {
      (object as unknown as { setVisible: (v: boolean) => void }).setVisible(!compact);
    }
    this.compactChrome.setVisible(compact);
    for (const bar of this.compactBars) bar.setVisible(compact);
    for (const icon of this.compactIcons) icon.setVisible(compact);
    const rect = compact ? HUD.goalCompact : HUD.goal;
    this.goalChrome.clear();
    drawPanel(this.goalChrome, rect);
    this.goalText.setPosition(rect.x + 8, rect.y + 13);
    this.compactToggle
      .setText(compact ? '▸' : '▾')
      .setPosition(
        (compact ? HUD.statusCompact.x + HUD.statusCompact.w : HUD.status.x + HUD.status.w) - 12,
        (compact
          ? HUD.statusCompact.y + HUD.statusCompact.h
          : HUD.status.y + HUD.status.h) - 14,
      );
    this.compactZone.setPosition(this.compactToggle.x, this.compactToggle.y);
  }

  private createHotbar(): void {
    for (let index = 0; index < 8; index++) {
      const rect = hotbarSlotRect(index);
      const number = makeText(this.scene, rect.x + 3, rect.y + 1, String(index + 1), {
        color: COLORS.muted,
      })
        .setDepth(8002)
        .setScrollFactor(0);
      const label = makeText(this.scene, rect.x + rect.size / 2, rect.y + 13, '', {
        origin: [0.5, 0],
        color: COLORS.cream,
      })
        .setDepth(8002)
        .setScrollFactor(0);
      const icon = this.scene.add
        .image(rect.x + rect.size / 2, rect.y + rect.size / 2, 'icon-stick')
        .setDisplaySize(26, 26)
        .setDepth(8002)
        .setScrollFactor(0)
        .setVisible(false);
      const count = makeText(this.scene, rect.x + rect.size - 3, rect.y + rect.size - 1, '', {
        origin: [1, 1],
        color: COLORS.gold,
      })
        .setDepth(8002)
        .setScrollFactor(0);
      const durability = this.scene.add
        .rectangle(rect.x + 4, rect.y + rect.size - 5, rect.size - 8, 3, TINTS.energy, 1)
        .setOrigin(0, 0)
        .setDepth(8002)
        .setScrollFactor(0)
        .setVisible(false);
      this.slots.push({ number, label, icon, count, durability });

      const zone = this.scene.add
        .zone(rect.x + rect.size / 2, rect.y + rect.size / 2, rect.size, rect.size)
        .setDepth(8002)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        const state = this.scene.registry.get('state') as GameState | undefined;
        if (!state) return;
        selectHotbar(state, index);
        playSfx(this.scene, state, 'click');
      });
    }
  }

  private redrawHotbarChrome(selected: number): void {
    this.slotChrome.clear();
    for (let index = 0; index < 8; index++) {
      const rect = hotbarSlotRect(index);
      drawSlot(this.slotChrome, rect.x, rect.y, rect.size, index === selected);
    }
  }

  update(state: GameState): void {
    const now = this.scene.time.now;
    this.drawStatus('hp', state.player.hp);
    this.drawStatus('hunger', state.player.hunger);
    this.drawStatus('thirst', state.player.thirst);
    this.drawStatus('energy', state.player.energy);

    if (state.hotbarIndex !== this.lastHotbarIndex) {
      this.lastHotbarIndex = state.hotbarIndex;
      this.redrawHotbarChrome(state.hotbarIndex);
    }

    if (now - this.lastTextAt < TEXT_INTERVAL) return;
    this.lastTextAt = now;

    this.setIfChanged(
      this.clockText,
      `${formatDay(state.time.day)}  ${formatClock(state.time.clockMin)}`,
    );
    const night = state.time.phase === 'night';
    this.sunIcon.setVisible(!night);
    this.moonIcon.setVisible(night);

    const checklist = getCampChecklist(state);
    const done = checklist.filter((row) => row.done).length;
    this.setIfChanged(this.campText, `营地 Lv${state.camp.level}`);
    this.setIfChanged(this.campLabel, `${done}/${checklist.length}`);
    this.campProgress.setSize(barWidth(done, checklist.length, HUD.camp.w - 46), 6);

    const goal = currentGoal(state);
    this.setIfChanged(this.goalText, goal ? `目标：${goal.label}` : '目标：自由求生');

    const prompt = this.promptOverride ?? getInteractPrompt(state) ?? '';
    this.setIfChanged(this.promptText, prompt);
    this.promptChrome.setVisible(prompt.length > 0);
    this.promptText.setVisible(prompt.length > 0);

    for (let index = 0; index < 8; index++) {
      this.updateSlot(state, index);
    }

    this.tickBanner(now);
  }

  private updateSlot(state: GameState, index: number): void {
    const slot = this.slots[index];
    const baseId = state.hotbar[index];
    const name = baseId ? (ITEMS[baseId]?.name ?? baseId) : '';
    const icon = itemIcon(baseId);
    if (icon) {
      slot.icon.setTexture(icon.texture, icon.frame).setVisible(true);
      this.setIfChanged(slot.label, '');
    } else {
      slot.icon.setVisible(false);
      this.setIfChanged(slot.label, name ? name.slice(0, 1) : '');
    }
    this.setIfChanged(slot.number, String(index + 1));

    const stack = baseId
      ? state.inventory.find((item) => item.baseId === baseId && item.durability !== undefined)
      : undefined;
    const max = baseId ? ITEMS[baseId]?.maxDurability : undefined;
    if (stack && max && stack.durability !== undefined) {
      const ratio = Math.max(0, Math.min(1, stack.durability / max));
      slot.durability
        .setVisible(true)
        .setSize((hotbarSlotRect(index).size - 8) * ratio, 3)
        .setFillStyle(ratio > 0.3 ? TINTS.energy : TINTS.hp, 1);
    } else {
      slot.durability.setVisible(false);
    }

    const count = baseId
      ? state.inventory
          .filter((item) => item.baseId === baseId)
          .reduce((sum, item) => sum + item.count, 0)
      : 0;
    this.setIfChanged(slot.count, count > 1 ? String(count) : '');
  }

  private drawStatus(key: 'hp' | 'hunger' | 'thirst' | 'energy', value: number): void {
    const row = this.rows[key];
    const clamped = Math.max(0, Math.min(100, value));
    row.fill.setSize(barWidth(clamped, 100, BAR_W), BAR_H);
    this.setIfChanged(row.value, String(Math.round(clamped)));
    const index = (['hp', 'hunger', 'thirst', 'energy'] as const).indexOf(key);
    this.compactBars[index]?.setSize(Math.max(1, barWidth(clamped, 100, 120)), 3);
  }

  private setIfChanged(text: Phaser.GameObjects.Text, value: string): void {
    if (text.text !== value) text.setText(value);
  }

  private tickBanner(now: number): void {
    if (now < this.bannerUntil) return;
    const next = this.bannerQueue.shift();
    if (!next) {
      this.setBannerVisible(false);
      return;
    }
    this.bannerText.setText(next.text);
    this.setBannerVisible(true);
    this.bannerUntil = now + next.duration;
  }

  private setBannerVisible(visible: boolean): void {
    this.bannerChrome.setVisible(visible);
    this.bannerIcon.setVisible(visible);
    this.bannerText.setVisible(visible);
  }

  setPrompt(text: string | null): void {
    this.promptOverride = text;
  }

  /** 0..1 while an interaction is channelling, null when idle. */
  setProgress(value: number | null): void {
    this.progressRing.clear();
    if (value === null || value <= 0) return;
    const clamped = Math.max(0, Math.min(1, value));
    const cx = HUD.prompt.x + HUD.prompt.w / 2;
    const cy = HUD.prompt.y + 12;
    this.progressRing.lineStyle(3, TINTS.gold, 0.95);
    this.progressRing.beginPath();
    this.progressRing.arc(cx, cy, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamped, false);
    this.progressRing.strokePath();
    this.progressRing.fillStyle(0x111a24, 0.7);
    this.progressRing.fillCircle(cx, cy, 9);
  }

  showBanner(text: string, durationMs = 2600): void {
    this.bannerQueue.push({ text, duration: durationMs });
  }
}
