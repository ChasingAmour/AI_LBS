import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { serializeSave, validateSave } from '../../src/systems/saveSystem';

describe('protagonist name', () => {
  it('starts unnamed for a fresh game', () => {
    const state = createNewGame(1);
    expect(state.player.name).toBe('鲁滨孙');
    expect(state.flags.named).toBe(false);
  });

  it('keeps a chosen name through save and load', () => {
    const state = createNewGame(1);
    state.player.name = '阿特拉斯';
    state.flags.named = true;
    const loaded = validateSave(JSON.parse(serializeSave(state)));
    expect(loaded.player.name).toBe('阿特拉斯');
    expect(loaded.flags.named).toBe(true);
  });

  it('asks old v5 saves for a name once', () => {
    const state = createNewGame(1);
    const raw = JSON.parse(serializeSave(state)) as {
      player: { name?: string };
      flags: { named?: boolean };
    };
    delete raw.player.name;
    delete raw.flags.named;
    const loaded = validateSave(raw);
    expect(loaded.player.name).toBe('鲁滨孙');
    expect(loaded.flags.named).toBe(false);
  });
});
