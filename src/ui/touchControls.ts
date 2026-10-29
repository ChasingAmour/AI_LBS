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
  private activePointer: number | null = null;
  private shown = true;

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

    const zone = scene.add
      .zone(TOUCH.joystick.x, TOUCH.joystick.y, TOUCH.joystick.drag * 2, TOUCH.joystick.drag * 2)
      .setInteractive();
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.activePointer = pointer.id;
      this.moveKnob(pointer);
    });
    this.root.add(zone);

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
    const interact = this.button(TOUCH.interact, () =>
      this.scene.game.events.emit('ui:touchInteract'),
    );
    this.interactText = makeText(scene, TOUCH.interact.x, TOUCH.interact.y + 23, '交互', {
      origin: [0.5, 0],
      color: COLORS.cream,
      shadow: true,
    });
    this.root.add(this.interactText);
    void interact;
    this.button(TOUCH.menu, () => this.scene.game.events.emit('ui:touchMenu'));
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
      .setInteractive({ useHandCursor: false });
    zone.on('pointerdown', () => {
      circle.setFillStyle(0x8a5a2b, 0.9);
      this.scene.time.delayedCall(90, () => circle.setFillStyle(0x1b120b, 0.7));
      onPress();
    });
    this.root.add([circle, label, zone]);
    return circle;
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

  setVisible(visible: boolean): void {
    if (visible === this.shown) return;
    this.shown = visible;
    this.root.setVisible(visible);
    if (!visible) {
      this.activePointer = null;
      this.knob.setPosition(TOUCH.joystick.x, TOUCH.joystick.y);
      this.scene.registry.set('touchMove', { x: 0, y: 0 });
      this.scene.registry.set('touchSprint', false);
    }
  }

  setInteractLabel(label: string): void {
    this.interactText.setText(label.slice(0, 4));
  }
}
