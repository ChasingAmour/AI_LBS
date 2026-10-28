import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { sfxEnabled } from '../../src/systems/audio';

describe('audio settings', () => {
  it('plays when unmuted with volume', () => {
    const state = createNewGame(1);
    expect(sfxEnabled(state)).toBe(true);
  });

  it('respects mute and zero volume', () => {
    const state = createNewGame(1);
    state.settings.muted = true;
    expect(sfxEnabled(state)).toBe(false);
    state.settings.muted = false;
    state.settings.sfxVolume = 0;
    expect(sfxEnabled(state)).toBe(false);
  });
});
