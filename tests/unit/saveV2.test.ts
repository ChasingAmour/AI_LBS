import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { decodeExplored, encodeExplored } from '../../src/core/explored';
import { SAVE_VERSION, importSave, serializeSave, validateSave } from '../../src/systems/saveSystem';

describe('save v2', () => {
  it('creates version 2 with a seed and empty exploration', () => {
    const s = createNewGame(7);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.world.seed).toBe(7);
    expect(s.world.explored).toBe('');
    expect(s.world.discovered).toEqual([]);
  });

  it('round-trips explored chunks', () => {
    const chunks = ['0,0', '1,0', '12,7'];
    expect([...decodeExplored(encodeExplored(chunks))].sort()).toEqual(chunks.sort());
  });

  it('rejects corrupt exploration data', () => {
    expect(() => decodeExplored('not-base64!!')).toThrow();
  });

  it('rejects a v2 save with corrupt exploration data', () => {
    const s = createNewGame(3);
    s.world.explored = 'not-base64!!';
    expect(() => validateSave(JSON.parse(serializeSave(s)))).toThrow();
  });

  it('round-trips a v2 save', () => {
    const s = createNewGame(11);
    s.world.explored = encodeExplored(['0,0']);
    expect(validateSave(JSON.parse(serializeSave(s)))).toEqual(s);
  });

  it('migrates a v1 save', () => {
    const old = { ...createNewGame(5), version: 1 } as Record<string, unknown>;
    delete (old.world as Record<string, unknown>).seed;
    const migrated = importSave(JSON.stringify(old));
    expect(migrated.version).toBe(2);
    expect(migrated.world.seed).toBeTypeOf('number');
  });
});
