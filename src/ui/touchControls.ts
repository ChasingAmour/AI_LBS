import Phaser from 'phaser';
import { COLORS, TINTS } from './theme';
import { TOUCH } from './touchLayout';
import { makeText } from './text';

/** Virtual joystick + action buttons, drawn above the HUD but below panels. */
export class TouchControls {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private knob: Phaser.GameObjects.Arc;
  private interactText: Phaser.GameObjects.Text;
  private sprintRing: Phaser.GameObjects.Arc;
  private menuLabel: Phaser.GameObjects.Text;
  private buildCancel: Phaser.GameObjects.Container;
  private playObjects: Phaser.GameObjects.GameObject[] = [];
  private activePointer: number | null = null;
  private enabled = true;
  private panelOpen = false;
  private buildMode = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(8100).setScrollFactor(0);

    const base = scene.add
      .circle(TOUCH.joystick.x, TOUCH.joystick.y, TOUCH.joystick.radius, 0x1b120b, 0.55)
      .setStrokeStyle(2, TINTS.goldDark, 0.9);
    const ring = scene.add
      .circle(TOUCH.joystick.x, TOUCH.joystick.y, TOUCH.joystick.drag, 0x000000, 0)
      .setStrokeStyle(1, TINTS.goldDark, 0.35);
    this.knob = scene.add
      .circle(TOUCH.joystick.x, TOUCH.joystick.y, 14, 0xf0dfb8, 0.85)
      .setStrokeStyle(2, TINTS.woodDark, 1);
    this.root.add([ring, base, this.knob]);
    this.playObjects.push(ring, base, this.knob);

