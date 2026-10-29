import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { musicEnabled, musicGain, trackForPhase } from '../../src/systems/music';

describe('music settings', () => {
  it('plays by default at the saved volume', () => {
    const state = createNewGame(1);
    expect(musicEnabled(state)).toBe(true);
    expect(musicGain(state)).toBeCloseTo(0.45);
  });

  it('respects mute and zero volume', () => {
    const state = createNewGame(1);
    state.settings.musicMuted = true;
    expect(musicEnabled(state)).toBe(false);
    expect(musicGain(state)).toBe(0);
    state.settings.musicMuted = false;
    state.settings.musicVolume = 0;
    expect(musicGain(state)).toBe(0);
  });

  it('clamps the gain to 0..1', () => {
    const state = createNewGame(1);
    state.settings.musicVolume = 2;
    expect(musicGain(state)).toBe(1);
    state.settings.musicVolume = -1;
    expect(musicGain(state)).toBe(0);
  });

  it('maps the day/night phase to a track', () => {
    expect(trackForPhase('day')).toBe('day');
    expect(trackForPhase('night')).toBe('night');
  });
});
