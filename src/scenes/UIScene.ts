import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { Hud } from '../ui/hud';
import { Panel } from '../ui/panel';
import { InventoryOverlay } from '../ui/inventoryPanel';
import { MapPanel } from '../ui/mapPanel';
import { Minimap } from '../ui/minimap';
import { AdventurePanel } from '../ui/adventurePanel';
import { TouchControls } from '../ui/touchControls';
import { TouchMenu } from '../ui/touchMenu';
import { isTouchDevice, prefersTouchLayout } from '../core/platform';
import { CROPS } from '../data/farming';
import { countItem } from '../systems/inventorySystem';
import { plantCrop } from '../systems/farmingSystem';
import { makeText } from '../ui/text';
import { openCraftPanel } from '../ui/craftPanel';
import { openCampPanel } from '../ui/campPanel';
import type { Station } from '../data/recipes';
import { openBuildMenu } from '../ui/buildMenu';
import { openLaborPanel } from '../ui/laborPanel';
import type { EventBus } from '../core/eventBus';
import { playSfx } from '../systems/audio';
import { MusicManager } from '../systems/music';
import type { UiPanel } from '../systems/interactionSystem';

export class UIScene extends Phaser.Scene {
  private hud!: Hud;
  private panel!: Panel;
  private inventory!: InventoryOverlay;
  private map!: MapPanel;
  private minimap!: Minimap;
  private adventure!: AdventurePanel;
  private touch?: TouchControls;
  private touchMenu?: TouchMenu;
  private closeButton?: Phaser.GameObjects.Container;
  private music?: MusicManager;
  private bannerHandler = (text: string): void => this.hud.showBanner(text);
  private panelHandler = (kind: string): void => this.openPanel(kind);
  private craftStationHandler = (station: Station): void =>
    this.withState((state) => this.openCraft(state, station));
  private hudCompactHandler = (compact: boolean): void => {
    const state = this.state();
    if (!state) return;
    state.settings.hudCompact = compact;
    const bus = this.registry.get('bus') as EventBus | undefined;
    bus?.emit('save:requested', { reason: 'settings' });
  };
  private panelKind: 'build' | 'craft' | 'camp' | 'labor' | 'seed' | null = null;
  private busHandlers: { event: string; handler: (payload: any) => void }[] = [];

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.hud = new Hud(this);
    this.panel = new Panel(this);
    this.inventory = new InventoryOverlay(this);
    this.map = new MapPanel(this);
    this.map.onTeleport = (x, y) => {
      this.map.close();
      this.game.events.emit('ui:teleport', { x, y });
    };
    this.minimap = new Minimap(this, () => {
      if (this.panel.isOpen || this.inventory.isOpen || this.map.isOpen) return;
      this.toggleMap();
    });
    this.adventure = new AdventurePanel(this);
    this.music = new MusicManager(this);
    this.registry.set('musicManager', this.music);
    this.hud.setCompact(Boolean(this.state()?.settings.hudCompact));

    const state = this.state();
    const touchLayout =
      Boolean(state) &&
      prefersTouchLayout({
        touch: isTouchDevice(),
        width: window.innerWidth,
        height: window.innerHeight,
      });
    if (touchLayout) {
      this.touch = new TouchControls(this);
      this.closeButton = this.makeCloseButton();
      this.touch.setEnabled(Boolean(state!.settings.touchControls));
      this.touchMenu = new TouchMenu(this, {
        inventory: () => this.withState((s) => this.inventory.toggle(s)),
        craft: () => this.withState((s) => this.openCraft(s)),
        build: () => this.withState((s) => this.openBuild(s)),
        labor: () => this.withState((s) => this.openLabor(s)),
        map: () => this.toggleMap(),
        adventure: () => this.withState((s) => this.adventure.toggle(s)),
        pause: () => this.openPause(),
        guide: () => this.openGuideFromMenu(),
        toggleTouch: () => {
          const state = this.state();
          if (!state) return;
          state.settings.touchControls = !state.settings.touchControls;
          this.registry.set('touchEnabled', Boolean(state.settings.touchControls));
          this.touch?.setEnabled(Boolean(state.settings.touchControls));
          const bus = this.registry.get('bus') as EventBus | undefined;
          bus?.emit('save:requested', { reason: 'settings' });
        },
      });
      this.game.events.on('ui:touchMenu', this.onTouchMenu);
    }
    this.registry.set('touchEnabled', touchLayout && Boolean(state?.settings.touchControls));
    this.registry.set('touchLayout', touchLayout);
    if (state && !state.flags.controlsSeen && state.scene === 'island') {
      this.time.delayedCall(500, () => this.openFirstGuide());
    }

