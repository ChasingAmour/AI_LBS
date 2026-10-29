import { describe, it, expect } from 'vitest';
import { canChop, chopToolFor } from '../../src/systems/toolCombat';

describe('tool combat', () => {
  it('maps trees to the stone axe', () => {
    expect(chopToolFor('tree')).toBe('stone_axe');
    expect(chopToolFor('rock')).toBeNull();
    expect(chopToolFor('clay')).toBeNull();
  });

  it('only lets an axe chop trees', () => {
    expect(canChop('stone_axe', 'tree')).toBe(true);
    expect(canChop('iron_axe', 'tree')).toBe(true);
    expect(canChop('stone_pick', 'tree')).toBe(false);
    expect(canChop(null, 'tree')).toBe(false);
    expect(canChop('stone_axe', 'rock')).toBe(false);
  });
});
