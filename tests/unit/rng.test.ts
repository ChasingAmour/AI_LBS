import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('seeded rng', () => {
  it('same seed reproduces the same sequence', () => {
    const a = createRng(42), b = createRng(42);
    expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
  });

  it('state can be saved and restored', () => {
    const a = createRng(7);
    a.next();
    const snapshot = a.state();
    const expected = a.next();
    a.restore(snapshot);
    expect(a.next()).toBe(expected);
  });

  it('int stays inside the inclusive range', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const v = rng.int(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});
