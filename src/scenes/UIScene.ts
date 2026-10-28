import Phaser from 'phaser';
import type { GameState } from '../core/gameState';
import { Hud } from '../ui/hud';
import { Panel } from '../ui/panel';
import { InventoryOverlay } from '../ui/inventoryPanel';
import { MapPanel } from '../ui/mapPanel';
import { Minimap } from '../ui/minimap';
import { openCraftPanel } from '../ui/craftPanel';
import { openBuildMenu } from '../ui/buildMenu';
import { openLaborPanel } from '../ui/laborPanel';
import type { EventBus } from '../core/eventBus';

export class UIScene extends Phaser.Scene {
  private hud!: Hud;
  private panel!: Panel;
  private inventory!: InventoryOverlay;
  private map!: MapPanel;
  private minimap!: Minimap;
  private bannerHandler = (text: string): void => this.hud.showBanner(text);
  private panelHandler = (kind: string): void => this.openPanel(kind);
  private busHandlers: { event: string; handler: (payload: any) => void }[] = [];

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.hud = new Hud(this);
    this.panel = new Panel(this);
    this.inventory = new InventoryOverlay(this);
    this.map = new MapPanel(this);
    this.minimap = new Minimap(this, () => {
      if (this.panel.isOpen || this.inventory.isOpen || this.map.isOpen) return;
      this.toggleMap();
    });

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
      keyboard.on('keydown-M', () => this.toggleMap());      keyboard.on('keydown-ESC', () => {
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
    this.events.once('shutdown', () => {
      this.game.events.off('ui:banner', this.bannerHandler);
      this.game.events.off('ui:panel', this.panelHandler);
    });

    const bus = this.registry.get('bus') as EventBus | undefined;
    if (bus) {
      this.listen(bus, 'raid:warning', () => this.hud.showBanner('周五 17:00：野人将在 18:00 来袭！'));
      this.listen(bus, 'raid:started', () => this.hud.showBanner('野人入侵！击晕后用藤蔓捆绑'));
      this.listen(bus, 'labor:fled', () => this.hud.showBanner('有劳工因断粮逃跑了'));
      this.listen(bus, 'camp:levelUp', (payload) => this.hud.showBanner(`营地升级到 Lv${payload.level}`));
      this.listen(bus, 'tutorial:advanced', () => this.hud.showBanner('目标完成'));
    }
  }

  update(): void {
    const state = this.state();
    if (state) {
      this.hud.update(state);
      this.minimap.setVisible(!this.registry.get('inDungeon'));
      this.minimap.update(state);
    }
    this.registry.set('uiOpen', this.panel.isOpen || this.inventory.isOpen || this.map.isOpen);
    const prompt = this.registry.get('interactPrompt');
    this.hud.setPrompt(typeof prompt === 'string' ? prompt : null);
    const progress = this.registry.get('interactProgress');
    this.hud.setProgress(typeof progress === 'number' ? progress : null);
  }

  private listen(bus: EventBus, event: string, handler: (payload: any) => void): void {
    bus.on(event, handler);
    this.busHandlers.push({ event, handler });
    this.events.once('shutdown', () => bus.off(event, handler));
  }

  private openPanel(kind: string): void {
    this.withState((state) => {
      if (kind === 'inventory') this.inventory.toggle(state);
      else if (kind === 'craft') this.openCraft(state);
      else if (kind === 'build') this.openBuild(state);
      else if (kind === 'labor') this.openLabor(state);
    });
  }

  /** M key and minimap click: close other modals, then toggle the map. */
  private toggleMap(): void {
    this.panel.close();
    this.inventory.close();
    this.withState((state) => this.map.toggle(state));
  }

  private openCraft(state: GameState): void {
    this.inventory.close();
    this.map.close();
    openCraftPanel(this.panel, state, this.nearStation());
  }

  private openBuild(state: GameState): void {
    this.inventory.close();
    this.map.close();
    openBuildMenu(this.panel, state, (type) => this.selectBuild(type));
  }

  private openLabor(state: GameState): void {
    this.inventory.close();
    this.map.close();
    openLaborPanel(this.panel, state);
  }

  private state(): GameState | null {
    return (this.registry.get('state') as GameState | undefined) ?? null;
  }

  private withState(action: (state: GameState) => void): void {
    const state = this.state();
    if (state) action(state);
  }

  private nearStation(): boolean {
    return Boolean(this.registry.get('nearStation'));
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
    this.scene.pause('IslandScene');
    this.scene.pause();
    this.scene.launch('PauseScene');
  }
}
