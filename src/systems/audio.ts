import Phaser from 'phaser';
import type { GameState } from '../core/gameState';

export type SfxKey =
  | 'click'
  | 'open'
  | 'close'
  | 'chop'
  | 'mine'
  | 'pickup'
  | 'craft'
  | 'hit'
  | 'hurt'
  | 'chest'
  | 'legendary'
  | 'warning'
  | 'enemy_die';

const FILES: Record<SfxKey, string> = {
  click: 'click.ogg',
  open: 'open.ogg',
  close: 'close.ogg',
  chop: 'chop.ogg',
  mine: 'mine.ogg',
  pickup: 'pickup.ogg',
  craft: 'craft.ogg',
  hit: 'hit.ogg',
  hurt: 'hurt.ogg',
  chest: 'chest.ogg',
  legendary: 'legendary.ogg',
  warning: 'warning.ogg',
  enemy_die: 'enemy_die.ogg',
};

export function loadAudio(scene: Phaser.Scene): void {
  for (const [key, file] of Object.entries(FILES)) {
    scene.load.audio(`sfx-${key}`, `assets/audio/${file}`);
  }
}

/** Pure gate used by tests: muted or zero volume means no sound. */
export function sfxEnabled(state: GameState): boolean {
  return !state.settings.muted && state.settings.sfxVolume > 0;
}

/**
 * Fire-and-forget sound effect. Each playback gets its own short-lived sound
 * object so overlapping effects do not cut each other off.
 */
export function playSfx(scene: Phaser.Scene, state: GameState | null, key: SfxKey): void {
  if (!state || !sfxEnabled(state)) return;
  const texture = `sfx-${key}`;
  if (!scene.cache.audio.exists(texture)) return;
  const sound = scene.sound.add(texture, { volume: Math.min(1, state.settings.sfxVolume) });
  sound.once('complete', () => sound.destroy());
  sound.play();
}