    // Dev-only QA shortcut: /AI_LBS/?panel=map&zoom=2 opens the map.
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const panelKind = params.get('panel');
      if (panelKind === 'map') {
        this.withState((state) => {
          this.map.toggle(state);
          const zoom = Number(params.get('zoom'));
          if (zoom > 1) this.map.setZoom(state, zoom);
        });
      } else if (panelKind === 'build') {
        this.withState((state) => this.openBuild(state));
      } else if (panelKind === 'labor') {
        this.withState((state) => this.openLabor(state));
      }
    }

    const notice = this.registry.get('loadNotice') as string | undefined;
    if (notice) {
      this.registry.set('loadNotice', null);
      this.time.delayedCall(250, () => this.hud.showBanner(notice, 3200));
    }

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-I', () => {
        this.panel.close();
        this.map.close();
        this.withState((state) => this.inventory.toggle(state));
      });
      keyboard.on('keydown-C', () => this.withState((state) => this.openCraft(state)));
      keyboard.on('keydown-B', () => this.withState((state) => this.openBuild(state)));
      keyboard.on('keydown-L', () => this.withState((state) => this.openLabor(state)));
      keyboard.on('keydown-M', () => this.toggleMap());
      keyboard.on('keydown-R', () => {
        this.panel.close();
        this.inventory.close();
        this.map.close();
        this.withState((state) => this.adventure.toggle(state));
      });
      keyboard.on('keydown-ESC', () => {
        if (this.adventure.isOpen) {
          this.adventure.close();
          return;
        }
        if (this.map.isOpen) {
          this.map.close();
          return;
        }
        if (this.inventory.isOpen) {
          this.inventory.close();
          return;
        }
        if (this.panel.isOpen) {
          this.panel.close();
          return;
        }
        this.openPause();
      });
    }

    this.game.events.on('ui:banner', this.bannerHandler);
    this.game.events.on('ui:panel', this.panelHandler);
    this.game.events.on('ui:craftAt', this.craftStationHandler);
    this.game.events.on('ui:hudCompact', this.hudCompactHandler);
    this.game.events.on('ui:seedPicker', this.seedPickerHandler);
    this.input.on('pointerdown', () => {
      if (this.registry.get('uiOpen')) playSfx(this, this.state(), 'click');
    });
    this.events.once('shutdown', () => {
      this.game.events.off('ui:banner', this.bannerHandler);
      this.game.events.off('ui:panel', this.panelHandler);
      this.game.events.off('ui:craftAt', this.craftStationHandler);
      this.game.events.off('ui:hudCompact', this.hudCompactHandler);
      this.game.events.off('ui:touchMenu', this.onTouchMenu);
      this.game.events.off('ui:seedPicker', this.seedPickerHandler);
      this.music?.destroy();
      this.registry.remove('musicManager');
    });

    const bus = this.registry.get('bus') as EventBus | undefined;
    if (bus) {      this.listen(bus, 'raid:warning', () => {
        playSfx(this, this.state(), 'warning');
        this.hud.showBanner('周五 17:00：野人将在 18:00 来袭！');
      });
      this.listen(bus, 'raid:started', () => this.hud.showBanner('野人入侵！击晕后用藤蔓捆绑'));
      this.listen(bus, 'labor:fled', () => this.hud.showBanner('有劳工因断粮逃跑了'));
      this.listen(bus, 'camp:levelUp', (payload) => this.hud.showBanner(`营地升级到 Lv${payload.level}`));
      this.listen(bus, 'tutorial:advanced', () => this.hud.showBanner('目标完成'));
      this.listen(bus, 'player:levelUp', (payload) => {
        playSfx(this, this.state(), 'legendary');
        this.hud.showBanner(`升级！Lv${payload.level}`, 3200);
      });
    }
  }

  update(): void {
    const state = this.state();
    if (state) {
      this.hud.update(state);
      this.music?.update(state);
      this.minimap.setVisible(!this.registry.get('inDungeon'));
      this.minimap.update(state);
    }
    this.registry.set(
      'uiOpen',
      this.panel.isOpen ||
        this.inventory.isOpen ||
        this.map.isOpen ||
        this.adventure.isOpen ||
        Boolean(this.touchMenu?.isOpen) ||
        this.scene.isActive('GuideScene'),
    );
    const uiOpen = Boolean(this.registry.get('uiOpen'));
    this.touch?.setPanelOpen(uiOpen);
    this.touch?.setBuildMode(Boolean(this.registry.get('buildSelection')));
    this.touch?.setEnabled(Boolean(state?.settings.touchControls));
    this.closeButton?.setVisible(uiOpen && !this.scene.isActive('GuideScene'));
    this.registry.set('touchEnabled', Boolean(this.touch) && Boolean(state?.settings.touchControls));
    const uiPanel: UiPanel = this.inventory.isOpen
      ? 'inventory'
      : this.map.isOpen
        ? 'map'
        : this.adventure.isOpen
          ? 'adventure'
          : this.touchMenu?.isOpen
            ? 'menu'
            : this.panel.isOpen
              ? (this.panelKind ?? 'build')
              : null;
    this.registry.set('uiPanel', uiPanel);
    const prompt = this.registry.get('interactPrompt');
    this.hud.setPrompt(typeof prompt === 'string' ? prompt : null);
    this.touch?.setInteractLabel(
      typeof prompt === 'string' ? prompt.replace(/^E\s*/, '').slice(0, 6) : '交互',
    );
    const progress = this.registry.get('interactProgress');
    this.hud.setProgress(typeof progress === 'number' ? progress : null);
  }

  private listen(bus: EventBus, event: string, handler: (payload: any) => void): void {
    bus.on(event, handler);
    this.busHandlers.push({ event, handler });
    this.events.once('shutdown', () => bus.off(event, handler));
  }

  private seedPickerHandler = (buildingId: string): void => {
    this.withState((state) => this.openSeedPicker(state, buildingId));
  };

  private onTouchMenu = (): void => {
    if (this.registry.get('buildSelection')) {
      this.game.events.emit('ui:cancelBuild');
      return;
    }
    if (this.scene.isActive('GuideScene')) return;
    if (this.anyPanelOpen()) this.closeAllPanels();
    else this.touchMenu?.toggle();
  };

  private anyPanelOpen(): boolean {
    return (
      this.panel.isOpen ||
      this.inventory.isOpen ||
      this.map.isOpen ||
      this.adventure.isOpen ||
      Boolean(this.touchMenu?.isOpen)
    );
  }

  private makeCloseButton(): Phaser.GameObjects.Container {
    const root = this.add.container(622, 334).setDepth(9600).setScrollFactor(0).setVisible(false);
    const circle = this.add
      .circle(0, 0, 14, 0x3a2412, 0.95)
      .setStrokeStyle(2, 0xb8792a, 1);
    const text = makeText(this, 0, 0, '×', {
      size: 24,
      origin: [0.5, 0.5],
      color: '#f0e6d2',
    });
    const zone = this.add.zone(0, 0, 34, 34).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.closeAllPanels());
    root.add([circle, text, zone]);
    return root;
  }

  private closeAllPanels(): void {
    this.panel.close();
    this.inventory.close();
    this.map.close();
    this.adventure.close();
    this.touchMenu?.close();
  }

  private openFirstGuide(): void {
    const state = this.state();
    if (!state || state.flags.controlsSeen || this.scene.isActive('GuideScene')) return;
    this.panel.close();
    this.inventory.close();
    this.map.close();
    this.adventure.close();
    this.scene.pause('IslandScene');
    this.scene.launch('GuideScene', { resume: ['IslandScene'] });
  }

  private openGuideFromMenu(): void {
    const state = this.state();
    if (!state || this.scene.isActive('GuideScene')) return;
    this.closeAllPanels();
    const active = state.scene === 'dungeon' ? 'DungeonScene' : 'IslandScene';
    this.scene.pause(active);
    this.scene.pause();
    this.scene.launch('GuideScene', { resume: [active, 'UIScene'] });
  }

  private openPanel(kind: string): void {
    this.withState((state) => {
      if (kind === 'inventory') this.inventory.toggle(state);
      else if (kind === 'craft') this.openCraft(state);
      else if (kind === 'build') this.openBuild(state);
      else if (kind === 'labor') this.openLabor(state);
      else if (kind === 'camp') this.openCamp(state);
    });
  }

  private openCamp(state: GameState): void {
    playSfx(this, state, 'open');
    this.inventory.close();
    this.map.close();
    this.panelKind = 'camp';
    openCampPanel(this.panel, state, this.registry.get('bus') as EventBus | undefined);
  }

  /** M key and minimap click: close other modals, then toggle the map. */
  private toggleMap(): void {
    playSfx(this, this.state(), 'open');
    this.panel.close();
    this.inventory.close();
    this.withState((state) => this.map.toggle(state));
  }

  private openCraft(state: GameState, station: Station = 'hand'): void {
    playSfx(this, state, 'open');
    this.inventory.close();
    this.map.close();
    this.panelKind = 'craft';
    openCraftPanel(
      this.panel,
      state,
      station,
      this.registry.get('bus') as EventBus | undefined,
    );
  }

  private openBuild(state: GameState): void {
    playSfx(this, state, 'open');
    this.inventory.close();
    this.map.close();
    this.panelKind = 'build';
    openBuildMenu(this.panel, state, (type) => this.selectBuild(type));
  }

  private openLabor(state: GameState): void {
    playSfx(this, state, 'open');
    this.inventory.close();
    this.map.close();
    this.panelKind = 'labor';
    openLaborPanel(this.panel, state);
  }

  private openSeedPicker(state: GameState, buildingId: string): void {
    const available = Object.values(CROPS)
      .map((def) => ({ def, count: countItem(state, def.seedId) }))
      .filter((entry) => entry.count > 0);
    if (available.length === 0) {
      this.hud.showBanner('需要浆果或椰子做种子');
      return;
    }
    this.closeAllPanels();
    playSfx(this, state, 'open');
    this.panelKind = 'seed';
    this.panel.open(
      '选择种子',
      available.map(({ def, count }) => ({
        label: `${def.name} ×${count}`,
        detail: `浇水 ${def.growPoints / 2} 天成熟`,
        onClick: () => {
          if (plantCrop(state, buildingId, def.seedId)) {
            this.hud.showBanner(`种下了${def.name}`);
            this.panel.close();
          }
        },
      })),
    );
  }

  private state(): GameState | null {
    return (this.registry.get('state') as GameState | undefined) ?? null;
  }

  private withState(action: (state: GameState) => void): void {
    const state = this.state();
    if (state) action(state);
  }

  private selectBuild(type: string): void {
    this.registry.set('buildSelection', type);
    this.game.events.emit('ui:buildSelect', type);
    this.panel.close();
    this.hud.showBanner(`已选择蓝图：${type}，左键放置，Esc 取消`);
  }

  private openPause(): void {
    if (this.scene.isActive('PauseScene')) return;
    this.panel.close();
    this.game.events.emit('ui:cancelFishing');
    this.touch?.setEnabled(false);
    this.scene.pause('IslandScene');
    this.scene.pause();
    this.scene.launch('PauseScene');
  }
}
