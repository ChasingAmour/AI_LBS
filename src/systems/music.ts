import Phaser from 'phaser';
import type { GameState } from '../core/gameState';

export type MusicTrack = 'day' | 'night';

type LoopSound = Phaser.Sound.BaseSound & { setVolume(value: number): void };

const TRACK_KEYS: Record<MusicTrack, { key: string; file: string }> = {
  day: { key: 'music-day', file: 'assets/music/day.ogg' },
  night: { key: 'music-night', file: 'assets/music/night.mp3' },
};

export function loadMusic(scene: Phaser.Scene): void {
  scene.load.audio(TRACK_KEYS.day.key, TRACK_KEYS.day.file);
  scene.load.audio(TRACK_KEYS.night.key, TRACK_KEYS.night.file);
}

export function trackForPhase(phase: 'day' | 'night'): MusicTrack {
  return phase;
}

export function musicEnabled(state: GameState): boolean {
  return !state.settings.musicMuted && state.settings.musicVolume > 0;
}

export function musicGain(state: GameState): number {
  if (!musicEnabled(state)) return 0;
  return Math.max(0, Math.min(1, state.settings.musicVolume));
}

/**
 * Owns the two looping tracks and crossfades between them when day turns to
 * night. One instance per UIScene; the registry keeps it alive across restarts.
 */
export class MusicManager {
  private scene: Phaser.Scene;
  private day: LoopSound | null;
  private night: LoopSound | null;
  private current: MusicTrack | null = null;
  private paused = false;
  private ducked = false;
  private fade: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.day = scene.cache.audio.exists(TRACK_KEYS.day.key)
      ? (scene.sound.add(TRACK_KEYS.day.key, { loop: true, volume: 0 }) as LoopSound)
      : null;
    this.night = scene.cache.audio.exists(TRACK_KEYS.night.key)
      ? (scene.sound.add(TRACK_KEYS.night.key, { loop: true, volume: 0 }) as LoopSound)
      : null;
  }

  update(state: GameState): void {
    if (this.paused) return;
    const requested = trackForPhase(state.time.phase);
    const track = this.available(requested);
    if (!track) return;
    const target = this.targetGain(state);
    if (this.current !== track) this.crossfade(track, target);
    else if (!this.fade) this.sound(track)?.setVolume(target);
  }

  /** Applies mute/volume changes immediately (used by the pause menu). */
  apply(state: GameState): void {
    if (!this.current || this.fade) return;
    this.sound(this.current)?.setVolume(this.targetGain(state));
  }

  /** Lowers music under the pause menu instead of stopping it. */
  setDucked(ducked: boolean): void {
    this.ducked = ducked;
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      this.day?.pause();
      this.night?.pause();
    } else {
      this.day?.resume();
      this.night?.resume();
    }
  }

  destroy(): void {
    this.fade?.stop();
    this.fade = null;
    this.day?.destroy();
    this.night?.destroy();
    this.day = null;
    this.night = null;
  }

  private available(track: MusicTrack): MusicTrack | null {
    if (track === 'day') {
      if (this.day) return 'day';
      return this.night ? 'night' : null;
    }
    if (this.night) return 'night';
    return this.day ? 'day' : null;
  }

  private sound(track: MusicTrack): LoopSound | null {
    return track === 'day' ? this.day : this.night;
  }

  private targetGain(state: GameState): number {
    return musicGain(state) * (this.ducked ? 0.35 : 1);
  }

  private crossfade(track: MusicTrack, target: number): void {
    const next = this.sound(track);
    const previous = this.current ? this.sound(this.current) : null;
    if (!next) return;
    this.fade?.stop();
    next.stop();
    next.setVolume(0);
    next.play();
    this.fade = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1500,
      onUpdate: (tween) => {
        const value = tween.getValue() ?? 0;
        next.setVolume(target * value);
        previous?.setVolume(target * (1 - value));
      },
      onComplete: () => {
        previous?.stop();
        next.setVolume(target);
        this.fade = null;
      },
    });
    this.current = track;
  }
}