    const zone = scene.add
      .zone(TOUCH.joystick.x, TOUCH.joystick.y, TOUCH.joystick.drag * 2, TOUCH.joystick.drag * 2)
      .setInteractive();
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.activePointer = pointer.id;
      this.moveKnob(pointer);
    });
    this.root.add(zone);
    this.playObjects.push(zone);

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointer === pointer.id && pointer.isDown) this.moveKnob(pointer);
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointer !== pointer.id) return;
      this.activePointer = null;
      this.knob.setPosition(TOUCH.joystick.x, TOUCH.joystick.y);
      this.scene.registry.set('touchMove', { x: 0, y: 0 });
    });

    this.sprintRing = this.button(TOUCH.sprint, () => {
      const next = !this.scene.registry.get('touchSprint');
      this.scene.registry.set('touchSprint', next);
      this.sprintRing.setFillStyle(next ? 0xb8792a : 0x1b120b, 0.8);
    });
    this.button(TOUCH.attack, () => this.scene.game.events.emit('ui:touchAttack'));
    this.button(TOUCH.interact, () => this.scene.game.events.emit('ui:touchInteract'));
    const hints: Array<[string, number, number]> = [
      ['移动', TOUCH.joystick.x, TOUCH.joystick.y - TOUCH.joystick.radius - 10],
      ['攻击', TOUCH.attack.x, TOUCH.attack.y + TOUCH.attack.radius + 8],
      ['奔跑', TOUCH.sprint.x, TOUCH.sprint.y + TOUCH.sprint.radius + 8],
      ['菜单', TOUCH.menu.x, TOUCH.menu.y + TOUCH.menu.radius + 8],
    ];
    for (const [label, x, y] of hints) {
      const hint = makeText(scene, x, y, label, {
        origin: [0.5, 0],
        color: COLORS.cream,
        shadow: true,
      });
      this.root.add(hint);
      this.playObjects.push(hint);
    }
    this.interactText = makeText(scene, TOUCH.interact.x, TOUCH.interact.y + 23, '交互', {
      origin: [0.5, 0],
      color: COLORS.cream,
      shadow: true,
    });
    this.root.add(this.interactText);
    this.playObjects.push(this.interactText);

    this.menuLabel = this.menuButton();

    this.buildCancel = scene.add
      .container(TOUCH.menu.x, 320)
      .setVisible(false);
    const cancelCircle = scene.add
      .circle(0, 0, 20, 0x8a2f20, 0.95)
      .setStrokeStyle(2, 0xffb08a, 1);
    const cancelText = makeText(scene, 0, 0, '×', {
      size: 24,
      origin: [0.5, 0.5],
      color: '#fff3d6',
      shadow: true,
    });
    const cancelHint = makeText(scene, 0, 24, '取消', {
      origin: [0.5, 0],
      color: COLORS.cream,
      shadow: true,
    });
    const cancelZone = scene.add
      .zone(0, 0, 46, 46)
      .setInteractive(new Phaser.Geom.Circle(23, 23, 23), Phaser.Geom.Circle.Contains);
    cancelZone.on('pointerdown', () => scene.game.events.emit('ui:cancelBuild'));
    this.buildCancel.add([cancelCircle, cancelText, cancelHint, cancelZone]);
    this.root.add(this.buildCancel);
  }

  private button(
    def: { x: number; y: number; radius: number; label: string },
    onPress: () => void,
  ): Phaser.GameObjects.Arc {
    const circle = this.scene.add
      .circle(def.x, def.y, def.radius, 0x1b120b, 0.7)
      .setStrokeStyle(2, TINTS.goldDark, 0.95);
    const label = makeText(this.scene, def.x, def.y, def.label, {
      size: 24,
      origin: [0.5, 0.5],
      color: COLORS.cream,
      shadow: true,
    });
    const zone = this.scene.add
      .zone(def.x, def.y, def.radius * 2, def.radius * 2)
      .setInteractive(
        new Phaser.Geom.Circle(def.radius, def.radius, def.radius),
        Phaser.Geom.Circle.Contains,
      );
    zone.on('pointerdown', () => {
      circle.setFillStyle(0x8a5a2b, 0.9);
      this.scene.time.delayedCall(90, () => circle.setFillStyle(0x1b120b, 0.7));
      onPress();
    });
    this.root.add([circle, label, zone]);
    this.playObjects.push(circle, label, zone);
    return circle;
  }

  private menuButton(): Phaser.GameObjects.Text {
    const { x, y, radius, label } = TOUCH.menu;
    const circle = this.scene.add
      .circle(x, y, radius, 0x1b120b, 0.7)
      .setStrokeStyle(2, TINTS.goldDark, 0.95);
    const text = makeText(this.scene, x, y, label, {
      size: 24,
      origin: [0.5, 0.5],
      color: COLORS.cream,
      shadow: true,
    });
    const zone = this.scene.add
      .zone(x, y, radius * 2, radius * 2)
      .setInteractive(new Phaser.Geom.Circle(radius, radius, radius), Phaser.Geom.Circle.Contains);
    zone.on('pointerdown', () => this.scene.game.events.emit('ui:touchMenu'));
    this.root.add([circle, text, zone]);
    return text;
  }

  private moveKnob(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - TOUCH.joystick.x;
    const dy = pointer.y - TOUCH.joystick.y;
    const length = Math.hypot(dx, dy);
    const limit = TOUCH.joystick.drag;
    const scale = length > limit ? limit / length : 1;
    const nx = dx * scale;
    const ny = dy * scale;
    this.knob.setPosition(TOUCH.joystick.x + nx, TOUCH.joystick.y + ny);
    const magnitude = Math.min(1, length / limit);
    const inv = length > 0 ? magnitude / length : 0;
    this.scene.registry.set('touchMove', { x: dx * inv, y: dy * inv });
  }

  /** Hide the movement/action cluster while a modal is open or controls are off. */
  setPanelOpen(open: boolean): void {
    if (open === this.panelOpen) return;
    this.panelOpen = open;
    this.applyVisibility();
    this.menuLabel.setText(open ? '×' : '≡');
    if (open) {
      this.activePointer = null;
      this.knob.setPosition(TOUCH.joystick.x, TOUCH.joystick.y);
      this.scene.registry.set('touchMove', { x: 0, y: 0 });
      this.scene.registry.set('touchSprint', false);
    }
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.applyVisibility();
    if (!enabled) {
      this.activePointer = null;
      this.scene.registry.set('touchMove', { x: 0, y: 0 });
      this.scene.registry.set('touchSprint', false);
    }
  }

  setBuildMode(active: boolean): void {
    if (active === this.buildMode) return;
    this.buildMode = active;
    this.applyVisibility();
  }

  /** The menu/close button stays visible so settings can always be reopened. */
  private applyVisibility(): void {
    const show = this.enabled && !this.panelOpen;
    for (const object of this.playObjects) {
      (object as unknown as { setVisible: (value: boolean) => void }).setVisible(show);
    }
    this.buildCancel.setVisible(show && this.buildMode);
  }

  setInteractLabel(label: string): void {
    this.interactText.setText(label.slice(0, 4));
  }
}
