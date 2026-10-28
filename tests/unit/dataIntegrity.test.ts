import { describe, it, expect } from 'vitest';
import { validateGameData } from '../../src/systems/dataValidation';

describe('game data integrity', () => {
  it('all data references are valid', () => {
    expect(validateGameData()).toEqual([]);
  });
});
